import { Nav } from './_components/nav';
import { listarCartoesPendentes } from '@/server/ingestao/mapear-cartao';
import { obterResumoGastos } from '@/server/visualizacao/resumo-gastos';

// Força renderização dinâmica (por requisição) em todo o grupo de rotas
// `(app)`. Sem isso, qualquer rota que não leia `searchParams`/`cookies`
// (ex.: /cartoes, /parcelas, /upload) seria pré-renderizada como HTML
// estático no build e só atualizaria via `revalidatePath` explícito -- que
// nenhuma das Server Actions consumidas aqui dispara para este layout (o
// Code Map desta story proíbe modificar `mapear-cartao.ts` e exige consumir
// `processarUpload` sem alterações). Como o badge de pendência precisa
// refletir dado real "quando qualquer tela é carregada" (Acceptance
// Criteria), a única forma de garantir isso sem tocar nesses arquivos é
// desligar a otimização estática aqui.
export const dynamic = 'force-dynamic';

// Busca as duas contagens de pendência (cartões pendentes de mapeamento,
// lançamentos pendentes de revisão da competência do mês calendário atual)
// para alimentar o badge da nav em toda tela do app -- sobreposição
// deliberada com a mesma leitura feita por `page.tsx` (Início), ver Boundaries
// da spec-ux-dashboard-inicial.md: app de baixo tráfego, não introduzir
// cache/memoização só para eliminar essa duplicação.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  // Antes desta story, `Nav` não tinha nenhuma dependência de dado e nunca
  // podia falhar. Com `force-dynamic`, este layout envolve toda rota do app
  // -- uma falha transitória aqui (rede, Supabase) derrubaria literalmente
  // toda tela, não só o badge. Degrada para contagem 0 (sem badge) em vez de
  // quebrar a navegação inteira; o badge é aviso, nunca crítico (ver
  // Boundaries: "nunca um gate que impede acessar as outras telas").
  let pendentesCartoesCount = 0;
  let pendentesLancamentosCount = 0;
  try {
    const [pendentesCartoes, resumo] = await Promise.all([
      listarCartoesPendentes(),
      obterResumoGastos(anoAtual, mesAtual),
    ]);
    pendentesCartoesCount = pendentesCartoes.length;
    pendentesLancamentosCount = resumo.pendentes.itens.length;
  } catch (error) {
    console.error('Falha ao buscar contagens de pendência para a nav:', error);
  }

  return (
    <div className="app-shell">
      <Nav
        pendentesCartoes={pendentesCartoesCount}
        pendentesLancamentos={pendentesLancamentosCount}
      />
      <div className="app-content">{children}</div>
    </div>
  );
}
