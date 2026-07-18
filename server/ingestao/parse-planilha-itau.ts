import * as XLSX from 'xlsx';

export type LancamentoBruto = {
  data: string; // ISO 8601 (AAAA-MM-DD)
  estabelecimento: string;
  parcelaNumero: number | null;
  parcelaTotal: number | null;
  valorCentavos: number;
  nomeTitular: string;
  tipoCartao: string;
  numeroMascarado: string;
};

type ResultadoParse =
  | { ok: true; lancamentos: LancamentoBruto[] }
  | { ok: false; message: string };

const REGEX_DATA = /^\d{2}\/\d{2}\/\d{4}$/;
const REGEX_PARCELAMENTO = /^Parcela (\d+) de (\d+)$/;
const REGEX_VALOR = /^R\$ (-?[\d,]+\.\d{2})$/;

const MSG_LAYOUT_INESPERADO = 'Planilha fora do layout esperado do Itaú.';
const MSG_LINHA_INESPERADA_PREFIXO = 'Planilha fora do layout esperado do Itaú';

// Cabeçalho da seção "Lançamentos" -- colunas a partir do índice 1 (índice 0
// é sempre vazio na planilha real do Itaú).
const CABECALHO_ESPERADO = ['Data', 'Lançamento', 'Parcelamento', 'Valor'];

function encontrarLinhaCabecalho(linhas: string[][]): number {
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const bate = CABECALHO_ESPERADO.every(
      (esperado, offset) => (linha[offset + 1] ?? '').trim() === esperado
    );
    if (bate) return i;
  }
  return -1;
}

function converterDataParaIso(dataBr: string): string | null {
  const [dia, mes, ano] = dataBr.split('/').map(Number);
  // Round-trip via Date.UTC: pega dia/mês inválidos (ex: 31/02) que o regex
  // de formato sozinho não rejeitaria.
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function parsePlanilhaItau(buffer: ArrayBuffer): ResultadoParse {
  let linhas: string[][];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const primeiraSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeiraSheet];
    linhas = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });
  } catch {
    return { ok: false, message: 'Não foi possível ler o arquivo.' };
  }

  const indiceCabecalho = encontrarLinhaCabecalho(linhas);
  if (indiceCabecalho === -1) {
    return { ok: false, message: MSG_LAYOUT_INESPERADO };
  }

  const lancamentos: LancamentoBruto[] = [];

  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const data = (linha[1] ?? '').trim();

    if (data === '') break; // fim da seção de lançamentos (verificado nas 2 planilhas reais de exemplo: nada além de "Subtotal"/rodapé aparece depois)

    const numeroLinha = i + 1;
    const mensagemLinhaInesperada = `${MSG_LINHA_INESPERADA_PREFIXO} (linha ${numeroLinha}).`;

    if (!REGEX_DATA.test(data)) {
      return { ok: false, message: mensagemLinhaInesperada };
    }

    const dataIso = converterDataParaIso(data);
    if (dataIso === null) {
      return { ok: false, message: mensagemLinhaInesperada };
    }

    const valorBruto = (linha[4] ?? '').trim();
    const valorMatch = REGEX_VALOR.exec(valorBruto);
    if (!valorMatch) {
      return { ok: false, message: mensagemLinhaInesperada };
    }

    const parcelamentoBruto = (linha[3] ?? '').trim();
    let parcelaNumero: number | null = null;
    let parcelaTotal: number | null = null;
    if (parcelamentoBruto !== '') {
      const parcelamentoMatch = REGEX_PARCELAMENTO.exec(parcelamentoBruto);
      if (!parcelamentoMatch) {
        return { ok: false, message: mensagemLinhaInesperada };
      }
      parcelaNumero = Number(parcelamentoMatch[1]);
      parcelaTotal = Number(parcelamentoMatch[2]);
      if (parcelaNumero < 1 || parcelaTotal < 1 || parcelaNumero > parcelaTotal) {
        return { ok: false, message: mensagemLinhaInesperada };
      }
    }

    const nomeTitular = (linha[7] ?? '').trim();
    const tipoCartao = (linha[8] ?? '').trim();
    const numeroMascarado = (linha[9] ?? '').trim();
    if (nomeTitular === '' || tipoCartao === '' || numeroMascarado === '') {
      return { ok: false, message: mensagemLinhaInesperada };
    }

    const valorNumerico = parseFloat(valorMatch[1].replace(/,/g, ''));
    const valorCentavos = Math.round(valorNumerico * 100);

    lancamentos.push({
      data: dataIso,
      estabelecimento: (linha[2] ?? '').trim(),
      parcelaNumero,
      parcelaTotal,
      valorCentavos,
      nomeTitular,
      tipoCartao,
      numeroMascarado,
    });
  }

  if (lancamentos.length === 0) {
    return { ok: false, message: MSG_LAYOUT_INESPERADO };
  }

  return { ok: true, lancamentos };
}
