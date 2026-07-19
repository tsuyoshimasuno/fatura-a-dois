import {
  listarCartoesPendentes,
  listarCartoesRejeitados,
  listarContasCasal,
} from '@/server/ingestao/mapear-cartao';
import { CartaoPendenteItem } from './_components/cartao-pendente-item';
import { CartaoRejeitadoItem } from './_components/cartao-rejeitado-item';

export default async function CartoesPage() {
  const [pendentes, rejeitados, contas] = await Promise.all([
    listarCartoesPendentes(),
    listarCartoesRejeitados(),
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
      {rejeitados.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>Cartões marcados como não sendo do casal</h2>
          <ul className="card-list">
            {rejeitados.map((item) => (
              <CartaoRejeitadoItem key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
