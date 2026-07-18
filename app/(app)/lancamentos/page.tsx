import {
  corrigirCategoriaLancamento,
  listarLancamentosParaCorrecao,
} from '@/server/categorizacao/corrigir-categoria';
import { listarCategorias } from '@/server/categorizacao/gerenciar-categorias';

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

const formatadorValor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarValor(valorCentavos: number): string {
  return formatadorValor.format(valorCentavos / 100);
}

// `mes`/`ano` inválidos ou ausentes caem no mês/ano atuais -- mesma ideia de
// não deixar a tela num estado sem competência selecionada.
function competenciaValida(
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

type LancamentosPageProps = {
  searchParams: Promise<{ mes?: string; ano?: string }>;
};

export default async function LancamentosPage({ searchParams }: LancamentosPageProps) {
  const params = await searchParams;
  const { mes, ano } = competenciaValida(params.mes, params.ano);

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
        <button type="submit">Filtrar</button>
      </form>

      {lancamentos.length === 0 ? (
        <p className="empty-state">Nenhum lançamento nesta competência.</p>
      ) : (
        <ul className="card-list">
          {lancamentos.map((item) => {
            const categoriaAtualLabel = item.categoriaRemovida
              ? 'Categoria removida'
              : (item.categoriaNome ?? 'Sem categoria');

            const categoriaAtualSelecionavel =
              !item.categoriaRemovida && item.categoriaId !== null ? String(item.categoriaId) : '';

            async function corrigir(formData: FormData) {
              'use server';
              const bruto = formData.get('categoria_id');

              if (!bruto) {
                console.error('Falha ao corrigir categoria: nenhuma categoria selecionada.');
                return;
              }

              const categoriaId = Number(bruto);

              if (!Number.isInteger(categoriaId)) {
                console.error('Falha ao corrigir categoria: categoria inválida.');
                return;
              }

              const resultado = await corrigirCategoriaLancamento(item.id, categoriaId);
              if (!resultado.ok) console.error('Falha ao corrigir categoria:', resultado.message);
            }

            return (
              <li key={item.id} className="card">
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{item.data}</strong> -- {item.estabelecimento} --{' '}
                  {formatarValor(item.valorCentavos)}
                </div>
                <div className="hint" style={{ marginBottom: '0.75rem' }}>
                  Categoria atual: {categoriaAtualLabel}
                </div>
                {categorias.length === 0 ? (
                  <p className="hint">Nenhuma categoria cadastrada ainda -- crie uma em /categorias antes de corrigir.</p>
                ) : (
                  <form action={corrigir} className="field-inline">
                    <select name="categoria_id" defaultValue={categoriaAtualSelecionavel} required>
                      <option value="" disabled>
                        Selecione a categoria
                      </option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                    <button type="submit">Corrigir</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
