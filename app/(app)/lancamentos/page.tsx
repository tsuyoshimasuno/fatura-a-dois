import { competenciaValida } from '@/lib/competencia';
import { listarLancamentosParaCorrecao } from '@/server/categorizacao/corrigir-categoria';
import { listarCategorias } from '@/server/categorizacao/gerenciar-categorias';
import { listarContasCasal } from '@/server/ingestao/mapear-cartao';
import { obterResumoGastos } from '@/server/visualizacao/resumo-gastos';
import { LancamentosView } from './_components/lancamentos-view';

// Qualquer valor além de 'combinada' (ausente, malformado) cai no default
// 'individual' -- mesmo princípio de não deixar a tela num estado inválido.
// Só usado como valor inicial do toggle Individual/Combinada, que agora vive
// como estado local em `LancamentosView` (spec: Pessoa/Categoria/Visão
// reativos no cliente, sem novo request ao servidor).
function visaoValida(visaoBruta: string | undefined): 'combinada' | 'individual' {
  return visaoBruta === 'combinada' ? 'combinada' : 'individual';
}

type LancamentosPageProps = {
  searchParams: Promise<{ mes?: string; ano?: string; visao?: string }>;
};

export default async function LancamentosPage({ searchParams }: LancamentosPageProps) {
  const params = await searchParams;
  const { mes, ano } = competenciaValida(params.mes, params.ano);
  const visao = visaoValida(params.visao);

  const [lancamentos, categorias, contas] = await Promise.all([
    listarLancamentosParaCorrecao(ano, mes),
    listarCategorias(),
    listarContasCasal(),
  ]);
  // `contas` é repassada em vez de deixar `obterResumoGastos` chamar
  // `listarContasCasal()` de novo -- evita uma segunda chamada à Admin API
  // na mesma requisição.
  const resumo = await obterResumoGastos(ano, mes, contas);

  // anoAtual-1..anoAtual+1 cobre a virada de ano (mesmo padrão de /upload).
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  // "Pendente de revisão" só lista `titular_pendente` -- `sem_categoria` e
  // `categoria_removida` já aparecem na lista principal com o dropdown de
  // correção inline (mesmo lançamento, mesma ação); duplicá-los aqui também
  // seria o mesmo item duas vezes na tela, uma com ação e outra sem (review
  // pass 1). Dado estático em relação aos filtros de Pessoa/Categoria (que
  // agora são só client-side) -- continua computado aqui, no servidor.
  const pendentes = resumo.pendentes.itens.filter((item) => item.motivo === 'titular_pendente');

  return (
    <main className="page page--wide">
      <div className="page-header">
        <h1 className="page-title">Lançamentos</h1>
        <p className="page-subtitle">
          Veja quanto cada um gastou e corrija a categoria de cada lançamento da competência.
        </p>
      </div>

      <LancamentosView
        lancamentos={lancamentos}
        categorias={categorias}
        contas={contas}
        resumoPessoas={resumo.pessoas}
        pendentes={pendentes}
        visaoAtual={visao}
        mes={mes}
        ano={ano}
        anos={anos}
      />
    </main>
  );
}
