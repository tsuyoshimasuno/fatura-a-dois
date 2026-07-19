'use client';

import { useEffect, useRef, useState } from 'react';
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

// Tempo que a mensagem de resumo de impacto (achado 2 da auditoria) fica
// visível antes do router.refresh() -- um cartão mapeado com sucesso some da
// lista de pendentes assim que a lista é recarregada (não é mais pendente),
// então sem esse atraso a mensagem nunca chegaria a ser lida: o item seria
// desmontado quase imediatamente após aparecer.
const ATRASO_REFRESH_MS = 2500;

// Só uma ação (atribuir a uma conta, ou rejeitar) pode estar em voo por vez
// neste item -- guardamos qual usuarioId está em voo (ou 'rejeitar') para
// desabilitar só o botão correspondente, mantendo os outros da mesma lista
// interativos (ver Design Notes / Component Patterns: item-card).
export function CartaoPendenteItem({ item, contas }: CartaoPendenteItemProps) {
  const router = useRouter();
  const [emVoo, setEmVoo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null);
  // Uma vez resolvido (mapeado ou rejeitado) com sucesso, os botões de ação
  // somem -- reclicar não faria sentido (o cartão já não está mais pendente)
  // e evita uma segunda chamada contra um cartão que o guard PENDENTE do
  // servidor já rejeitaria de qualquer forma.
  const [resolvido, setResolvido] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  function agendarRefresh() {
    refreshTimeoutRef.current = setTimeout(() => router.refresh(), ATRASO_REFRESH_MS);
  }

  async function handleAtribuir(usuarioId: string) {
    if (emVoo) return;
    setEmVoo(usuarioId);
    setResultado(null);

    try {
      const resposta = await mapearCartao(item.id, usuarioId);
      if (resposta.ok) {
        setResultado({ ok: true, message: resposta.message ?? 'Cartão atribuído.' });
        setResolvido(true);
        agendarRefresh();
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
        // Fecha a janela de reclique imediatamente (mesmo raciocínio de
        // `handleAtribuir`) -- sem mensagem de impacto aqui (fora do escopo
        // desta mudança), então sem atraso: o refresh acontece na hora.
        setResolvido(true);
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
      {!resolvido && (
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
