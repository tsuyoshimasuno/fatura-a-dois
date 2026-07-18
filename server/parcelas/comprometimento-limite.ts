import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { cartao } from '@/db/schema';
import { listarContasCasal } from '@/server/ingestao/mapear-cartao';
import type { CompetenciaProjetada } from '@/server/parcelas/projetar-parcelas-futuras';

export type PessoaComprometimento = {
  usuarioId: string;
  email: string;
  totalCentavos: number;
};

export type ComprometimentoCompetencia = {
  competenciaAno: number;
  competenciaMes: number;
  pendenteCentavos: number;
  pessoas: PessoaComprometimento[];
};

// Atribui cada parcela projetada (Story 5.2) a uma pessoa via
// `cartao.usuarioId`, mesmo princípio de `server/visualizacao/resumo-gastos.ts`
// (Story 4.1): parcela cujo cartão ainda não tem titular mapeado nunca é
// somada a uma pessoa específica, mas sempre entra no total do casal daquele
// mês -- cai à parte no total "pendente" (o total do casal em si já vem de
// `competencia.totalCentavos`, calculado por `projetarParcelasFuturas`; não
// duplicado aqui). As duas contas do casal (`listarContasCasal()`) aparecem
// sempre em cada mês, mesmo com total zerado. Se `listarContasCasal()`
// falhar (degradação graciosa já tratada lá, retornando `[]`), nenhum
// titular pode ser confirmado: `pessoas` fica vazio e todo comprometimento
// do mês cai no total "pendente".
//
// Recebe `competencias` já calculado (uma única chamada a
// `projetarParcelasFuturas()` no chamador, `app/(app)/parcelas/page.tsx`) em
// vez de buscar de novo aqui -- evita duas leituras independentes do mesmo
// estado que poderiam divergir entre si (ex.: uma escrita concorrente entre
// as duas consultas) e o round-trip duplicado.
export async function obterComprometimentoLimiteMensal(
  competencias: CompetenciaProjetada[]
): Promise<ComprometimentoCompetencia[]> {
  const contas = await listarContasCasal();

  const cartaoIds = Array.from(
    new Set(competencias.flatMap((competencia) => competencia.itens.map((item) => item.cartaoId)))
  );

  const cartoes =
    cartaoIds.length === 0
      ? []
      : await db
          .select({ id: cartao.id, usuarioId: cartao.usuarioId })
          .from(cartao)
          .where(inArray(cartao.id, cartaoIds));

  const usuarioIdPorCartao = new Map(cartoes.map((c) => [c.id, c.usuarioId]));
  const contaPorId = new Map(contas.map((conta) => [conta.id, conta]));

  return competencias.map((competencia) => {
    const totalPorPessoa = new Map<string, number>();
    for (const conta of contas) {
      totalPorPessoa.set(conta.id, 0);
    }

    let pendenteCentavos = 0;

    for (const item of competencia.itens) {
      const usuarioId = usuarioIdPorCartao.get(item.cartaoId) ?? null;
      const titularConfirmado = usuarioId !== null && contaPorId.has(usuarioId);

      if (!titularConfirmado) {
        pendenteCentavos += item.valorCentavos;
        continue;
      }

      const idPessoa = usuarioId as string;
      totalPorPessoa.set(idPessoa, (totalPorPessoa.get(idPessoa) ?? 0) + item.valorCentavos);
    }

    const pessoas: PessoaComprometimento[] = contas.map((conta) => ({
      usuarioId: conta.id,
      email: conta.email,
      totalCentavos: totalPorPessoa.get(conta.id) ?? 0,
    }));

    return {
      competenciaAno: competencia.competenciaAno,
      competenciaMes: competencia.competenciaMes,
      pendenteCentavos,
      pessoas,
    };
  });
}
