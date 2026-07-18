// `mes`/`ano` inválidos ou ausentes caem no mês/ano atuais -- nunca deixa a
// tela num estado sem competência selecionada. Compartilhado por /lancamentos
// e /gastos (mesma lógica desde a Story 3.3).
export function competenciaValida(
  mesBruto: string | undefined,
  anoBruto: string | undefined
): { mes: number; ano: number } {
  const agora = new Date();
  const mes = Number(mesBruto);
  const ano = Number(anoBruto);

  const mesValido = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : agora.getMonth() + 1;
  const anoValido = Number.isInteger(ano) && ano >= 2000 && ano <= 2100 ? ano : agora.getFullYear();

  return { mes: mesValido, ano: anoValido };
}

// Nomes de mês para exibição (índice 1-12; posição 0 nunca usada). Separado
// de `MESES` (usado nos `<select>` de /lancamentos, /gastos, /upload --
// pares value/label para formulário) porque é uma lista só de rótulos, sem
// os `value` de string exigidos por um `<select>`.
export const NOME_MES = [
  '',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;
