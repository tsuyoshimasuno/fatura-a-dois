'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { removerCategoria } from '@/server/categorizacao/gerenciar-categorias';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="substituta-id">Migrar lançamentos para:</Label>
        <SelectNative id="substituta-id" name="substitutaId" defaultValue="" disabled={loading}>
          <option value="">Nenhuma (marcar como removida)</option>
          {substitutasDisponiveis.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nova-categoria">
          Ou criar nova categoria substituta (tem prioridade sobre a seleção acima, se preenchida):
        </Label>
        <Input
          id="nova-categoria"
          type="text"
          name="novaCategoria"
          placeholder="Nome da nova categoria"
          disabled={loading}
        />
      </div>

      {resultado && !resultado.ok && (
        <Alert variant="destructive">
          <AlertDescription>{resultado.message}</AlertDescription>
        </Alert>
      )}

      <div className="field-inline">
        <Button type="submit" disabled={loading}>
          {loading ? 'Confirmando...' : 'Confirmar'}
        </Button>
        <Button variant="secondary" asChild>
          <a
            href="/categorias"
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
        </Button>
      </div>
    </form>
  );
}
