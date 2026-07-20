'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatarData } from '@/lib/data';
import { formatarValorEmReais } from '@/lib/moeda';
import { corrigirCategoriaLancamento } from '@/server/categorizacao/corrigir-categoria';

type Categoria = { id: number; nome: string };

type Lancamento = {
  id: number;
  data: string;
  estabelecimento: string;
  valorCentavos: number;
  categoriaId: number | null;
  categoriaNome: string | null;
  categoriaRemovida: boolean;
  parcelaNumero: number | null;
  parcelaTotal: number | null;
  titularNome: string | null;
};

type LancamentoItemProps = {
  item: Lancamento;
  categorias: Categoria[];
};

export function LancamentoItem({ item, categorias }: LancamentoItemProps) {
  const router = useRouter();
  const emVooRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null);
  // Form de correção some por padrão -- deixa a lista "clean" pra revisar
  // 100+ itens de uma vez. O ícone revela o form inline (sem modal, sem
  // perder o lugar na lista); fecha sozinho após uma correção bem-sucedida.
  const [editando, setEditando] = useState(false);
  const painelId = `corrigir-categoria-${item.id}`;

  const categoriaAtualLabel = item.categoriaRemovida
    ? 'Categoria removida'
    : (item.categoriaNome ?? 'Sem categoria');

  const categoriaAtualSelecionavel =
    !item.categoriaRemovida && item.categoriaId !== null ? String(item.categoriaId) : '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emVooRef.current) return;

    const formData = new FormData(event.currentTarget);
    const bruto = formData.get('categoria_id');

    if (!bruto) {
      setResultado({ ok: false, message: 'Selecione uma categoria.' });
      return;
    }

    const categoriaId = Number(bruto);

    if (!Number.isInteger(categoriaId)) {
      setResultado({ ok: false, message: 'Categoria inválida.' });
      return;
    }

    emVooRef.current = true;
    setLoading(true);
    setResultado(null);

    try {
      const resposta = await corrigirCategoriaLancamento(item.id, categoriaId);
      if (resposta.ok) {
        setEditando(false);
        router.refresh();
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao corrigir categoria.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao corrigir categoria. Tente novamente.' });
    } finally {
      emVooRef.current = false;
      setLoading(false);
    }
  }

  return (
    <li className="card">
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>{formatarData(item.data)}</strong> -- {item.estabelecimento} --{' '}
        {formatarValorEmReais(item.valorCentavos)}
        {item.titularNome !== null && (
          <>
            {' '}
            <span className="titular-badge">{item.titularNome}</span>
          </>
        )}
        {/* Indicador de parcela só aparece quando os dois campos vêm preenchidos
            juntos (sempre gravados na mesma escrita, Story 5.1) -- avulso
            (parcelaTotal null ou 1) nunca ganha esse sufixo. */}
        {item.parcelaNumero !== null && item.parcelaTotal !== null && item.parcelaTotal > 1 && (
          <> -- {item.parcelaNumero}/{item.parcelaTotal}</>
        )}
      </div>
      <div className="field-inline" style={{ marginBottom: editando ? '0.75rem' : 0 }}>
        <span className="hint">Categoria atual: {categoriaAtualLabel}</span>
        {categorias.length > 0 && (
          <button
            type="button"
            className="icon-button"
            aria-expanded={editando}
            aria-controls={painelId}
            aria-label={editando ? 'Fechar correção de categoria' : 'Corrigir categoria'}
            title={editando ? 'Fechar correção de categoria' : 'Corrigir categoria'}
            onClick={() => setEditando((valor) => !valor)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {categorias.length === 0 ? (
        <p className="hint">Nenhuma categoria cadastrada ainda -- crie uma em /categorias antes de corrigir.</p>
      ) : (
        editando && (
          <form id={painelId} onSubmit={handleSubmit} className="field-inline">
            <select name="categoria_id" defaultValue={categoriaAtualSelecionavel} required disabled={loading}>
              <option value="" disabled>
                Selecione a categoria
              </option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading}>
              {loading ? 'Corrigindo...' : 'Corrigir'}
            </button>
          </form>
        )
      )}
      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error" style={{ marginTop: '0.5rem' }}>
          {resultado.message}
        </p>
      )}
    </li>
  );
}
