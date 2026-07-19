import { listarCartoesPendentes, listarContasCasal } from '@/server/ingestao/mapear-cartao';
import { CartaoPendenteItem } from './_components/cartao-pendente-item';

export default async function CartoesPage() {
  const [pendentes, contas] = await Promise.all([
    listarCartoesPendentes(),
    listarContasCasal(),
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Cartões</h1>
        <p className="page-subtitle">Associe cada cartão novo a uma das duas contas do casal.</p>
      </div>
      {pendentes.length === 0 ? (
        <p className="empty-state">Nenhum cartão pendente de mapeamento.</p>
      ) : (
        <ul className="card-list">
          {pendentes.map((item) => (
            <CartaoPendenteItem key={item.id} item={item} contas={contas} />
          ))}
        </ul>
      )}
    </main>
  );
}
