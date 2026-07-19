'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mapearCartao, rejeitarCartaoTerceiro } from '@/server/ingestao/mapear-cartao';

type Cartao = {
  id: number;
  nomeTitular: string;
  tipoCartao: string;
  numeroMascarado: string;
};

type Conta = { id: string; email: string };

type CartaoPendenteItemProps = {
  item: Cartao;
  contas: Conta[];
};

// Só uma ação (atribuir a uma conta, ou rejeitar) pode estar em voo por vez
// neste item -- guardamos qual usuarioId está em voo (ou 'rejeitar') para
// desabilitar só o botão correspondente, mantendo os outros da mesma lista
// interativos (ver Design Notes / Component Patterns: item-card).
export function CartaoPendenteItem({ item, contas }: CartaoPendenteItemProps) {
  const router = useRouter();
  const [emVoo, setEmVoo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleAtribuir(usuarioId: string) {
    if (emVoo) return;
    setEmVoo(usuarioId);
    setResultado(null);

    try {
      const resposta = await mapearCartao(item.id, usuarioId);
      if (resposta.ok) {
        router.refresh();
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao atribuir cartão.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao atribuir cartão. Tente novamente.' });
    } finally {
      setEmVoo(null);
    }
  }

  async function handleRejeitar() {
    if (emVoo) return;
    setEmVoo('rejeitar');
    setResultado(null);

    try {
      const resposta = await rejeitarCartaoTerceiro(item.id);
      if (resposta.ok) {
        router.refresh();
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao rejeitar cartão.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao rejeitar cartão. Tente novamente.' });
    } finally {
      setEmVoo(null);
    }
  }

  return (
    <li className="card">
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>{item.nomeTitular}</strong> -- {item.tipoCartao} {item.numeroMascarado}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {contas.map((conta) => (
          <button
            key={conta.id}
            type="button"
            disabled={emVoo !== null}
            onClick={() => handleAtribuir(conta.id)}
          >
            {emVoo === conta.id ? 'Atribuindo...' : `Atribuir a ${conta.email}`}
          </button>
        ))}
        <button
          type="button"
          className="btn-danger-outline"
          disabled={emVoo !== null}
          onClick={handleRejeitar}
        >
          {emVoo === 'rejeitar' ? 'Rejeitando...' : 'Não é do casal'}
        </button>
      </div>
      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error" style={{ marginTop: '0.5rem' }}>
          {resultado.message}
        </p>
      )}
    </li>
  );
}
