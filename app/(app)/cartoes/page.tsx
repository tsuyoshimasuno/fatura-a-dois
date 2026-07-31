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
          {/* Sem Card envolvendo a seção (bad_spec repair pass 1,
              spec-8-2-consistencia-estrutural-e-telas-simples.md): cada item
              de `CartaoRejeitadoItem` já é o seu próprio `<Card>` -- um Card
              externo aqui produziria "card dentro de card" (borda/sombra
              dobrada), diferente do padrão de `parcelas/page.tsx` que a
              primeira versão desta story copiou (lá a lista é texto plano
              por item, não Cards individuais). Título ganha o mesmo
              tratamento visual (`text-[22.5px] font-bold`) das outras 10
              ocorrências de heading de seção do produto, sem introduzir
              container novo -- mesma consistência tipográfica, sem o
              artefato visual. */}
          <h2 className="text-[22.5px] font-bold mb-3">
            Cartões marcados como não sendo do casal
          </h2>
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
