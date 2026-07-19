'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { processarUpload } from '@/server/ingestao/upload';

const MESES = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function UploadPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Competência selecionada no formulário, capturada no momento do submit --
  // `form.reset()` (chamado logo abaixo em caso de sucesso) limpa os
  // `<select>`, então este é o único lugar em que o valor ainda está
  // disponível para montar o link pós-sucesso para /lancamentos.
  const [competenciaEnviada, setCompetenciaEnviada] = useState<{ mes: string; ano: string } | null>(
    null
  );

  // anoAtual-1..anoAtual+1 cobre a virada de ano mesmo se a página for
  // prerenderizada estaticamente num build anterior (ex: build em julho/2026
  // já inclui 2027 na lista).
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const mesSelecionado = String(formData.get('competencia_mes') ?? '');
    const anoSelecionado = String(formData.get('competencia_ano') ?? '');

    try {
      const response = await processarUpload(formData);
      setResult(response);
      if (response.ok) {
        setCompetenciaEnviada({ mes: mesSelecionado, ano: anoSelecionado });
        form.reset();
      }
    } catch {
      setResult({ ok: false, message: 'Falha inesperada ao enviar. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page--narrow">
      <div className="page-header">
        <h1 className="page-title">Enviar fatura</h1>
        <p className="page-subtitle">Selecione a competência e envie a planilha (.xlsx) exportada do Itaú.</p>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          Mês
          <select name="competencia_mes" defaultValue="" required disabled={loading}>
            <option value="" disabled>
              Selecione o mês
            </option>
            {MESES.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Ano
          <select name="competencia_ano" defaultValue="" required disabled={loading}>
            <option value="" disabled>
              Selecione o ano
            </option>
            {anos.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Arquivo
          <input type="file" accept=".xlsx" name="arquivo" required disabled={loading} />
        </label>
        {result && (
          <p
            role={result.ok ? undefined : 'alert'}
            aria-live={result.ok ? 'polite' : undefined}
            className={result.ok ? 'hint' : 'alert-error'}
          >
            {result.message}
          </p>
        )}
        {result?.ok && competenciaEnviada && (
          <Link
            href={`/lancamentos?mes=${competenciaEnviada.mes}&ano=${competenciaEnviada.ano}`}
            className="link"
          >
            Ver gastos de {MESES.find((mes) => mes.value === competenciaEnviada.mes)?.label ?? ''}{' '}
            de {competenciaEnviada.ano} →
          </Link>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </main>
  );
}
