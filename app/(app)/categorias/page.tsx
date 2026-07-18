import {
  criarCategoria,
  editarCategoria,
  listarCategorias,
} from '@/server/categorizacao/gerenciar-categorias';

export default async function CategoriasPage() {
  const categorias = await listarCategorias();

  async function criar(formData: FormData) {
    'use server';
    const resultado = await criarCategoria(String(formData.get('nome')));
    if (!resultado.ok) console.error('Falha ao criar categoria:', resultado.message);
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Categorias</h1>
        <p className="page-subtitle">Categorias compartilhadas pelas duas contas do casal.</p>
      </div>

      <form action={criar} className="form-row">
        <input type="text" name="nome" placeholder="Nova categoria" required />
        <button type="submit">Criar</button>
      </form>

      {categorias.length === 0 ? (
        <p className="empty-state">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <ul className="card-list">
          {categorias.map((item) => {
            async function renomear(formData: FormData) {
              'use server';
              const resultado = await editarCategoria(item.id, String(formData.get('nome')));
              if (!resultado.ok) console.error('Falha ao editar categoria:', resultado.message);
            }

            return (
              <li key={item.id} className="card">
                <form action={renomear} className="field-inline" style={{ marginBottom: '0.75rem' }}>
                  <input type="text" name="nome" defaultValue={item.nome} required />
                  <button type="submit">Salvar</button>
                </form>
                <a href={`/categorias/${item.id}/remover`} className="link">
                  Remover
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
