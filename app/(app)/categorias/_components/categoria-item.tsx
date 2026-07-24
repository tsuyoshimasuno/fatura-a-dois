'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { editarCategoria } from '@/server/categorizacao/gerenciar-categorias';
import { IconePicker } from './icone-picker';

type Categoria = { id: number; nome: string; icone: string | null };

type CategoriaItemProps = {
  item: Categoria;
};

export function CategoriaItem({ item }: CategoriaItemProps) {
  const router = useRouter();
  const emVooRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emVooRef.current) return;
    emVooRef.current = true;
    setLoading(true);
    setResultado(null);

    const formData = new FormData(event.currentTarget);
    const nome = String(formData.get('nome') ?? '');
    // `formData.get('icone')` só retorna `null` quando NENHUM radio do grupo
    // está marcado -- só acontece quando `item.icone` já é um valor fora do
    // enum conhecido hoje (dado obsoleto de uma chave removida numa rodada
    // futura, já que a UI sempre marca "Nenhum" por padrão quando o valor é
    // nulo). Nesse caso preserva o valor atual em vez de apagá-lo -- sem
    // isto, salvar a categoria por qualquer outro motivo (ex. só renomear)
    // apagaria silenciosamente um ícone que o usuário nunca pediu para
    // remover (achado de review real, convergente entre os dois revisores).
    // Quando o usuário de fato marca "Nenhum", o radio existe e está
    // presente no FormData com valor `''`, então este fallback nunca
    // interfere nesse caminho.
    const iconeBruto = formData.get('icone');
    const icone = iconeBruto === null ? (item.icone ?? '') : String(iconeBruto);

    try {
      const resposta = await editarCategoria(item.id, nome, icone);
      if (resposta.ok) {
        setResultado({ ok: true, message: 'Categoria salva.' });
        router.refresh();
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao editar categoria.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao editar categoria. Tente novamente.' });
    } finally {
      emVooRef.current = false;
      setLoading(false);
    }
  }

  return (
    <li className="card">
      <form onSubmit={handleSubmit} className="field-inline" style={{ marginBottom: '0.75rem' }}>
        <input type="text" name="nome" defaultValue={item.nome} required disabled={loading} />
        <IconePicker valorAtual={item.icone} disabled={loading} />
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
      {resultado && (
        <p
          role={resultado.ok ? undefined : 'alert'}
          aria-live={resultado.ok ? 'polite' : undefined}
          className={resultado.ok ? 'hint' : 'alert-error'}
          style={{ marginBottom: '0.75rem' }}
        >
          {resultado.message}
        </p>
      )}
      <a href={`/categorias/${item.id}/remover`} className="link">
        Remover
      </a>
    </li>
  );
}
