import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { cartao, compraParcelada, lancamento } from '@/db/schema';

export type ItemParcelaProjetada = {
  compraParceladaId: number;
  cartaoId: number;
  estabelecimento: string;
  parcelaNumero: number;
  totalParcelas: number;
  valorCentavos: number;
  competenciaAno: number;
  competenciaMes: number;
  // Repasse (Epic 6, Story 6.1) herdado da parcela real mais recente
  // conhecida da compra, junto com os demais campos abaixo -- propaga
  // automaticamente sem exigir repasse mês a mês.
  responsavelId: string | null;
};

export type CompetenciaProjetada = {
  competenciaAno: number;
  competenciaMes: number;
  totalCentavos: number;
  itens: ItemParcelaProjetada[];
};

// Soma `n` meses a partir de `(ano, mes)` com virada de ano (`mes`
// 1-indexado) -- Design Notes da spec.
function avancarCompetencia(ano: number, mes: number, n: number): { ano: number; mes: number } {
  return {
    ano: ano + Math.floor((mes - 1 + n) / 12),
    mes: ((mes - 1 + n) % 12) + 1,
  };
}

type UltimaParcelaReal = {
  compraParceladaId: number;
  cartaoId: number;
  parcelaNumero: number;
  estabelecimento: string;
  competenciaAno: number;
  competenciaMes: number;
  totalParcelas: number;
  valorParcelaCentavos: number;
  responsavelId: string | null;
};

// Projeta em leitura, nunca em `lancamento` nem em tabela cacheada (AD-7): a
// parcela real mais recente conhecida de cada compra é sempre o `MAX(
// parcelaNumero)` entre os `lancamento` vinculados -- nunca a data de hoje,
// nunca `compraParcelada.competenciaInicial*` (só âncora/exibição, Story
// 5.1). Como a projeção é sempre recalculada do zero a partir do estado real
// mais atual, "reconciliação" (parcela real casando com uma projeção,
// realinhamento quando um mês é pulado sem envio de fatura) não precisa de
// nenhuma lógica dedicada -- a próxima parcela real processada
// automaticamente vira o novo "mais recente conhecido" (Design Notes).
export async function projetarParcelasFuturas(): Promise<CompetenciaProjetada[]> {
  const linhas = await db
    .select({
      compraParceladaId: lancamento.compraParceladaId,
      cartaoId: lancamento.cartaoId,
      parcelaNumero: lancamento.parcelaNumero,
      estabelecimento: lancamento.estabelecimento,
      competenciaAno: lancamento.competenciaAno,
      competenciaMes: lancamento.competenciaMes,
      totalParcelas: compraParcelada.totalParcelas,
      valorParcelaCentavos: compraParcelada.valorParcelaCentavos,
      cartaoTerceiro: cartao.terceiro,
      responsavelId: lancamento.responsavelId,
    })
    .from(lancamento)
    .innerJoin(compraParcelada, eq(lancamento.compraParceladaId, compraParcelada.id))
    .innerJoin(cartao, eq(lancamento.cartaoId, cartao.id))
    // Ordem estável e reprodutível -- se duas linhas empatarem no maior
    // `parcelaNumero` da mesma compra (dado duplicado/corrida), o `id` mais
    // alto (processado por último) desempata de forma determinística, nunca
    // a ordem arbitrária que o Postgres devolveria sem `ORDER BY` (mesmo
    // raciocínio do `ORDER BY` obrigatório em `server/ingestao/upload.ts`).
    .orderBy(lancamento.id);

  // Agrega em memória por `compraParceladaId` achando o de maior
  // `parcelaNumero` (dataset pequeno, mesmo padrão de
  // `server/visualizacao/resumo-gastos.ts`, Story 4.1).
  const ultimaPorCompra = new Map<number, UltimaParcelaReal>();

  for (const linha of linhas) {
    if (linha.compraParceladaId === null || linha.parcelaNumero === null) continue;

    // Cartão já resolvido como "não é do casal" (Story 2.3) -- lançamentos
    // inseridos antes dessa rejeição podem continuar na tabela
    // (`rejeitarCartaoTerceiro` só bloqueia uploads futuros); excluídos aqui
    // pelo mesmo motivo de `server/visualizacao/resumo-gastos.ts` (Story
    // 4.1): esse dinheiro não é do casal, não deveria contar em nenhuma
    // projeção nem no comprometimento de limite.
    if (linha.cartaoTerceiro) continue;

    const atual = ultimaPorCompra.get(linha.compraParceladaId);
    if (!atual || linha.parcelaNumero >= atual.parcelaNumero) {
      ultimaPorCompra.set(linha.compraParceladaId, {
        compraParceladaId: linha.compraParceladaId,
        cartaoId: linha.cartaoId,
        parcelaNumero: linha.parcelaNumero,
        estabelecimento: linha.estabelecimento,
        competenciaAno: linha.competenciaAno,
        competenciaMes: linha.competenciaMes,
        totalParcelas: linha.totalParcelas,
        valorParcelaCentavos: linha.valorParcelaCentavos,
        responsavelId: linha.responsavelId,
      });
    }
  }

  const grupos = new Map<string, CompetenciaProjetada>();

  for (const ultima of ultimaPorCompra.values()) {
    // `parcelaNumero` já igual (ou além de) `totalParcelas` -- compra
    // quitada, nenhuma parcela futura a projetar.
    for (let n = 1; ultima.parcelaNumero + n <= ultima.totalParcelas; n++) {
      const competencia = avancarCompetencia(ultima.competenciaAno, ultima.competenciaMes, n);
      const chave = `${competencia.ano}-${competencia.mes}`;

      let grupo = grupos.get(chave);
      if (!grupo) {
        grupo = {
          competenciaAno: competencia.ano,
          competenciaMes: competencia.mes,
          totalCentavos: 0,
          itens: [],
        };
        grupos.set(chave, grupo);
      }

      grupo.totalCentavos += ultima.valorParcelaCentavos;
      grupo.itens.push({
        compraParceladaId: ultima.compraParceladaId,
        cartaoId: ultima.cartaoId,
        // Capitalização original do lançamento real mais recente -- nunca
        // `compraParcelada.estabelecimentoNormalizado` (só chave normalizada).
        estabelecimento: ultima.estabelecimento,
        parcelaNumero: ultima.parcelaNumero + n,
        totalParcelas: ultima.totalParcelas,
        valorCentavos: ultima.valorParcelaCentavos,
        competenciaAno: competencia.ano,
        competenciaMes: competencia.mes,
        responsavelId: ultima.responsavelId,
      });
    }
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.sort((a, b) => a.estabelecimento.localeCompare(b.estabelecimento)),
    }))
    .sort((a, b) =>
      a.competenciaAno !== b.competenciaAno
        ? a.competenciaAno - b.competenciaAno
        : a.competenciaMes - b.competenciaMes
    );
}
