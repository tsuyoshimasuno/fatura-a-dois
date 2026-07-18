'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cartao } from '@/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';

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

  return { ok: true };
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
