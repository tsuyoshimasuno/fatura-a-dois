'use server';

import { and, eq, gte, isNotNull, isNull, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cartao, lancamento } from '@/db/schema';
import { listarContasCasal } from '@/server/ingestao/mapear-cartao';
import { createClient } from '@/lib/supabase/server';

type ResultadoOperacao = { ok: boolean; message?: string };

// Invalidação de cache é uma preocupação à parte da escrita em si -- uma
// falha aqui nunca deve ser reportada como falha da mutação que já foi
// persistida, mesmo padrão de `corrigir-categoria.ts`/`gerenciar-categorias.ts`.
function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`Falha ao revalidar ${path}:`, error);
  }
}

type ContextoLancamento = {
  cartaoUsuarioId: string | null;
  compraParceladaId: number | null;
  parcelaNumero: number | null;
};

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- mesmo padrão
// estrutural já usado em `identificar-compra-parcelada.ts`.
type Executor = Pick<typeof db, 'update'>;

// Repasse (Epic 6, Story 6.1) só faz sentido sobre um lançamento com titular
// já mapeado (Story 2.3) -- checado no WHERE, não só na UI, mesmo espírito
// dos guards já usados em `mapear-cartao.ts`. Também traz `compraParceladaId`/
// `parcelaNumero` para a propagação a parcelas irmãs (ver Spec Change Log,
// review pass 1). Lida fora da transação de escrita com segurança: nenhum
// módulo do app faz UPDATE em `compraParceladaId`/`parcelaNumero` de um
// `lancamento` existente (só INSERT em `server/ingestao/upload.ts` e DELETE
// em `server/parcelas/retrair-compra-parcelada.ts`) -- sem corrida possível
// entre esta leitura e a escrita abaixo (achado do review pass 2).
async function obterContextoLancamento(lancamentoId: number): Promise<ContextoLancamento | null> {
  const [linha] = await db
    .select({
      cartaoUsuarioId: cartao.usuarioId,
      compraParceladaId: lancamento.compraParceladaId,
      parcelaNumero: lancamento.parcelaNumero,
    })
    .from(lancamento)
    .innerJoin(cartao, eq(lancamento.cartaoId, cartao.id))
    .where(eq(lancamento.id, lancamentoId));

  return linha ?? null;
}

// `repassadoPor`/`repassadoEm` registram só a última ação (repassar ou
// desfazer), não um histórico completo -- suficiente para investigar uma
// divergência encontrada meses depois, sem precisar de uma tabela dedicada.
// É só o rastro auxiliar, nunca o dado que a mutação em si depende -- uma
// falha em resolver "quem" (sessão indisponível, erro transitório do
// Supabase) degrada para `null` em vez de derrubar o repasse inteiro, mesmo
// princípio de degradação graciosa já usado em `listarContasCasal()`.
async function obterQuemFezAAcao(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (error) {
    console.error('Falha ao resolver quem fez a ação de repasse:', error);
    return null;
  }
}

// Só atua sobre lançamento ainda não repassado -- não sobrescreve
// silenciosamente um repasse concorrente já aplicado por outra aba/pessoa.
const NAO_REPASSADO = isNull(lancamento.responsavelId);
const REPASSADO = isNotNull(lancamento.responsavelId);

// Propaga o repasse (ou o desfazer) para parcelas reais IRMÃS já existentes
// da mesma compra -- achado real do review pass 1: sem isso, repassar uma
// parcela que não é a de maior `parcelaNumero` conhecida (ex.: parcelas
// seguintes já importadas de uploads anteriores a este repasse) deixava a
// parcela real mais recente com o valor antigo, e tanto a projeção de
// parcelas futuras quanto a herança no próximo upload (que sempre partem da
// parcela de maior número conhecida) ficavam cegas ao repasse. Nunca
// retroage a parcelas anteriores (`parcelaNumero` menor) -- competências já
// fechadas permanecem como estavam.
async function propagarParaParcelasIrmas(
  tx: Executor,
  lancamentoId: number,
  contexto: ContextoLancamento,
  novoResponsavelId: string | null,
  repassadoPor: string | null,
  agora: Date
): Promise<void> {
  if (contexto.compraParceladaId === null || contexto.parcelaNumero === null) return;

  await tx
    .update(lancamento)
    .set({ responsavelId: novoResponsavelId, repassadoPor, repassadoEm: agora })
    .where(
      and(
        eq(lancamento.compraParceladaId, contexto.compraParceladaId),
        gte(lancamento.parcelaNumero, contexto.parcelaNumero),
        ne(lancamento.id, lancamentoId)
      )
    );
}

export async function repassarLancamento(
  lancamentoId: number,
  novoResponsavelId: string
): Promise<ResultadoOperacao> {
  const contas = await listarContasCasal();

  // Nunca confiar num id vindo do formulário sem checar contra as contas
  // reais do casal -- única fronteira de validação deste fluxo (mesmo
  // princípio de `mapearCartao`).
  if (!contas.some((conta) => conta.id === novoResponsavelId)) {
    return { ok: false, message: 'Conta inválida.' };
  }

  const contexto = await obterContextoLancamento(lancamentoId);

  if (contexto === null || contexto.cartaoUsuarioId === null) {
    return { ok: false, message: 'Titular ainda não identificado -- mapeie o cartão antes de repassar.' };
  }

  // Repassar para o próprio titular do cartão não é uma operação real --
  // o casal é sempre exatamente duas contas, então isso só pode significar
  // um clique redundante ou um id incorreto.
  if (novoResponsavelId === contexto.cartaoUsuarioId) {
    return { ok: false, message: 'Esse lançamento já é do titular do cartão.' };
  }

  const repassadoPor = await obterQuemFezAAcao();
  const agora = new Date();

  const atualizados = await db.transaction(async (tx) => {
    const linhas = await tx
      .update(lancamento)
      .set({ responsavelId: novoResponsavelId, repassadoPor, repassadoEm: agora })
      .where(and(eq(lancamento.id, lancamentoId), NAO_REPASSADO))
      .returning();

    if (linhas.length > 0) {
      await propagarParaParcelasIrmas(tx, lancamentoId, contexto, novoResponsavelId, repassadoPor, agora);
    }

    return linhas;
  });

  if (atualizados.length === 0) {
    return { ok: false, message: 'Lançamento já foi repassado ou não existe.' };
  }

  safeRevalidate('/lancamentos');

  return { ok: true };
}

export async function desfazerRepasse(lancamentoId: number): Promise<ResultadoOperacao> {
  const contexto = await obterContextoLancamento(lancamentoId);
  const repassadoPor = await obterQuemFezAAcao();
  const agora = new Date();

  const atualizados = await db.transaction(async (tx) => {
    const linhas = await tx
      .update(lancamento)
      .set({ responsavelId: null, repassadoPor, repassadoEm: agora })
      .where(and(eq(lancamento.id, lancamentoId), REPASSADO))
      .returning();

    if (linhas.length > 0 && contexto !== null) {
      await propagarParaParcelasIrmas(tx, lancamentoId, contexto, null, repassadoPor, agora);
    }

    return linhas;
  });

  if (atualizados.length === 0) {
    return { ok: false, message: 'Lançamento não está repassado.' };
  }

  safeRevalidate('/lancamentos');

  return { ok: true };
}
