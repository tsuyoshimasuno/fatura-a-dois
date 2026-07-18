'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { cartao, lancamento } from '@/db/schema';
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

  try {
    await db.transaction(async (tx) => {
    // Cache local por número mascarado -- evita repetir a consulta pro mesmo
    // cartão várias vezes dentro do mesmo upload.
    const cartoesCache = new Map<string, number>();

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

      await tx.insert(lancamento).values({
        competenciaAno: ano,
        competenciaMes: mes,
        data: lancamentoBruto.data,
        estabelecimento: lancamentoBruto.estabelecimento,
        valorCentavos: lancamentoBruto.valorCentavos,
        cartaoId,
        parcelaNumero: lancamentoBruto.parcelaNumero,
        parcelaTotal: lancamentoBruto.parcelaTotal,
      });
    }
    });
  } catch (error) {
    console.error('Falha ao gravar lançamentos:', error);
    return { ok: false, message: 'Falha ao gravar os lançamentos. Tente novamente.' };
  }

  return {
    ok: true,
    message: `${lancamentos.length} lançamentos importados para a competência ${mes}/${ano}.`,
  };
}
