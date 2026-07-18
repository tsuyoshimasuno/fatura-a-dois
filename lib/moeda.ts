const formatadorValor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Centraliza a conversão de centavos (inteiro, como vem do banco) para o
// formato R$ exibido na UI -- extraído de /lancamentos assim que uma segunda
// tela (Story 4.1) precisou do mesmo formatador.
export function formatarValorEmReais(valorCentavos: number): string {
  return formatadorValor.format(valorCentavos / 100);
}
