'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { processarUpload } from '@/server/ingestao/upload';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  // `<select>` nativos por trás de `SelectNative`, então este é o único
  // lugar em que o valor ainda está disponível para montar o link
  // pós-sucesso para /lancamentos.
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
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="form">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="competencia-mes">Mês</Label>
              <SelectNative
                id="competencia-mes"
                name="competencia_mes"
                defaultValue=""
                required
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione o mês
                </option>
                {MESES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="competencia-ano">Ano</Label>
              <SelectNative
                id="competencia-ano"
                name="competencia_ano"
                defaultValue=""
                required
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione o ano
                </option>
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="arquivo">Arquivo</Label>
              <Input type="file" id="arquivo" accept=".xlsx" name="arquivo" required disabled={loading} />
            </div>
            {result &&
              (result.ok ? (
                <p className="hint" aria-live="polite">
                  {result.message}
                </p>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              ))}
            {result?.ok && competenciaEnviada && (
              <Link
                href={`/lancamentos?mes=${competenciaEnviada.mes}&ano=${competenciaEnviada.ano}`}
                className="link"
              >
                Ver gastos de {MESES.find((mes) => mes.value === competenciaEnviada.mes)?.label ?? ''}{' '}
                de {competenciaEnviada.ano} →
              </Link>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
