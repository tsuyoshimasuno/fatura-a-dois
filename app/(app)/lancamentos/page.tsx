import Link from 'next/link';
import { competenciaValida } from '@/lib/competencia';
import { formatarData } from '@/lib/data';
import { formatarValorEmReais } from '@/lib/moeda';
import { primeiroNome } from '@/lib/pessoa';
import { listarLancamentosParaCorrecao } from '@/server/categorizacao/corrigir-categoria';
import { listarCategorias } from '@/server/categorizacao/gerenciar-categorias';
import { listarContasCasal } from '@/server/ingestao/mapear-cartao';
import { obterResumoGastos, type CategoriaResumo, type MotivoPendencia } from '@/server/visualizacao/resumo-gastos';
import { LancamentoItem } from './_components/lancamento-item';

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
// Só é relevante quando Pessoa = Todos (ver `pessoaSelecionada` abaixo).
function visaoValida(visaoBruta: string | undefined): 'combinada' | 'individual' {
  return visaoBruta === 'combinada' ? 'combinada' : 'individual';
}

// Soma o detalhamento por categoria das duas pessoas num único conjunto de
// totais por `categoriaId` -- usado só pela visão combinada (Pessoa = Todos).
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

type LancamentosPageProps = {
  searchParams: Promise<{ mes?: string; ano?: string; visao?: string; pessoa?: string }>;
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
  // (e o pequeno risco de inconsistência entre o filtro de pessoa e o
  // resumo) na mesma requisição.
  const resumo = await obterResumoGastos(ano, mes, contas);

  // Filtro de Pessoa só aceita um usuarioId que exista em `listarContasCasal()`
  // -- mesmo princípio defensivo de `competenciaValida`/`visaoValida`: valor
  // ausente/inválido/malformado cai em "Todos" (nenhum filtro aplicado).
  const contaSelecionada = contas.find((conta) => conta.id === params.pessoa);
  const pessoaSelecionada = contaSelecionada ? contaSelecionada.id : null;

  const nomePorConta = new Map(contas.map((conta) => [conta.id, primeiroNome(conta.email)]));

  // anoAtual-1..anoAtual+1 cobre a virada de ano (mesmo padrão de /upload).
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  const totalCombinado = resumo.pessoas.reduce((soma, pessoa) => soma + pessoa.totalCentavos, 0);
  const categoriasCombinadas = combinarCategorias(resumo.pessoas.map((pessoa) => pessoa.categorias));
  const pessoaResumo = pessoaSelecionada
    ? resumo.pessoas.find((pessoa) => pessoa.usuarioId === pessoaSelecionada)
    : undefined;

  const lancamentosFiltrados = pessoaSelecionada
    ? lancamentos.filter((item) => item.titularUsuarioId === pessoaSelecionada)
    : lancamentos;

  // "Pendente de revisão" só lista `titular_pendente` -- `sem_categoria` e
  // `categoria_removida` já aparecem na lista principal com o dropdown de
  // correção inline (mesmo lançamento, mesma ação); duplicá-los aqui também
  // seria o mesmo item duas vezes na tela, uma com ação e outra sem (review
  // pass 1). Titular desconhecido nunca tem `usuarioId`, então independe do
  // filtro de pessoa por construção -- sempre aparece.
  const pendentesFiltrados = resumo.pendentes.itens.filter((item) => item.motivo === 'titular_pendente');
  const totalPendentesFiltrado = pendentesFiltrados.reduce((soma, item) => soma + item.valorCentavos, 0);

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Lançamentos</h1>
        <p className="page-subtitle">
          Veja quanto cada um gastou e corrija a categoria de cada lançamento da competência.
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
        <label className="field">
          Pessoa
          <select name="pessoa" defaultValue={pessoaSelecionada ?? ''}>
            <option value="">Todos</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {primeiroNome(conta.email)}
              </option>
            ))}
          </select>
        </label>
        {/* Toggle Individual/Combinada não faz sentido quando só uma pessoa
            está no recorte -- some da tela em vez de ficar desabilitado. O
            valor ainda viaja como campo oculto (abaixo) para não se perder
            se o usuário voltar a selecionar "Todos" depois (review pass 1:
            sem isso, "Combinada" resetava silenciosamente para "Individual"
            nesse ida-e-volta). */}
        {pessoaSelecionada ? (
          <input type="hidden" name="visao" value={visao} />
        ) : (
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
        )}
        <button type="submit">Filtrar</button>
      </form>

      {pessoaSelecionada ? (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            {nomePorConta.get(pessoaSelecionada) ?? 'Pessoa'} --{' '}
            {formatarValorEmReais(pessoaResumo?.totalCentavos ?? 0)}
          </h2>
          {!pessoaResumo || pessoaResumo.categorias.length === 0 ? (
            <p className="hint">Nenhum gasto resolvido nesta competência.</p>
          ) : (
            <ul className="card-list">
              {pessoaResumo.categorias.map((item) => (
                <li key={item.categoriaId}>
                  {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : visao === 'combinada' ? (
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
        <p className="empty-state">Nenhuma conta do casal encontrada -- tente novamente em instantes.</p>
      ) : (
        resumo.pessoas.map((pessoa) => (
          <section key={pessoa.usuarioId} className="card">
            <h2 style={{ marginBottom: '0.75rem' }}>
              {primeiroNome(pessoa.email)} -- {formatarValorEmReais(pessoa.totalCentavos)}
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

      {lancamentosFiltrados.length === 0 ? (
        <p className="empty-state">Nenhum lançamento nesta competência.</p>
      ) : (
        <ul className="card-list">
          {lancamentosFiltrados.map((item) => {
            const { titularUsuarioId, ...dadosLancamento } = item;
            const titularNome = titularUsuarioId !== null ? (nomePorConta.get(titularUsuarioId) ?? null) : null;
            return (
              <LancamentoItem
                key={item.id}
                item={{ ...dadosLancamento, titularNome }}
                categorias={categorias}
              />
            );
          })}
        </ul>
      )}

      {pendentesFiltrados.length > 0 && (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            Pendente de revisão -- {formatarValorEmReais(totalPendentesFiltrado)}
          </h2>
          {pessoaSelecionada && (
            <p className="hint" style={{ marginBottom: '0.75rem' }}>
              Titular ainda não identificado -- independe do filtro de pessoa acima.
            </p>
          )}
          <ul className="card-list">
            {pendentesFiltrados.map((item) => (
              <li key={item.id}>
                {formatarData(item.data)} -- {item.estabelecimento} -- {formatarValorEmReais(item.valorCentavos)} --{' '}
                {MOTIVO_LABEL[item.motivo]}
                {item.motivo === 'titular_pendente' && (
                  <>
                    {' '}
                    --{' '}
                    <Link href="/cartoes" className="link">
                      Resolver em Cartões
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
