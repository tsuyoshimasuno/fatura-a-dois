import { config } from 'dotenv';
config({ path: '.env.local' });

import { and, asc, eq, isNotNull, isNull, gt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { lancamento } from '../db/schema/index.ts';
import { identificarOuCriarCompraParcelada } from '../server/parcelas/identificar-compra-parcelada.ts';

// Backfill único (Story 5.1): lançamentos de parcela processados antes desta
// story existirem nunca tiveram `compraParceladaId` preenchido -- não havia
// `compra_parcelada` nem `identificarOuCriarCompraParcelada` ainda. Idempotente
// (filtra por `compraParceladaId IS NULL`): seguro reexecutar, vira no-op
// depois da primeira aplicação bem-sucedida. Ordenado por competência+id para
// que a âncora `competenciaInicial` de cada compra reflita a parcela real
// mais antiga conhecida, não a ordem arbitrária de leitura do banco.
async function main() {
  const pendentes = await db
    .select()
    .from(lancamento)
    .where(
      and(isNotNull(lancamento.parcelaNumero), gt(lancamento.parcelaTotal, 1), isNull(lancamento.compraParceladaId))
    )
    .orderBy(asc(lancamento.competenciaAno), asc(lancamento.competenciaMes), asc(lancamento.id));

  console.log(`${pendentes.length} lançamentos de parcela pendentes de backfill.`);

  let atualizados = 0;

  await db.transaction(async (tx) => {
    for (const item of pendentes) {
      const compraParceladaId = await identificarOuCriarCompraParcelada(tx, {
        cartaoId: item.cartaoId,
        estabelecimento: item.estabelecimento,
        valorParcelaCentavos: item.valorCentavos,
        totalParcelas: item.parcelaTotal!,
        competenciaAno: item.competenciaAno,
        competenciaMes: item.competenciaMes,
      });

      await tx.update(lancamento).set({ compraParceladaId }).where(eq(lancamento.id, item.id));
      atualizados++;
      console.log(
        `[ok] lancamento ${item.id} (${item.estabelecimento}, ${item.parcelaNumero}/${item.parcelaTotal}) -> compra_parcelada ${compraParceladaId}`
      );
    }
  });

  console.log(`Backfill concluído: ${atualizados} lançamentos atualizados.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Falha no backfill:', err);
    process.exit(1);
  });
