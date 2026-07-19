import { notFound } from 'next/navigation';
import {
  contarLancamentosPorCategoria,
  contarRegrasPorCategoria,
  listarCategorias,
} from '@/server/categorizacao/gerenciar-categorias';
import { RemoverCategoriaForm } from '../../_components/remover-categoria-form';

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

      <RemoverCategoriaForm categoriaId={categoriaId} substitutasDisponiveis={substitutasDisponiveis} />
    </main>
  );
}
