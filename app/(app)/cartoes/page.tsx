import {
  listarCartoesPendentes,
  listarContasCasal,
  mapearCartao,
  rejeitarCartaoTerceiro,
} from '@/server/ingestao/mapear-cartao';

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
          {pendentes.map((item) => {
            async function atribuir(formData: FormData) {
              'use server';
              const resultado = await mapearCartao(item.id, String(formData.get('usuarioId')));
              if (!resultado.ok) console.error('Falha ao mapear cartão:', resultado.message);
            }

            async function rejeitar() {
              'use server';
              const resultado = await rejeitarCartaoTerceiro(item.id);
              if (!resultado.ok) console.error('Falha ao rejeitar cartão:', resultado.message);
            }

            return (
              <li key={item.id} className="card">
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>{item.nomeTitular}</strong> -- {item.tipoCartao} {item.numeroMascarado}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {contas.map((conta) => (
                    <form key={conta.id} action={atribuir}>
                      <input type="hidden" name="usuarioId" value={conta.id} />
                      <button type="submit">Atribuir a {conta.email}</button>
                    </form>
                  ))}
                  <form action={rejeitar}>
                    <button type="submit" className="btn-secondary">
                      Não é do casal
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
