'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { removerCategoria } from '@/server/categorizacao/gerenciar-categorias';

type Categoria = { id: number; nome: string };

type RemoverCategoriaFormProps = {
  categoriaId: number;
  substitutasDisponiveis: Categoria[];
};

export function RemoverCategoriaForm({ categoriaId, substitutasDisponiveis }: RemoverCategoriaFormProps) {
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
    const novaCategoriaNome = String(formData.get('novaCategoria') ?? '').trim() || null;
    const selecionada = String(formData.get('substitutaId') ?? '');
    const substitutaId = !novaCategoriaNome && selecionada ? Number(selecionada) : null;

    try {
      const resposta = await removerCategoria(categoriaId, substitutaId, novaCategoriaNome);
      if (resposta.ok) {
        // A página atual (confirmação desta categoria específica) deixa de
        // existir após a remoção, por isso navegamos para /categorias em vez
        // de só ficar aqui (substitui o `redirect()` que só existia no lado
        // servidor). `router.refresh()` antes do `push` garante que o Router
        // Cache não sirva /categorias com a categoria recém-removida ainda
        // na lista -- mesmo cuidado dos demais componentes desta story.
        router.refresh();
        router.push('/categorias');
      } else {
        setResultado({ ok: false, message: resposta.message ?? 'Falha ao remover categoria.' });
      }
    } catch {
      setResultado({ ok: false, message: 'Falha inesperada ao remover categoria. Tente novamente.' });
    } finally {
      emVooRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="field">
        Migrar lançamentos para:
        <select name="substitutaId" defaultValue="" disabled={loading}>
          <option value="">Nenhuma (marcar como removida)</option>
          {substitutasDisponiveis.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Ou criar nova categoria substituta (tem prioridade sobre a seleção acima, se preenchida):
        <input type="text" name="novaCategoria" placeholder="Nome da nova categoria" disabled={loading} />
      </label>

      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error">
          {resultado.message}
        </p>
      )}

      <div className="field-inline">
        <button type="submit" disabled={loading}>
          {loading ? 'Confirmando...' : 'Confirmar'}
        </button>
        <a
          href="/categorias"
          className="btn btn-secondary"
          aria-disabled={loading}
          onClick={(event) => {
            // A remoção já disparada não é cancelável no servidor -- navegar
            // para longe durante o envio só enganaria o usuário fazendo
            // parecer que a ação foi abortada, quando na verdade ainda
            // completa em segundo plano.
            if (loading) event.preventDefault();
          }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
