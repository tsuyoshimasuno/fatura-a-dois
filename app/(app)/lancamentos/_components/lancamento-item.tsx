'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatarData } from '@/lib/data';
import { formatarValorEmReais } from '@/lib/moeda';
import { corrigirCategoriaLancamento } from '@/server/categorizacao/corrigir-categoria';
import { criarCategoria } from '@/server/categorizacao/gerenciar-categorias';

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
  const emVooCriacaoRef = useRef(false);
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

  // Select controlado (em vez de defaultValue) só pra permitir pré-selecionar
  // a categoria recém-criada inline sem precisar de uma ref imperativa --
  // fora isso, se comporta exatamente como o defaultValue de antes.
  const [categoriaId, setCategoriaId] = useState(categoriaAtualSelecionavel);

  // Categoria criada inline (via "+ Nova categoria") pode ainda não estar em
  // `categorias` -- essa prop só chega depois que o `router.refresh()` busca
  // de novo no servidor. Mesclada localmente pra a categoria já aparecer
  // como opção selecionável na hora, sem esperar o round-trip. Uma vez que
  // `categorias` alcança e já contém o id, o `.some` abaixo evita duplicar.
  const [categoriaExtra, setCategoriaExtra] = useState<Categoria | null>(null);
  const categoriasDisponiveis = useMemo(
    () => (categoriaExtra && !categorias.some((cat) => cat.id === categoriaExtra.id) ? [...categorias, categoriaExtra] : categorias),
    [categorias, categoriaExtra]
  );

  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [loadingCriacao, setLoadingCriacao] = useState(false);
  const [resultadoCriacao, setResultadoCriacao] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emVooRef.current) return;

    const formData = new FormData(event.currentTarget);
    const bruto = formData.get('categoria_id');

    if (!bruto) {
      setResultado({ ok: false, message: 'Selecione uma categoria.' });
      return;
    }

    const categoriaIdEscolhida = Number(bruto);

    if (!Number.isInteger(categoriaIdEscolhida)) {
      setResultado({ ok: false, message: 'Categoria inválida.' });
      return;
    }

    emVooRef.current = true;
    setLoading(true);
    setResultado(null);

    try {
      const resposta = await corrigirCategoriaLancamento(item.id, categoriaIdEscolhida);
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

  async function handleCriarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emVooCriacaoRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nome = String(formData.get('nome') ?? '');

    emVooCriacaoRef.current = true;
    setLoadingCriacao(true);
    setResultadoCriacao(null);

    try {
      const resposta = await criarCategoria(nome);
      if (resposta.ok && resposta.categoria) {
        setCategoriaExtra({ id: resposta.categoria.id, nome: resposta.categoria.nome });
        setCategoriaId(String(resposta.categoria.id));
        setCriandoCategoria(false);
        form.reset();
        router.refresh();
      } else {
        setResultadoCriacao({ ok: false, message: resposta.message ?? 'Falha ao criar categoria.' });
      }
    } catch {
      setResultadoCriacao({ ok: false, message: 'Falha inesperada ao criar categoria. Tente novamente.' });
    } finally {
      emVooCriacaoRef.current = false;
      setLoadingCriacao(false);
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
      </div>
      {editando && (
        <div id={painelId}>
          {categoriasDisponiveis.length === 0 ? (
            <p className="hint" style={{ marginBottom: '0.5rem' }}>Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <form onSubmit={handleSubmit} className="field-inline">
              <select
                name="categoria_id"
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
                required
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione a categoria
                </option>
                {categoriasDisponiveis.map((cat) => (
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

          {/* Criar categoria sem sair da tela -- antes disso o único caminho
              era navegar até /categorias e voltar, perdendo o lugar na lista
              de 100+ itens (feedback do usuário). */}
          {!criandoCategoria ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setCriandoCategoria(true)}
            >
              + Nova categoria
            </button>
          ) : (
            <form onSubmit={handleCriarCategoria} className="field-inline" style={{ marginTop: '0.5rem' }}>
              <input type="text" name="nome" placeholder="Nome da categoria" required disabled={loadingCriacao} />
              <button type="submit" disabled={loadingCriacao}>
                {loadingCriacao ? 'Criando...' : 'Criar'}
              </button>
              <button type="button" className="btn-secondary" disabled={loadingCriacao} onClick={() => setCriandoCategoria(false)}>
                Cancelar
              </button>
            </form>
          )}

          {resultadoCriacao && !resultadoCriacao.ok && (
            <p role="alert" className="alert-error" style={{ marginTop: '0.5rem' }}>
              {resultadoCriacao.message}
            </p>
          )}
        </div>
      )}
      {resultado && !resultado.ok && (
        <p role="alert" className="alert-error" style={{ marginTop: '0.5rem' }}>
          {resultado.message}
        </p>
      )}
    </li>
  );
}
