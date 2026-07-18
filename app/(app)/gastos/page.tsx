import { competenciaValida } from '@/lib/competencia';
import { formatarValorEmReais } from '@/lib/moeda';
import { obterResumoGastos, type CategoriaResumo, type MotivoPendencia } from '@/server/visualizacao/resumo-gastos';

const MESES = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const MOTIVO_LABEL: Record<MotivoPendencia, string> = {
  titular_pendente: 'Titular pendente de mapeamento',
  sem_categoria: 'Sem categoria',
  categoria_removida: 'Categoria removida',
};

// Qualquer valor além de 'combinada' (ausente, malformado) cai no default
// 'individual' -- mesmo princípio de não deixar a tela num estado inválido.
function visaoValida(visaoBruta: string | undefined): 'combinada' | 'individual' {
  return visaoBruta === 'combinada' ? 'combinada' : 'individual';
}

// Soma o detalhamento por categoria das duas pessoas num único conjunto de
// totais por `categoriaId` -- usado só pela visão combinada.
function combinarCategorias(gruposPorPessoa: CategoriaResumo[][]): CategoriaResumo[] {
  const combinadas = new Map<number, CategoriaResumo>();

  for (const categorias of gruposPorPessoa) {
    for (const item of categorias) {
      const existente = combinadas.get(item.categoriaId);
      if (existente) {
        existente.totalCentavos += item.totalCentavos;
      } else {
        combinadas.set(item.categoriaId, { ...item });
      }
    }
  }

  return Array.from(combinadas.values()).sort((a, b) => b.totalCentavos - a.totalCentavos);
}

type GastosPageProps = {
  searchParams: Promise<{ mes?: string; ano?: string; visao?: string }>;
};

export default async function GastosPage({ searchParams }: GastosPageProps) {
  const params = await searchParams;
  const { mes, ano } = competenciaValida(params.mes, params.ano);
  const visao = visaoValida(params.visao);

  const resumo = await obterResumoGastos(ano, mes);

  // anoAtual-1..anoAtual+1 cobre a virada de ano (mesmo padrão de /lancamentos e /upload).
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  const totalCombinado = resumo.pessoas.reduce((soma, pessoa) => soma + pessoa.totalCentavos, 0);
  const categoriasCombinadas = combinarCategorias(resumo.pessoas.map((pessoa) => pessoa.categorias));

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Gastos</h1>
        <p className="page-subtitle">
          Total gasto por pessoa e detalhamento por categoria na competência selecionada.
        </p>
      </div>

      <form method="GET" className="form-row">
        <label className="field">
          Mês
          <select name="mes" defaultValue={String(mes)}>
            {MESES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Ano
          <select name="ano" defaultValue={String(ano)}>
            {anos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          Visão
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label className="field-inline">
              <input
                type="radio"
                name="visao"
                value="individual"
                defaultChecked={visao === 'individual'}
              />
              Individual
            </label>
            <label className="field-inline">
              <input type="radio" name="visao" value="combinada" defaultChecked={visao === 'combinada'} />
              Combinada
            </label>
          </div>
        </div>
        <button type="submit">Filtrar</button>
      </form>

      {visao === 'combinada' ? (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>Casal -- {formatarValorEmReais(totalCombinado)}</h2>
          {categoriasCombinadas.length === 0 ? (
            <p className="hint">Nenhum gasto resolvido nesta competência.</p>
          ) : (
            <ul className="card-list">
              {categoriasCombinadas.map((item) => (
                <li key={item.categoriaId}>
                  {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : resumo.pessoas.length === 0 ? (
        <p className="empty-state">
          Nenhuma conta do casal encontrada -- tente novamente em instantes.
        </p>
      ) : (
        resumo.pessoas.map((pessoa) => (
          <section key={pessoa.usuarioId} className="card">
            <h2 style={{ marginBottom: '0.75rem' }}>
              {pessoa.email} -- {formatarValorEmReais(pessoa.totalCentavos)}
            </h2>
            {pessoa.categorias.length === 0 ? (
              <p className="hint">Nenhum gasto resolvido nesta competência.</p>
            ) : (
              <ul className="card-list">
                {pessoa.categorias.map((item) => (
                  <li key={item.categoriaId}>
                    {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      {resumo.pendentes.itens.length > 0 && (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            Pendente de revisão -- {formatarValorEmReais(resumo.pendentes.totalCentavos)}
          </h2>
          <ul className="card-list">
            {resumo.pendentes.itens.map((item) => (
              <li key={item.id}>
                {item.data} -- {item.estabelecimento} -- {formatarValorEmReais(item.valorCentavos)} --{' '}
                {MOTIVO_LABEL[item.motivo]}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
