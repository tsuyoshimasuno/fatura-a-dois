'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
        <strong>{item.data}</strong> -- {item.estabelecimento} --{' '}
        {formatarValorEmReais(item.valorCentavos)}
      </div>
      <div className="hint" style={{ marginBottom: '0.75rem' }}>
        Categoria atual: {categoriaAtualLabel}
      </div>
      {categorias.length === 0 ? (
        <p className="hint">Nenhuma categoria cadastrada ainda -- crie uma em /categorias antes de corrigir.</p>
      ) : (
        <form onSubmit={handleSubmit} className="field-inline">
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
      )}
      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error" style={{ marginTop: '0.5rem' }}>
          {resultado.message}
        </p>
      )}
    </li>
  );
}
