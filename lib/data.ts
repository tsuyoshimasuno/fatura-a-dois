const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

// Converte a data de um lançamento (coluna `date` do Postgres, entregue pelo
// Drizzle como string `'YYYY-MM-DD'`) para o formato DD-MM-YYYY pedido pelo
// usuário. Manipulação de string pura -- nunca via `new Date(string)`, para
// não haver risco de o parser reinterpretar o fuso horário e deslocar o dia
// exibido. Se a string não bater com o formato esperado (nunca deveria
// acontecer vindo da coluna `date` do banco, mas defesa em profundidade
// contra dado malformado), devolve a string original em vez de produzir um
// resultado com segmentos "undefined".
export function formatarData(dataIso: string): string {
  const match = FORMATO_ISO.exec(dataIso);
  if (!match) return dataIso;

  const [, ano, mes, dia] = match;
  return `${dia}-${mes}-${ano}`;
}
