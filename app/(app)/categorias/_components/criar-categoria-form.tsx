'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { criarCategoria } from '@/server/categorizacao/gerenciar-categorias';
import { IconePicker } from './icone-picker';

// `criarCategoria` não tem guarda de deduplicação no banco (ao contrário de
// mapearCartao/rejeitarCartaoTerceiro, que têm um WHERE-clause guard) -- um
// useRef síncrono, checado e setado como primeira linha do handler antes de
// qualquer await, fecha a janela de disparo duplo que `useState` sozinho não
// fecharia (a escrita numa ref é imediata, não depende de um ciclo de
// render). Ver spec Design Notes.
export function CriarCategoriaForm() {
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nome = String(formData.get('nome') ?? '');
    const icone = String(formData.get('icone') ?? '');

    try {
      const resposta = await criarCategoria(nome, icone);
      if (resposta.ok) {
        form.reset();
        router.refresh();
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao criar categoria.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao criar categoria. Tente novamente.' });
    } finally {
      emVooRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      <input type="text" name="nome" placeholder="Nova categoria" required disabled={loading} />
      <IconePicker disabled={loading} />
      <button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar'}
      </button>
      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error">
          {resultado.message}
        </p>
      )}
    </form>
  );
}
