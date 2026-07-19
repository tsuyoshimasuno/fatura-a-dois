import Link from 'next/link';
import { NOME_MES } from '@/lib/competencia';
import { formatarValorEmReais } from '@/lib/moeda';
import { obterComprometimentoLimiteMensal } from '@/server/parcelas/comprometimento-limite';
import { projetarParcelasFuturas } from '@/server/parcelas/projetar-parcelas-futuras';

export default async function ParcelasPage() {
  // Uma única leitura de `projetarParcelasFuturas()`, reaproveitada pelo
  // comprometimento por pessoa -- evita duas consultas independentes do
  // mesmo estado (e o total do mês e a quebra por pessoa poderem divergir
  // se algo mudar entre uma consulta e outra).
  const competencias = await projetarParcelasFuturas();
  const comprometimentos = await obterComprometimentoLimiteMensal(competencias);

  const comprometimentoPorCompetencia = new Map(
    comprometimentos.map((item) => [`${item.competenciaAno}-${item.competenciaMes}`, item])
  );

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
        competencias.map((competencia) => {
          const chave = `${competencia.competenciaAno}-${competencia.competenciaMes}`;
          const comprometimento = comprometimentoPorCompetencia.get(chave);

          return (
            <section key={chave} className="card">
              <h2 style={{ marginBottom: '0.75rem' }}>
                {NOME_MES[competencia.competenciaMes]} de {competencia.competenciaAno} --{' '}
                {formatarValorEmReais(competencia.totalCentavos)}
              </h2>
              {comprometimento && (
                <>
                  <p className="hint" style={{ marginBottom: '0.25rem' }}>
                    Comprometido por pessoa:
                  </p>
                  <ul className="card-list" style={{ marginBottom: '0.75rem' }}>
                    {comprometimento.pessoas.map((pessoa) => (
                      <li key={pessoa.usuarioId}>
                        {pessoa.email} -- {formatarValorEmReais(pessoa.totalCentavos)}
                      </li>
                    ))}
                    {comprometimento.pendenteCentavos > 0 && (
                      <li>
                        Pendente -- {formatarValorEmReais(comprometimento.pendenteCentavos)} --{' '}
                        <Link href="/cartoes" className="link">
                          Resolver em Cartões
                        </Link>
                      </li>
                    )}
                  </ul>
                </>
              )}
              <ul className="card-list">
                {competencia.itens.map((item) => (
                  <li key={`${item.compraParceladaId}-${item.parcelaNumero}`}>
                    {item.estabelecimento} -- {item.parcelaNumero}/{item.totalParcelas} --{' '}
                    {formatarValorEmReais(item.valorCentavos)}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
