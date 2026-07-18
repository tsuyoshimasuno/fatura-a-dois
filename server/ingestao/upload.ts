'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { cartao, lancamento } from '@/db/schema';
import { resolverCategoriaSugerida } from '../categorizacao/resolver-categoria-sugerida';
import {
  calcularMergeDelta,
  type LancamentoExistente,
  type LancamentoNovoParaMerge,
} from '../lancamento-matching';
import { identificarOuCriarCompraParcelada } from '../parcelas/identificar-compra-parcelada';
import { retrairComprasSemLancamentos } from '../parcelas/retrair-compra-parcelada';
import { parsePlanilhaItau } from './parse-planilha-itau';

const ANO_MIN = 2000;
const ANO_MAX = 2100;
const NOME_ARQUIVO_MAX_LENGTH = 200;
// Uma fatura real tem no máximo algumas dezenas de KB; a margem cobre
// variação razoável sem permitir upload de arquivo arbitrariamente grande.
const TAMANHO_ARQUIVO_MAX_BYTES = 5 * 1024 * 1024;

export async function processarUpload(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const mes = Number(formData.get('competencia_mes'));
  const ano = Number(formData.get('competencia_ano'));

  if (
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12 ||
    !Number.isInteger(ano) ||
    ano < ANO_MIN ||
    ano > ANO_MAX
  ) {
    return { ok: false, message: 'Selecione mês e ano antes de enviar.' };
  }

  const arquivo = formData.get('arquivo');

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, message: 'Selecione um arquivo .xlsx.' };
  }

  if (arquivo.size > TAMANHO_ARQUIVO_MAX_BYTES) {
    return { ok: false, message: 'Arquivo muito grande para ser uma fatura do Itaú.' };
  }

  // Checagem por extensão é só uma triagem de UX -- não é fronteira de
  // segurança nem garante o layout do Itaú; a validação de conteúdo real
  // acontece no parsing da Story 2.2.
  if (!arquivo.name.toLowerCase().endsWith('.xlsx')) {
    const nomeExibido = arquivo.name.slice(0, NOME_ARQUIVO_MAX_LENGTH);
    return {
      ok: false,
      message: `Envie um arquivo .xlsx. Recebido: ${nomeExibido}.`,
    };
  }

  const buffer = await arquivo.arrayBuffer();
  const resultado = parsePlanilhaItau(buffer);

  if (!resultado.ok) {
    return { ok: false, message: resultado.message };
  }

  const { lancamentos } = resultado;

  const numerosDistintos = [...new Set(lancamentos.map((l) => l.numeroMascarado))];
  const cartoesTerceiro = await db
    .select()
    .from(cartao)
    .where(and(inArray(cartao.numeroMascarado, numerosDistintos), eq(cartao.terceiro, true)));

  if (cartoesTerceiro.length > 0) {
    const numeros = cartoesTerceiro.map((c) => c.numeroMascarado).join(', ');
    return {
      ok: false,
      message: `Upload rejeitado: contém lançamentos do(s) cartão(ões) ${numeros}, marcado(s) como não pertencente(s) ao casal. Resolva na tela de mapeamento (/cartoes) antes de reenviar.`,
    };
  }

  let resultadoMerge: ReturnType<typeof calcularMergeDelta>;

  try {
    resultadoMerge = await db.transaction(async (tx) => {
      // Cache local por número mascarado -- evita repetir a consulta pro mesmo
      // cartão várias vezes dentro do mesmo upload.
      const cartoesCache = new Map<string, number>();
      const novosParaMerge: LancamentoNovoParaMerge[] = [];

      for (const lancamentoBruto of lancamentos) {
        let cartaoId = cartoesCache.get(lancamentoBruto.numeroMascarado);

        if (cartaoId === undefined) {
          const existente = await tx
            .select()
            .from(cartao)
            .where(eq(cartao.numeroMascarado, lancamentoBruto.numeroMascarado));

          if (existente.length > 0) {
            cartaoId = existente[0].id;
          } else {
            const [novoCartao] = await tx
              .insert(cartao)
              .values({
                numeroMascarado: lancamentoBruto.numeroMascarado,
                nomeTitular: lancamentoBruto.nomeTitular,
                tipoCartao: lancamentoBruto.tipoCartao,
                usuarioId: null,
              })
              .returning();
            cartaoId = novoCartao.id;
          }

          cartoesCache.set(lancamentoBruto.numeroMascarado, cartaoId);
        }

        novosParaMerge.push({
          data: lancamentoBruto.data,
          estabelecimento: lancamentoBruto.estabelecimento,
          cartaoId,
          valorCentavos: lancamentoBruto.valorCentavos,
          parcelaNumero: lancamentoBruto.parcelaNumero,
          parcelaTotal: lancamentoBruto.parcelaTotal,
        });
      }

      // ORDER BY é obrigatório aqui: o pareamento posicional do merge (para
      // duplicatas de mesma chave) depende de uma ordem estável e
      // reprodutível -- sem isso, o Postgres não garante nenhuma ordem, e
      // duas linhas de valores diferentes na mesma chave poderiam trocar de
      // par entre execuções.
      const existentesBrutos = await tx
        .select()
        .from(lancamento)
        .where(and(eq(lancamento.competenciaAno, ano), eq(lancamento.competenciaMes, mes)))
        .orderBy(lancamento.id);

      const existentes: LancamentoExistente[] = existentesBrutos.map((l) => ({
        id: l.id,
        data: l.data,
        estabelecimento: l.estabelecimento,
        cartaoId: l.cartaoId,
        valorCentavos: l.valorCentavos,
      }));

      const delta = calcularMergeDelta(existentes, novosParaMerge);

      if (delta.remover.length > 0) {
        // Coleta os `compraParceladaId` (não nulos) antes de apagar -- depois
        // da remoção não há mais como descobrir a que compra um lançamento
        // apagado pertencia. Fecha o gap herdado da Story 2.4/AD-7: uma
        // `compra_parcelada` que fica sem nenhum lançamento real vinculado é
        // retraída via `server/parcelas`, nunca manipulada diretamente aqui.
        const lancamentosRemovidos = await tx
          .select({ compraParceladaId: lancamento.compraParceladaId })
          .from(lancamento)
          .where(inArray(lancamento.id, delta.remover));

        await tx.delete(lancamento).where(inArray(lancamento.id, delta.remover));

        const compraParceladaIdsRemovidos = lancamentosRemovidos
          .map((item) => item.compraParceladaId)
          .filter((id): id is number => id !== null);

        if (compraParceladaIdsRemovidos.length > 0) {
          await retrairComprasSemLancamentos(tx, compraParceladaIdsRemovidos);
        }
      }

      for (const item of delta.atualizar) {
        await tx
          .update(lancamento)
          .set({ valorCentavos: item.valorCentavos })
          .where(eq(lancamento.id, item.id));
      }

      for (const item of delta.inserir) {
        const categoriaId = await resolverCategoriaSugerida(item.estabelecimento, tx);

        // Identidade da compra original (AD-4, Story 5.1): só lançamentos
        // com indicação de parcela ("3/10", Story 2.2) participam. "1/1" não
        // conta como parcelado de verdade (nenhuma parcela futura a
        // projetar) -- não materializa uma `compra_parcelada`. A escrita em
        // `compra_parcelada` acontece exclusivamente dentro de
        // `identificarOuCriarCompraParcelada` (AD-7) -- este módulo nunca
        // insere/seleciona nessa tabela diretamente.
        let compraParceladaId: number | null = null;
        if (item.parcelaNumero !== null && item.parcelaTotal !== null && item.parcelaTotal > 1) {
          compraParceladaId = await identificarOuCriarCompraParcelada(tx, {
            cartaoId: item.cartaoId,
            estabelecimento: item.estabelecimento,
            valorParcelaCentavos: item.valorCentavos,
            totalParcelas: item.parcelaTotal,
            competenciaAno: ano,
            competenciaMes: mes,
          });
        }

        await tx.insert(lancamento).values({
          competenciaAno: ano,
          competenciaMes: mes,
          data: item.data,
          estabelecimento: item.estabelecimento,
          valorCentavos: item.valorCentavos,
          cartaoId: item.cartaoId,
          parcelaNumero: item.parcelaNumero,
          parcelaTotal: item.parcelaTotal,
          categoriaId,
          compraParceladaId,
        });
      }

      return delta;
    });
  } catch (error) {
    console.error('Falha ao gravar lançamentos:', error);
    return { ok: false, message: 'Falha ao gravar os lançamentos. Tente novamente.' };
  }

  return {
    ok: true,
    message: `${resultadoMerge.inserir.length} novos, ${resultadoMerge.atualizar.length} atualizados, ${resultadoMerge.remover.length} removidos para a competência ${mes}/${ano}.`,
  };
}
