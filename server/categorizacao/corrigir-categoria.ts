'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cartao, categoria, lancamento, regraCategorizacao } from '@/db/schema';
import { normalizarEstabelecimento } from '@/server/shared/normalizar-estabelecimento';

type ResultadoOperacao = { ok: boolean; message?: string };

// Erro esperado (validação de negócio) lançado dentro da transação para
// forçar rollback e ainda assim devolver uma mensagem amigável ao chamador --
// mesmo padrão de `gerenciar-categorias.ts`.
class CorrecaoValidationError extends Error {}

// Invalidação de cache é uma preocupação à parte da escrita em si -- uma
// falha aqui nunca deve ser reportada como falha da mutação que já foi
// persistida (mesmo padrão de `gerenciar-categorias.ts`).
function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`Falha ao revalidar ${path}:`, error);
  }
}

export type LancamentoParaCorrecao = {
  id: number;
  data: string;
  estabelecimento: string;
  valorCentavos: number;
  categoriaId: number | null;
  categoriaNome: string | null;
  categoriaRemovida: boolean;
  parcelaNumero: number | null;
  parcelaTotal: number | null;
  titularUsuarioId: string | null;
  // Repasse (Epic 6, Story 6.1) -- destinatário efetivo do gasto, ou `null`
  // se nunca repassado (nesse caso o efetivo é o próprio titular).
  responsavelId: string | null;
};

// Lista os lançamentos de uma competência com a categoria atual (se houver)
// para a tela de correção manual (`/lancamentos`). `LEFT JOIN` porque um
// lançamento pode não ter categoria (`categoriaId` null) ou apontar para uma
// categoria já removida (soft-delete, AD-8) -- os dois casos são
// distinguidos na UI ("Sem categoria" vs. "Categoria removida"). `LEFT JOIN`
// com `cartao` (mesmo padrão de `resumo-gastos.ts`) alimenta o badge de
// titular -- também pode ser nulo quando o cartão ainda não foi mapeado.
export async function listarLancamentosParaCorrecao(
  ano: number,
  mes: number
): Promise<LancamentoParaCorrecao[]> {
  const linhas = await db
    .select({
      id: lancamento.id,
      data: lancamento.data,
      estabelecimento: lancamento.estabelecimento,
      valorCentavos: lancamento.valorCentavos,
      categoriaId: lancamento.categoriaId,
      categoriaNome: categoria.nome,
      categoriaRemovidoEm: categoria.removidoEm,
      parcelaNumero: lancamento.parcelaNumero,
      parcelaTotal: lancamento.parcelaTotal,
      cartaoUsuarioId: cartao.usuarioId,
      responsavelId: lancamento.responsavelId,
    })
    .from(lancamento)
    .leftJoin(categoria, eq(lancamento.categoriaId, categoria.id))
    .leftJoin(cartao, eq(lancamento.cartaoId, cartao.id))
    .where(and(eq(lancamento.competenciaAno, ano), eq(lancamento.competenciaMes, mes)))
    .orderBy(lancamento.data);

  return linhas.map((linha) => ({
    id: linha.id,
    data: linha.data,
    estabelecimento: linha.estabelecimento,
    valorCentavos: linha.valorCentavos,
    categoriaId: linha.categoriaId,
    categoriaNome: linha.categoriaNome,
    categoriaRemovida: linha.categoriaNome !== null && linha.categoriaRemovidoEm !== null,
    parcelaNumero: linha.parcelaNumero,
    parcelaTotal: linha.parcelaTotal,
    titularUsuarioId: linha.cartaoUsuarioId,
    responsavelId: linha.responsavelId,
  }));
}

// Corrige a categoria de um lançamento e memoriza a regra por padrão de
// estabelecimento normalizado (AD-9), numa única transação: se a atualização
// do lançamento ou o upsert da regra falhar, nada é commitado.
export async function corrigirCategoriaLancamento(
  lancamentoId: number,
  categoriaId: number
): Promise<ResultadoOperacao> {
  try {
    await db.transaction(async (tx) => {
      const [categoriaAtiva] = await tx
        .select()
        .from(categoria)
        .where(and(eq(categoria.id, categoriaId), isNull(categoria.removidoEm)));

      if (!categoriaAtiva) {
        throw new CorrecaoValidationError('Categoria não existe ou foi removida.');
      }

      const [lancamentoAtual] = await tx
        .select()
        .from(lancamento)
        .where(eq(lancamento.id, lancamentoId));

      if (!lancamentoAtual) {
        throw new CorrecaoValidationError('Lançamento não existe.');
      }

      await tx.update(lancamento).set({ categoriaId }).where(eq(lancamento.id, lancamentoId));

      const padraoEstabelecimento = normalizarEstabelecimento(lancamentoAtual.estabelecimento);

      await tx
        .insert(regraCategorizacao)
        .values({ padraoEstabelecimento, categoriaId, atualizadoEm: new Date() })
        .onConflictDoUpdate({
          target: regraCategorizacao.padraoEstabelecimento,
          set: { categoriaId, atualizadoEm: new Date() },
        });
    });
  } catch (error) {
    if (error instanceof CorrecaoValidationError) {
      return { ok: false, message: error.message };
    }

    console.error('Falha ao corrigir categoria do lançamento:', error);

    return { ok: false, message: 'Falha ao corrigir categoria do lançamento.' };
  }

  // Fora do try/catch da escrita -- mesma razão de `gerenciar-categorias.ts`.
  safeRevalidate('/lancamentos');

  return { ok: true };
}
