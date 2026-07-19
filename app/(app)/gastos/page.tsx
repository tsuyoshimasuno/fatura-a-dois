import { permanentRedirect } from 'next/navigation';

type GastosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// `/gastos` deixou de ser destino de navegação (fundida em `/lancamentos`,
// spec-ux-unificar-lancamentos-e-gastos), mas precisa continuar resolvendo
// para qualquer link/bookmark antigo -- redireciona preservando a
// querystring inteira em vez de sumir (o arquivo de rota precisa continuar
// existindo, senão vira 404 em vez de redirect). `permanentRedirect` (não
// `redirect`) porque a rota foi aposentada de propósito, não é um desvio
// temporário.
export default async function GastosPage({ searchParams }: GastosPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === 'string') {
      query.set(chave, valor);
    }
  }

  const queryString = query.toString();
  permanentRedirect(`/lancamentos${queryString ? `?${queryString}` : ''}`);
}
