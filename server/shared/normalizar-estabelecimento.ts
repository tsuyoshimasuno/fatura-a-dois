export function normalizarEstabelecimento(bruto: string): string {
  return bruto.trim().replace(/\s+/g, ' ').toLowerCase();
}
