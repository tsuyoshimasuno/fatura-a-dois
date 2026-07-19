'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cartao, lancamento } from '@/db/schema';
import { NOME_MES } from '@/lib/competencia';
import { createAdminClient } from '@/lib/supabase/admin';

// Limite de competências detalhadas na mensagem -- um cartão com muitos
// meses de histórico não deveria virar uma linha gigante de texto no card
// (defesa em profundidade; nenhum cartão real observado até hoje chega perto
// disso, mas nada garante que um cartão antigo remapeado não tenha).
const MAX_COMPETENCIAS_DETALHADAS = 5;

// Monta o resumo de impacto exibido após um mapeamento bem-sucedido -- existe
// para responder diretamente ao sintoma reportado ("mapeei e os totais não
// mudaram"): a causa real mais provável é o lançamento existir numa
// competência diferente da que está sendo olhada em /gastos ou /parcelas, e
// esta mensagem torna isso visível sem o usuário precisar adivinhar o mês.
// Nunca lança -- uma falha aqui não pode fazer um mapeamento já persistido
// parecer uma falha para quem clicou (ver `mapearCartao`, que já fez o
// UPDATE antes de chamar esta função).
async function resumirImpacto(cartaoId: number): Promise<string> {
  try {
    const porCompetencia = await db
      .select({
        ano: lancamento.competenciaAno,
        mes: lancamento.competenciaMes,
        quantidade: sql<number>`count(*)::int`,
      })
      .from(lancamento)
      .where(eq(lancamento.cartaoId, cartaoId))
      .groupBy(lancamento.competenciaAno, lancamento.competenciaMes)
      .orderBy(lancamento.competenciaAno, lancamento.competenciaMes);

    if (porCompetencia.length === 0) {
      return 'Cartão atribuído. Nenhum lançamento existente neste cartão ainda.';
    }

    const total = porCompetencia.reduce((soma, item) => soma + item.quantidade, 0);
    const restantes = porCompetencia.length - MAX_COMPETENCIAS_DETALHADAS;
    const detalhe = porCompetencia
      .slice(0, MAX_COMPETENCIAS_DETALHADAS)
      .map((item) => `${NOME_MES[item.mes] ?? `mês ${item.mes}`}/${item.ano}: ${item.quantidade}`)
      .join(', ');
    const sufixo = restantes > 0 ? ` e mais ${restantes} competência(s)` : '';

    return `Cartão atribuído. ${total} lançamento(s) existente(s) agora conta(m) para essa pessoa (${detalhe}${sufixo}).`;
  } catch (error) {
    console.error('Falha ao resumir impacto do mapeamento de cartão:', error);
    return 'Cartão atribuído.';
  }
}

export async function listarContasCasal(): Promise<{ id: string; email: string }[]> {
  try {
    const { data } = await createAdminClient().auth.admin.listUsers();
    return data.users.map((user) => ({ id: user.id, email: user.email ?? '(sem e-mail)' }));
  } catch (error) {
    console.error('Falha ao listar contas do casal:', error);
    return [];
  }
}

export async function listarCartoesPendentes() {
  return db
    .select()
    .from(cartao)
    .where(and(isNull(cartao.usuarioId), eq(cartao.terceiro, false)))
    .orderBy(cartao.createdAt);
}

// Cartões marcados "Não é do casal" (Story 2.3) -- exibidos numa seção
// separada em /cartoes para permitir desfazer, já que antes disso não havia
// nenhuma tela que os mostrasse (achado 2 desta auditoria, deferred-work.md
// spec-2-3). Filtro idêntico ao guard `REJEITADO` de `desfazerRejeicaoCartao`
// (defesa em profundidade: um cartão listado aqui sempre pode de fato ser
// desfeito, nunca aparece com "Desfazer rejeição" retornando falha).
export async function listarCartoesRejeitados() {
  return db
    .select()
    .from(cartao)
    .where(and(eq(cartao.terceiro, true), isNull(cartao.usuarioId)))
    .orderBy(cartao.createdAt);
}

// Cartão só pode ser resolvido (mapeado ou rejeitado) enquanto ainda está
// pendente -- essa condição vai no WHERE das duas funções abaixo, não só na
// consulta da lista, para não sobrescrever silenciosamente um cartão já
// resolvido por uma chamada concorrente ou repetida.
const PENDENTE = and(isNull(cartao.usuarioId), eq(cartao.terceiro, false));

export async function mapearCartao(
  cartaoId: number,
  usuarioId: string
): Promise<{ ok: boolean; message?: string }> {
  const contas = await listarContasCasal();

  // Nunca confiar num usuarioId vindo do formulário sem checar contra as
  // contas reais do casal -- é a única fronteira de validação deste fluxo.
  if (!contas.some((conta) => conta.id === usuarioId)) {
    return { ok: false, message: 'Conta inválida.' };
  }

  const atualizados = await db
    .update(cartao)
    .set({ usuarioId, terceiro: false })
    .where(and(eq(cartao.id, cartaoId), PENDENTE))
    .returning();

  if (atualizados.length === 0) {
    return { ok: false, message: 'Cartão já foi resolvido ou não existe.' };
  }

  revalidatePath('/cartoes');

  const message = await resumirImpacto(cartaoId);

  return { ok: true, message };
}

export async function rejeitarCartaoTerceiro(
  cartaoId: number
): Promise<{ ok: boolean; message?: string }> {
  const atualizados = await db
    .update(cartao)
    .set({ terceiro: true })
    .where(and(eq(cartao.id, cartaoId), PENDENTE))
    .returning();

  if (atualizados.length === 0) {
    return { ok: false, message: 'Cartão já foi resolvido ou não existe.' };
  }

  revalidatePath('/cartoes');

  return { ok: true };
}

// Reverte `rejeitarCartaoTerceiro` -- guard simétrico ao de `PENDENTE`: só
// atua sobre o estado exato que a rejeição produz (`terceiro = true`,
// `usuarioId` ainda nulo), nunca sobre um cartão em qualquer outro estado.
// Não escreve em `lancamento`: a agregação já é um join ao vivo via
// `cartao.usuarioId`/`cartao.terceiro` (achado 2 desta auditoria), então os
// lançamentos existentes desse cartão voltam a aparecer como "pendente de
// titular" na próxima leitura sem nenhuma escrita adicional aqui.
const REJEITADO = and(eq(cartao.terceiro, true), isNull(cartao.usuarioId));

export async function desfazerRejeicaoCartao(cartaoId: number): Promise<{ ok: boolean; message?: string }> {
  const atualizados = await db
    .update(cartao)
    .set({ terceiro: false })
    .where(and(eq(cartao.id, cartaoId), REJEITADO))
    .returning();

  if (atualizados.length === 0) {
    return { ok: false, message: 'Cartão não está rejeitado.' };
  }

  revalidatePath('/cartoes');

  return { ok: true };
}
