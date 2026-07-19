import { listarCategorias } from '@/server/categorizacao/gerenciar-categorias';
import { CriarCategoriaForm } from './_components/criar-categoria-form';
import { CategoriaItem } from './_components/categoria-item';

export default async function CategoriasPage() {
  const categorias = await listarCategorias();

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Categorias</h1>
        <p className="page-subtitle">Categorias compartilhadas pelas duas contas do casal.</p>
      </div>

      <CriarCategoriaForm />

      {categorias.length === 0 ? (
        <p className="empty-state">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <ul className="card-list">
          {categorias.map((item) => (
            <CategoriaItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
