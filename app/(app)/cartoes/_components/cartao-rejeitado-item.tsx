'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { desfazerRejeicaoCartao } from '@/server/ingestao/mapear-cartao';

type Cartao = {
  id: number;
  nomeTitular: string;
  tipoCartao: string;
  numeroMascarado: string;
};

type CartaoRejeitadoItemProps = {
  item: Cartao;
};

// Mesmo raciocínio de `CartaoPendenteItem` (achado do review desta mesma
// story, convergente entre os dois revisores): sem atraso, o card some da
// lista de rejeitados assim que router.refresh() reconcilia, então (a) a
// confirmação nunca seria lida e (b) um segundo clique durante essa janela
// reenviaria a mutação contra um cartão que o guard REJEITADO já não
// reconhece mais, mostrando um erro falso sobre uma ação que já teve sucesso.
const ATRASO_REFRESH_MS = 2500;

export function CartaoRejeitadoItem({ item }: CartaoRejeitadoItemProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null);
  // Uma vez desfeito com sucesso, o botão some -- reclicar não faria sentido
  // e fecha a janela de corrida descrita acima.
  const [resolvido, setResolvido] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  async function handleDesfazer() {
    if (loading) return;
    setLoading(true);
    setResultado(null);

    try {
      const resposta = await desfazerRejeicaoCartao(item.id);
      if (resposta.ok) {
        setResultado({ ok: true, message: 'Cartão voltou a ficar pendente de mapeamento.' });
        setResolvido(true);
        refreshTimeoutRef.current = setTimeout(() => router.refresh(), ATRASO_REFRESH_MS);
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao desfazer rejeição.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao desfazer rejeição. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="card">
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>{item.nomeTitular}</strong> -- {item.tipoCartao} {item.numeroMascarado}
      </p>
      {!resolvido && (
        <button type="button" disabled={loading} onClick={handleDesfazer}>
          {loading ? 'Desfazendo...' : 'Desfazer rejeição'}
        </button>
      )}
      {resultado && (
        <p
          role={resultado.ok ? undefined : 'alert'}
          aria-live={resultado.ok ? 'polite' : undefined}
          className={resultado.ok ? 'hint' : 'alert-error'}
          style={{ marginTop: '0.5rem' }}
        >
          {resultado.message}
        </p>
      )}
    </li>
  );
}
