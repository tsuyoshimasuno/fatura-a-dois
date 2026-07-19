import Link from 'next/link';
import { competenciaValida } from '@/lib/competencia';
import { listarLancamentosParaCorrecao } from '@/server/categorizacao/corrigir-categoria';
import { listarCategorias } from '@/server/categorizacao/gerenciar-categorias';
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

type LancamentosPageProps = {
  searchParams: Promise<{ mes?: string; ano?: string; visao?: string }>;
};

export default async function LancamentosPage({ searchParams }: LancamentosPageProps) {
  const params = await searchParams;
  const { mes, ano } = competenciaValida(params.mes, params.ano);
  // `/lancamentos` não tem conceito próprio de "visão" (individual/combinada,
  // exclusivo de /gastos) -- só repassa o valor recebido de volta no link de
  // retorno, para o ida-e-volta Gastos -> Lançamentos -> Gastos não perder a
  // visão selecionada (ver spec: achado de review sobre round-trip).
  const visao = params.visao;

  const [lancamentos, categorias] = await Promise.all([
    listarLancamentosParaCorrecao(ano, mes),
    listarCategorias(),
  ]);

  // anoAtual-1..anoAtual+1 cobre a virada de ano (mesmo padrão de /upload).
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Lançamentos</h1>
        <p className="page-subtitle">Revise e corrija a categoria de cada lançamento da competência.</p>
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
        {visao && <input type="hidden" name="visao" value={visao} />}
        <button type="submit">Filtrar</button>
      </form>

      <Link href={`/gastos?mes=${mes}&ano=${ano}${visao ? `&visao=${visao}` : ''}`} className="link">
        Ver gastos desta competência
      </Link>

      {lancamentos.length === 0 ? (
        <p className="empty-state">Nenhum lançamento nesta competência.</p>
      ) : (
        <ul className="card-list">
          {lancamentos.map((item) => (
            <LancamentoItem key={item.id} item={item} categorias={categorias} />
          ))}
        </ul>
      )}
    </main>
  );
}
