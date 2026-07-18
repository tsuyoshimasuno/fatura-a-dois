import { and, eq, inArray, notExists } from 'drizzle-orm';
import { db } from '@/db';
import { compraParcelada, lancamento } from '@/db/schema';

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- este tipo
// estrutural permite chamar esta função dentro da mesma transação já aberta
// pelo upload/merge (`server/ingestao/upload.ts`), mesmo padrão de
// `identificar-compra-parcelada.ts`.
type Executor = Pick<typeof db, 'select' | 'delete'>;

// Fecha o gap deixado pela Story 2.4 (AD-7): depois que o merge por delta
// remove lançamentos, uma `compra_parcelada` pode ficar órfã (nenhum
// lançamento real vinculado). Único ponto de exclusão em `compra_parcelada`
// para este fluxo -- `server/ingestao` nunca apaga/manipula essa tabela
// diretamente, sempre chama esta função de serviço.
//
// Se ainda restar pelo menos um lançamento real vinculado a uma compra,
// nada é feito: a projeção (`projetar-parcelas-futuras.ts`) recalcula
// sozinha a partir do que restou, sem precisar de nenhuma lógica adicional
// de reconciliação.
//
// Um único `DELETE ... WHERE id IN (...) AND NOT EXISTS (...)` em vez de um
// `SELECT` de checagem seguido de `DELETE` por id: elimina tanto a corrida
// (outra transação inserindo um lançamento para a mesma compra entre a
// checagem e a exclusão) quanto o round-trip extra por id -- a condição de
// órfã é avaliada atomicamente pelo próprio Postgres na mesma instrução.
export async function retrairComprasSemLancamentos(
  executor: Executor,
  compraParceladaIds: number[]
): Promise<void> {
  const idsUnicos = [...new Set(compraParceladaIds)];
  if (idsUnicos.length === 0) return;

  await executor
    .delete(compraParcelada)
    .where(
      and(
        inArray(compraParcelada.id, idsUnicos),
        notExists(
          executor
            .select({ id: lancamento.id })
            .from(lancamento)
            .where(eq(lancamento.compraParceladaId, compraParcelada.id))
        )
      )
    );
}
