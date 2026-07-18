import { NOME_MES } from '@/lib/competencia';
import { formatarValorEmReais } from '@/lib/moeda';
import { projetarParcelasFuturas } from '@/server/parcelas/projetar-parcelas-futuras';

export default async function ParcelasPage() {
  const competencias = await projetarParcelasFuturas();

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Parcelas</h1>
        <p className="page-subtitle">
          Parcelas futuras projetadas a partir das compras parceladas em andamento, agrupadas por
          mês.
        </p>
      </div>

      {competencias.length === 0 ? (
        <p className="empty-state">Nenhuma compra parcelada em andamento no momento.</p>
      ) : (
        competencias.map((competencia) => (
          <section key={`${competencia.competenciaAno}-${competencia.competenciaMes}`} className="card">
            <h2 style={{ marginBottom: '0.75rem' }}>
              {NOME_MES[competencia.competenciaMes]} de {competencia.competenciaAno} --{' '}
              {formatarValorEmReais(competencia.totalCentavos)}
            </h2>
            <ul className="card-list">
              {competencia.itens.map((item) => (
                <li key={`${item.compraParceladaId}-${item.parcelaNumero}`}>
                  {item.estabelecimento} -- {item.parcelaNumero}/{item.totalParcelas} --{' '}
                  {formatarValorEmReais(item.valorCentavos)}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
