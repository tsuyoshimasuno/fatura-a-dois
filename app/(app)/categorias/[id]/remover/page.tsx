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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '480px' }}>
      <h1>Remover categoria</h1>

      <p>
        {totalLancamentos === 0
          ? 'Nenhum lançamento associado.'
          : `${totalLancamentos} lançamento(s) serão afetados.`}
      </p>
      {totalRegras > 0 && (
        <p>
          {totalRegras} regra(s) memorizada(s) para esta categoria serão redirecionadas para a
          substituta escolhida, ou removidas se nenhuma for escolhida.
        </p>
      )}

      <form action={confirmar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Migrar lançamentos para:
          <br />
          <select name="substitutaId" defaultValue="">
            <option value="">Nenhuma (marcar como removida)</option>
            {substitutasDisponiveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ou criar nova categoria substituta (tem prioridade sobre a seleção acima, se preenchida):
          <br />
          <input type="text" name="novaCategoria" placeholder="Nome da nova categoria" />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit">Confirmar</button>
          <a href="/categorias">Cancelar</a>
        </div>
      </form>
    </main>
  );
}
