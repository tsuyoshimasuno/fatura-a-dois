import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { compraParcelada } from '@/db/schema';
import { normalizarEstabelecimento } from '@/server/shared/normalizar-estabelecimento';

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- este tipo
// estrutural permite chamar esta função dentro da mesma transação já aberta
// pelo upload/merge (`server/ingestao/upload.ts`), mesmo padrão de
// `resolver-categoria-sugerida.ts`.
type Executor = Pick<typeof db, 'select' | 'insert'>;

export type IdentificarCompraParceladaInput = {
  cartaoId: number;
  estabelecimento: string;
  valorParcelaCentavos: number;
  totalParcelas: number;
  competenciaAno: number;
  competenciaMes: number;
};

// Único ponto de escrita em `compra_parcelada` (AD-7) -- `server/ingestao`
// nunca insere/seleciona nesta tabela diretamente, sempre chama esta função.
//
// Chave de identidade da compra (AD-4): cartão + estabelecimento normalizado
// (AD-9, via `normalizarEstabelecimento`) + valor de cada parcela + total de
// parcelas -- nunca `data` nem `parcelaNumero`, que variam entre parcelas da
// mesma compra.
//
// `insert ... onConflictDoNothing` na chave única, com `select` de fallback
// se nenhuma linha for retornada (já existia uma compra com essa chave):
// resolve a corrida entre duas linhas da mesma compra no mesmo upload (ou
// uploads concorrentes) tentando criar a mesma `compra_parcelada` ao mesmo
// tempo, sem deixar a constraint de unicidade estourar como erro 500 do
// upload (Design Notes).
export async function identificarOuCriarCompraParcelada(
  executor: Executor,
  input: IdentificarCompraParceladaInput
): Promise<number> {
  const estabelecimentoNormalizado = normalizarEstabelecimento(input.estabelecimento);

  const [inserida] = await executor
    .insert(compraParcelada)
    .values({
      cartaoId: input.cartaoId,
      estabelecimentoNormalizado,
      valorParcelaCentavos: input.valorParcelaCentavos,
      totalParcelas: input.totalParcelas,
      competenciaInicialAno: input.competenciaAno,
      competenciaInicialMes: input.competenciaMes,
    })
    .onConflictDoNothing({
      target: [
        compraParcelada.cartaoId,
        compraParcelada.estabelecimentoNormalizado,
        compraParcelada.valorParcelaCentavos,
        compraParcelada.totalParcelas,
      ],
    })
    .returning({ id: compraParcelada.id });

  if (inserida) {
    return inserida.id;
  }

  const [existente] = await executor
    .select({ id: compraParcelada.id })
    .from(compraParcelada)
    .where(
      and(
        eq(compraParcelada.cartaoId, input.cartaoId),
        eq(compraParcelada.estabelecimentoNormalizado, estabelecimentoNormalizado),
        eq(compraParcelada.valorParcelaCentavos, input.valorParcelaCentavos),
        eq(compraParcelada.totalParcelas, input.totalParcelas)
      )
    );

  // Sob operação normal isso sempre acha uma linha: `onConflictDoNothing` só
  // não retorna quando a constraint única já tinha essa chave. Guard
  // explícito em vez de deixar `existente.id` estourar um TypeError cru caso
  // essa garantia seja violada por algum caminho futuro não previsto.
  if (!existente) {
    throw new Error('Falha ao identificar compra parcelada: conflito sem linha correspondente.');
  }

  return existente.id;
}
