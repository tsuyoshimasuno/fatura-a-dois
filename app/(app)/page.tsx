import Link from 'next/link';
import { NOME_MES } from '@/lib/competencia';
import { formatarValorEmReais } from '@/lib/moeda';
import { listarCartoesPendentes } from '@/server/ingestao/mapear-cartao';
import { obterResumoGastos } from '@/server/visualizacao/resumo-gastos';
import { obterComprometimentoLimiteMensal } from '@/server/parcelas/comprometimento-limite';
import { projetarParcelasFuturas } from '@/server/parcelas/projetar-parcelas-futuras';
import { listarLancamentosParaCorrecao } from '@/server/categorizacao/corrigir-categoria';

// Mês seguinte ao informado, com virada de ano (`mes` 1-indexado) -- mesmo
// princípio de `avancarCompetencia` em
// server/parcelas/projetar-parcelas-futuras.ts, mas não importado de lá
// porque aquela função é privada ao módulo (não exportada) e o Code Map desta
// story não autoriza modificar aquele arquivo para exportá-la.
function proximaCompetencia(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export default async function Home() {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  // Antes desta story, "/" não tinha nenhuma dependência de dado. Com
  // `force-dynamic` no layout, uma falha aqui não derruba o app inteiro (o
  // layout já degrada para badge zerado), mas ainda derrubaria só esta
  // página sem tratamento -- degrada para uma mensagem de erro simples em vez
  // de crashar, já que o dashboard é conveniência de leitura, não algo
  // crítico que deva impedir o usuário de navegar pelo resto do app.
  let dadosDashboard: {
    pendentesCartoes: Awaited<ReturnType<typeof listarCartoesPendentes>>;
    resumo: Awaited<ReturnType<typeof obterResumoGastos>>;
    totalLancamentos: number;
    competencias: Awaited<ReturnType<typeof projetarParcelasFuturas>>;
    comprometimentos: Awaited<ReturnType<typeof obterComprometimentoLimiteMensal>>;
  } | null = null;

  try {
    // As quatro leituras da competência atual/parcelas não dependem uma da
    // outra -- disparadas em paralelo. `obterComprometimentoLimiteMensal`
    // precisa do resultado de `projetarParcelasFuturas`, então essa é
    // sequencial (mesmo padrão de app/(app)/parcelas/page.tsx).
    const [pendentesCartoes, resumo, lancamentosDaCompetencia, competencias] = await Promise.all([
      listarCartoesPendentes(),
      obterResumoGastos(anoAtual, mesAtual),
      listarLancamentosParaCorrecao(anoAtual, mesAtual),
      projetarParcelasFuturas(),
    ]);
    const comprometimentos = await obterComprometimentoLimiteMensal(competencias);

    dadosDashboard = {
      pendentesCartoes,
      resumo,
      totalLancamentos: lancamentosDaCompetencia.length,
      competencias,
      comprometimentos,
    };
  } catch (error) {
    console.error('Falha ao carregar dados do dashboard:', error);
  }

  if (!dadosDashboard) {
    return (
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">Fatura a Dois</h1>
        </div>
        <p className="hint">Não foi possível carregar o resumo agora. Tente novamente em instantes.</p>
      </main>
    );
  }

  const { pendentesCartoes, resumo, totalLancamentos, competencias, comprometimentos } = dadosDashboard;

  // "Fatura ainda não enviada": nenhum lançamento existe para a competência
  // do mês calendário atual -- checado via `listarLancamentosParaCorrecao`
  // (não filtra por cartão terceiro, ao contrário de `pessoas`/`pendentes` de
  // `obterResumoGastos`), para não confundir "upload já feito, mas só de
  // lançamentos de um cartão marcado terceiro" com "nada foi enviado ainda".
  const faturaNaoEnviada = totalLancamentos === 0;

  const totalCombinado = resumo.pessoas.reduce((soma, pessoa) => soma + pessoa.totalCentavos, 0);

  const proxima = proximaCompetencia(anoAtual, mesAtual);
  const totalProximoMes = competencias.find(
    (competencia) =>
      competencia.competenciaAno === proxima.ano && competencia.competenciaMes === proxima.mes
  )?.totalCentavos;
  const comprometimentoProximoMes = comprometimentos.find(
    (comprometimento) =>
      comprometimento.competenciaAno === proxima.ano && comprometimento.competenciaMes === proxima.mes
  );

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Fatura a Dois</h1>
        <p className="page-subtitle">
          Status da competência atual e atalhos para o que precisa de atenção.
        </p>
      </div>

      {faturaNaoEnviada ? (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            Fatura de {NOME_MES[mesAtual]} ainda não enviada
          </h2>
          <Link href="/upload" className="link">
            Enviar fatura →
          </Link>
        </section>
      ) : pendentesCartoes.length > 0 ? (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            {pendentesCartoes.length} cartão(ões) pendente(s) de mapeamento
          </h2>
          <Link href="/cartoes" className="link">
            Mapear cartões →
          </Link>
        </section>
      ) : (
        <section className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>
            Gastos de {NOME_MES[mesAtual]}: {formatarValorEmReais(totalCombinado)}
          </h2>
          {resumo.pendentes.itens.length > 0 && (
            <p className="hint" style={{ marginBottom: '0.75rem' }}>
              Pendente de revisão ({resumo.pendentes.itens.length}): {formatarValorEmReais(resumo.pendentes.totalCentavos)}{' '}
              -- ainda não contado no total acima.
            </p>
          )}
          <Link href={`/lancamentos?mes=${mesAtual}&ano=${anoAtual}`} className="link">
            Ver gastos →
          </Link>
        </section>
      )}

      {comprometimentoProximoMes && totalProximoMes !== undefined && (
        <section className="card">
          <p className="hint" style={{ marginBottom: '0.5rem' }}>
            {NOME_MES[proxima.mes]} já tem {formatarValorEmReais(totalProximoMes)} comprometido em
            parcelas.
          </p>
          <Link href="/parcelas" className="link">
            Ver parcelas →
          </Link>
        </section>
      )}
    </main>
  );
}
