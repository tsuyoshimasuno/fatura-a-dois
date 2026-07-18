'use server';

const ANO_MIN = 2000;
const ANO_MAX = 2100;
const NOME_ARQUIVO_MAX_LENGTH = 200;

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

  return {
    ok: true,
    message: `Upload aceito para a competência ${mes}/${ano}. Processamento dos lançamentos ainda não implementado (Story 2.2).`,
  };
}
