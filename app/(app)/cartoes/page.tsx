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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '480px' }}>
      <h1>Cartões</h1>
      {pendentes.length === 0 ? (
        <p>Nenhum cartão pendente de mapeamento.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <li key={item.id} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '1rem' }}>
                <p>
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
                    <button type="submit">Não é do casal</button>
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
