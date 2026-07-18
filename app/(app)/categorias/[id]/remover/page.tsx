import { notFound, redirect } from 'next/navigation';
import {
  contarLancamentosPorCategoria,
  contarRegrasPorCategoria,
  listarCategorias,
  removerCategoria,
} from '@/server/categorizacao/gerenciar-categorias';

export default async function RemoverCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categoriaId = Number(id);

  if (!Number.isInteger(categoriaId)) {
    notFound();
  }

  const categorias = await listarCategorias();

  if (!categorias.some((item) => item.id === categoriaId)) {
    notFound();
  }

  const [totalLancamentos, totalRegras] = await Promise.all([
    contarLancamentosPorCategoria(categoriaId),
    contarRegrasPorCategoria(categoriaId),
  ]);
  const substitutasDisponiveis = categorias.filter((item) => item.id !== categoriaId);

  async function confirmar(formData: FormData) {
    'use server';

    const novaCategoriaNome = String(formData.get('novaCategoria') ?? '').trim() || null;
    const selecionada = String(formData.get('substitutaId') ?? '');
    const substitutaId = !novaCategoriaNome && selecionada ? Number(selecionada) : null;

    const resultado = await removerCategoria(categoriaId, substitutaId, novaCategoriaNome);
    if (!resultado.ok) {
      console.error('Falha ao remover categoria:', resultado.message);
      return;
    }

    redirect('/categorias');
  }

  return (
    <main className="page page--narrow">
      <div className="page-header">
        <h1 className="page-title">Remover categoria</h1>
      </div>

      <p className="hint">
        {totalLancamentos === 0
          ? 'Nenhum lançamento associado.'
          : `${totalLancamentos} lançamento(s) serão afetados.`}
      </p>
      {totalRegras > 0 && (
        <p className="hint">
          {totalRegras} regra(s) memorizada(s) para esta categoria serão redirecionadas para a
          substituta escolhida, ou removidas se nenhuma for escolhida.
        </p>
      )}

      <form action={confirmar} className="form">
        <label className="field">
          Migrar lançamentos para:
          <select name="substitutaId" defaultValue="">
            <option value="">Nenhuma (marcar como removida)</option>
            {substitutasDisponiveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Ou criar nova categoria substituta (tem prioridade sobre a seleção acima, se preenchida):
          <input type="text" name="novaCategoria" placeholder="Nome da nova categoria" />
        </label>

        <div className="field-inline">
          <button type="submit">Confirmar</button>
          <a href="/categorias" className="btn btn-secondary">
            Cancelar
          </a>
        </div>
      </form>
    </main>
  );
}
