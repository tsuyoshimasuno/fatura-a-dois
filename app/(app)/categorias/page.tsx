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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '480px' }}>
      <h1>Categorias</h1>

      <form action={criar} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input type="text" name="nome" placeholder="Nova categoria" required />
        <button type="submit">Criar</button>
      </form>

      {categorias.length === 0 ? (
        <p>Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {categorias.map((item) => {
            async function renomear(formData: FormData) {
              'use server';
              const resultado = await editarCategoria(item.id, String(formData.get('nome')));
              if (!resultado.ok) console.error('Falha ao editar categoria:', resultado.message);
            }

            return (
              <li key={item.id} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '1rem' }}>
                <form
                  action={renomear}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}
                >
                  <input type="text" name="nome" defaultValue={item.nome} required />
                  <button type="submit">Salvar</button>
                </form>
                <a href={`/categorias/${item.id}/remover`}>Remover</a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
