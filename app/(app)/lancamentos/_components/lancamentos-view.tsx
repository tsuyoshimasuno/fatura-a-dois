'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { formatarData } from '@/lib/data';
import { MESES } from '@/lib/meses';
import { formatarValorEmReais } from '@/lib/moeda';
import { primeiroNome } from '@/lib/pessoa';
import type { LancamentoParaCorrecao } from '@/server/categorizacao/corrigir-categoria';
import type { CategoriaResumo, ItemPendente, PessoaResumo } from '@/server/visualizacao/resumo-gastos';
import { LancamentoItem } from './lancamento-item';

type Categoria = { id: number; nome: string };
type Conta = { id: string; email: string };

// Estado do filtro de Categoria: 'todas' (default) mostra tudo, 'sem_categoria'
// isola `categoriaId: null`, e um número filtra por uma categoria ativa
// específica -- os três casos do I/O Matrix da spec.
type FiltroCategoria = 'todas' | 'sem_categoria' | number;

type LancamentosViewProps = {
  lancamentos: LancamentoParaCorrecao[];
  categorias: Categoria[];
  contas: Conta[];
  resumoPessoas: PessoaResumo[];
  pendentes: ItemPendente[];
  visaoAtual: 'combinada' | 'individual';
  mes: number;
  ano: number;
  anos: number[];
};

// Soma o detalhamento por categoria das duas pessoas num único conjunto de
// totais por `categoriaId` -- usado só pela visão combinada (Pessoa = Todos).
// Movido de `page.tsx` (Server Component) para cá: a decisão combinada/
// individual passou a ser reativa no cliente junto com Pessoa/Categoria, e
// esta função só reprocessa o agregado já calculado pelo servidor
// (`resumoPessoas`), sem nenhuma consulta nova.
function combinarCategorias(gruposPorPessoa: CategoriaResumo[][]): CategoriaResumo[] {
  const combinadas = new Map<number, CategoriaResumo>();

  for (const categorias of gruposPorPessoa) {
    for (const item of categorias) {
      const existente = combinadas.get(item.categoriaId);
      if (existente) {
        existente.totalCentavos += item.totalCentavos;
      } else {
        combinadas.set(item.categoriaId, { ...item });
      }
    }
  }

  return Array.from(combinadas.values()).sort((a, b) => b.totalCentavos - a.totalCentavos);
}

export function LancamentosView({
  lancamentos,
  categorias,
  contas,
  resumoPessoas,
  pendentes,
  visaoAtual,
  mes,
  ano,
  anos,
}: LancamentosViewProps) {
  // Pessoa e Categoria são 100% client-side: recalculam lista/total via
  // filter()/reduce() sobre `lancamentos` (já carregado pelo Server
  // Component) -- nenhum novo request ao servidor para esses dois filtros
  // (Boundaries da spec). Mês/Ano/Visão continuam vindo de fora (GET/props).
  const [pessoaSelecionada, setPessoaSelecionada] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<FiltroCategoria>('todas');
  const [visao, setVisao] = useState<'combinada' | 'individual'>(visaoAtual);

  // Se a categoria filtrada for removida (soft-delete em outra aba/pessoa) e
  // um `router.refresh()` trouxer `categorias` sem ela, o <select> cairia de
  // volta pra "Todas as categorias" sozinho (o <option> some), mas o estado
  // React continuaria com o id antigo -- lista e Total ficariam filtrando por
  // uma categoria que a tela já não mostra mais como selecionada. Reconciliado
  // durante o render (não `useEffect` -- é exatamente o padrão "adjusting
  // state when a prop changes" dos docs do React, guardado por `categorias
  // !== categoriasRecebidas` pra disparar só quando a prop de fato muda).
  const [categoriasRecebidas, setCategoriasRecebidas] = useState(categorias);
  if (categorias !== categoriasRecebidas) {
    setCategoriasRecebidas(categorias);
    if (typeof categoriaSelecionada === 'number' && !categorias.some((cat) => cat.id === categoriaSelecionada)) {
      setCategoriaSelecionada('todas');
    }
  }

  const nomePorConta = useMemo(
    () => new Map(contas.map((conta) => [conta.id, primeiroNome(conta.email)])),
    [contas]
  );

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      // Repasse (Epic 6, Story 6.1): filtro de Pessoa passa a comparar contra
      // o responsável efetivo (destinatário do repasse, quando houver;
      // titular original, quando não houver) -- extensão direta do que
      // "Pessoa = X" já significava.
      const responsavelEfetivo = item.responsavelId ?? item.titularUsuarioId;
      if (pessoaSelecionada && responsavelEfetivo !== pessoaSelecionada) return false;

      if (categoriaSelecionada === 'sem_categoria') {
        return item.categoriaId === null;
      }
      if (typeof categoriaSelecionada === 'number') {
        return item.categoriaId === categoriaSelecionada;
      }

      return true;
    });
  }, [lancamentos, pessoaSelecionada, categoriaSelecionada]);

  const totalFiltrado = useMemo(
    () => lancamentosFiltrados.reduce((soma, item) => soma + item.valorCentavos, 0),
    [lancamentosFiltrados]
  );

  // O Total por categoria soma tudo que está na lista filtrada ao lado,
  // inclusive lançamentos com titular ainda não mapeado (diferente do resumo
  // por pessoa, que só conta titular confirmado) -- avisa quando isso
  // acontece pra não parecer um total "errado" comparado às outras seções.
  const totalFiltradoIncluiTitularPendente = useMemo(
    () => categoriaSelecionada !== 'todas' && lancamentosFiltrados.some((item) => item.titularUsuarioId === null),
    [categoriaSelecionada, lancamentosFiltrados]
  );

  const totalPendentes = useMemo(
    () => pendentes.reduce((soma, item) => soma + item.valorCentavos, 0),
    [pendentes]
  );

  const totalCombinado = useMemo(
    () => resumoPessoas.reduce((soma, pessoa) => soma + pessoa.totalCentavos, 0),
    [resumoPessoas]
  );

  const categoriasCombinadas = useMemo(
    () => combinarCategorias(resumoPessoas.map((pessoa) => pessoa.categorias)),
    [resumoPessoas]
  );

  const pessoaResumo = pessoaSelecionada
    ? resumoPessoas.find((pessoa) => pessoa.usuarioId === pessoaSelecionada)
    : undefined;

  function handlePessoaChange(event: ChangeEvent<HTMLSelectElement>) {
    setPessoaSelecionada(event.target.value || null);
  }

  function handleCategoriaChange(event: ChangeEvent<HTMLSelectElement>) {
    const valor = event.target.value;
    if (valor === '') {
      setCategoriaSelecionada('todas');
    } else if (valor === 'sem') {
      setCategoriaSelecionada('sem_categoria');
    } else {
      setCategoriaSelecionada(Number(valor));
    }
  }

  // Filtro ativo (pessoa e/ou categoria) que o bloco de pendentes ignora --
  // usado só para decidir se o aviso explicativo aparece, nunca para
  // esconder o bloco em si (spec: pendentes sempre mostram tudo).
  const algumFiltroAtivo = pessoaSelecionada !== null || categoriaSelecionada !== 'todas';

  return (
    <>
      {/* Barra única de filtro: Mês/Ano (form GET de verdade, recarrega a
          página) e Pessoa/Categoria/Visão (reativos no cliente, sem reload)
          lado a lado na mesma linha visual -- antes eram duas áreas de
          filtro separadas (uma no topo da página, outra dentro do painel de
          resumo), o que não ficava agradável (feedback do usuário + revisão
          de UX). `display: contents` no <form> faz seus campos participarem
          do mesmo flex row externo sem criar uma caixa própria, preservando
          o submit GET real de Mês/Ano sem duplicar o layout. */}
      <div className="form-row">
        <form method="GET" style={{ display: 'contents' }}>
          <label className="field">
            Mês
            <select name="mes" defaultValue={String(mes)}>
              {MESES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Ano
            <select name="ano" defaultValue={String(ano)}>
              {anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
        </form>
        <label className="field">
          Pessoa
          <select value={pessoaSelecionada ?? ''} onChange={handlePessoaChange}>
            <option value="">Todos</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {primeiroNome(conta.email)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Categoria
          <select
            value={categoriaSelecionada === 'todas' ? '' : categoriaSelecionada === 'sem_categoria' ? 'sem' : String(categoriaSelecionada)}
            onChange={handleCategoriaChange}
          >
            <option value="">Todas as categorias</option>
            {categorias.length > 0 && <option value="sem">Sem categoria</option>}
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </label>
        {/* Toggle Individual/Combinada não faz sentido quando só uma pessoa
            está no recorte, nem quando uma categoria específica está
            selecionada (o painel vira só "Total", visão não se aplica) --
            some da tela em vez de ficar desabilitado (mesmo princípio
            herdado de page.tsx antes desta mudança). */}
        {pessoaSelecionada === null && categoriaSelecionada === 'todas' && (
          <div className="field">
            Visão
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label className="field-inline">
                <input
                  type="radio"
                  name="visao"
                  value="individual"
                  checked={visao === 'individual'}
                  onChange={() => setVisao('individual')}
                />
                Individual
              </label>
              <label className="field-inline">
                <input
                  type="radio"
                  name="visao"
                  value="combinada"
                  checked={visao === 'combinada'}
                  onChange={() => setVisao('combinada')}
                />
                Combinada
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="lancamentos-columns">
        {/* Ordem no mobile (coluna única, sem CSS Grid): resumo+pendentes ->
            lista, resumo sempre antes da lista (o usuário quer ver o Total
            sem precisar rolar a lista primeiro). No desktop (>=768px),
            `.lancamentos-columns` vira CSS Grid com `grid-template-areas`
            que posiciona a lista e o painel lado a lado. Resumo e pendentes
            ficam num único wrapper (`.lancamentos-painel`) que compartilha o
            mesmo teto/rolagem da lista -- as duas colunas sempre têm a
            mesma altura visual (feedback do usuário: painel crescia livre
            com muitas categorias enquanto a lista ficava desproporcional). */}
        <div className="lancamentos-painel">
          <div className="lancamentos-resumo">
            {categoriaSelecionada !== 'todas' ? (
              <section className="card">
                <h2 className="section-title">Total -- {formatarValorEmReais(totalFiltrado)}</h2>
                {totalFiltradoIncluiTitularPendente && (
                  <p className="hint">Inclui lançamento(s) com titular ainda não identificado.</p>
                )}
              </section>
            ) : pessoaSelecionada ? (
              <section className="card">
                <h2 className="section-title">
                  {nomePorConta.get(pessoaSelecionada) ?? 'Pessoa'} --{' '}
                  {formatarValorEmReais(pessoaResumo?.totalCentavos ?? 0)}
                </h2>
                {!pessoaResumo || pessoaResumo.categorias.length === 0 ? (
                  <p className="hint">Nenhum gasto resolvido nesta competência.</p>
                ) : (
                  <ul className="card-list">
                    {pessoaResumo.categorias.map((item) => (
                      <li key={item.categoriaId}>
                        {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : visao === 'combinada' ? (
              // card-highlight (spec-snowui-lancamentos-highlight-e-icone-
              // categoria.md): esta branch só é alcançada quando
              // `pessoaSelecionada === null` e `categoriaSelecionada ===
              // 'todas'` (as duas condições já filtram as branches acima),
              // exatamente o cruzamento "visão combinada sem filtro" do I/O
              // Matrix -- não precisa repetir a checagem aqui. `card-highlight`
              // é sempre usada junto de `card` (só sobrescreve o background,
              // ver globals.css).
              <section className="card card-highlight">
                <h2 className="section-title">Casal -- {formatarValorEmReais(totalCombinado)}</h2>
                {categoriasCombinadas.length === 0 ? (
                  <p className="hint">Nenhum gasto resolvido nesta competência.</p>
                ) : (
                  <ul className="card-list">
                    {categoriasCombinadas.map((item) => (
                      <li key={item.categoriaId}>
                        {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : resumoPessoas.length === 0 ? (
              <p className="empty-state">Nenhuma conta do casal encontrada -- tente novamente em instantes.</p>
            ) : (
              resumoPessoas.map((pessoa) => (
                <section key={pessoa.usuarioId} className="card">
                  <h2 className="section-title">
                    {primeiroNome(pessoa.email)} -- {formatarValorEmReais(pessoa.totalCentavos)}
                  </h2>
                  {pessoa.categorias.length === 0 ? (
                    <p className="hint">Nenhum gasto resolvido nesta competência.</p>
                  ) : (
                    <ul className="card-list">
                      {pessoa.categorias.map((item) => (
                        <li key={item.categoriaId}>
                          {item.nome} -- {formatarValorEmReais(item.totalCentavos)}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))
            )}
          </div>

          {pendentes.length > 0 && (
            <div className="lancamentos-pendentes">
              <section className="card">
                <h2 className="section-title">
                  Pendente de revisão -- {formatarValorEmReais(totalPendentes)}
                </h2>
                {algumFiltroAtivo && (
                  <p className="hint" style={{ marginBottom: '0.75rem' }}>
                    Titular ainda não identificado -- independe dos filtros de pessoa e categoria acima.
                  </p>
                )}
                <ul className="card-list">
                  {pendentes.map((item) => (
                    <li key={item.id}>
                      {formatarData(item.data)} -- {item.estabelecimento} -- {formatarValorEmReais(item.valorCentavos)} --{' '}
                      Titular pendente de mapeamento --{' '}
                      <Link href="/cartoes" className="link">
                        Resolver em Cartões
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>

        <div className="lancamentos-lista">
          {lancamentosFiltrados.length === 0 ? (
            <p className="empty-state">
              {algumFiltroAtivo ? 'Nenhum lançamento encontrado para este filtro.' : 'Nenhum lançamento nesta competência.'}
            </p>
          ) : (
            <ul className="card-list">
              {lancamentosFiltrados.map((item) => {
                const { titularUsuarioId, responsavelId, ...dadosLancamento } = item;
                const titularNome = titularUsuarioId !== null ? (nomePorConta.get(titularUsuarioId) ?? null) : null;
                // Repasse (Epic 6, Story 6.1): "outro" é sempre a mesma
                // pessoa relativa ao titular do cartão, seja como alvo do
                // toggle (não repassado) ou como destinatário já exibido no
                // badge (repassado) -- só existe quando titular está mapeado
                // e as duas contas do casal foram carregadas com sucesso.
                // `contas.length === 2` explícito (não só `.find`) -- o casal
                // é sempre exatamente duas contas (FR1, sem auto-cadastro),
                // mas se `listarContasCasal()` alguma vez degradar para uma
                // contagem diferente, a ação de repasse fica indisponível em
                // vez de `.find` escolher uma conta arbitrária como alvo
                // (achado repetido nas duas rodadas de review).
                const outroConta =
                  titularUsuarioId !== null && contas.length === 2
                    ? contas.find((conta) => conta.id !== titularUsuarioId)
                    : undefined;
                const outroContaId = outroConta?.id ?? null;
                const outroNome = outroConta ? primeiroNome(outroConta.email) : null;
                // Nome exibido no badge resolvido direto por `responsavelId`
                // via `nomePorConta` (mesmo mapa do titular-badge) -- robusto
                // mesmo se `contas`/`outroConta` degradar, diferente do alvo
                // do toggle acima (que precisa mesmo da semântica "a outra
                // das duas contas"). Achado do review pass 1 (Edge Case Hunter).
                const destinatarioNome = responsavelId !== null ? (nomePorConta.get(responsavelId) ?? null) : null;
                return (
                  <LancamentoItem
                    key={item.id}
                    item={{
                      ...dadosLancamento,
                      titularNome,
                      repassado: responsavelId !== null,
                      outroContaId,
                      outroNome,
                      destinatarioNome,
                    }}
                    categorias={categorias}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
