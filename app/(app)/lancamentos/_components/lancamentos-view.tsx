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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mesma string de classes visuais de `components/ui/input.tsx` (altura,
// borda, radius, padding, anel de foco, estados disabled, `aria-invalid`) --
// sem os modificadores `file:*`/`selection:*`, que não têm efeito num
// `<select>`. Copiada (não importada) por não haver módulo compartilhado de
// estilos ainda -- mesma decisão das Stories 7.7/7.9 (remover-categoria-form.tsx,
// upload/page.tsx). `<select>` continua nativo (nunca vira Radix Select) para
// preservar o picker do SO no mobile; só ganha paridade visual com o Input.
const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30';

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
            <select name="mes" defaultValue={String(mes)} className={selectClassName}>
              {MESES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Ano
            <select name="ano" defaultValue={String(ano)} className={selectClassName}>
              {anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Filtrar</Button>
        </form>
        <label className="field">
          Pessoa
          <select value={pessoaSelecionada ?? ''} onChange={handlePessoaChange} className={selectClassName}>
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
            className={selectClassName}
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
        {/* `tabIndex`/`role="region"` incondicionais mesmo `.lancamentos-painel`
            só sendo de fato rolável (overflow-y: auto + max-height) dentro de
            `@media (min-width: 768px)` -- fecha o gap axe-core real
            `scrollable-region-focusable` (candidato desde a Story 7.1) no
            desktop, onde o painel é genuinamente rolável. Achado do review
            adversarial: no mobile (coluna única, sem rolagem própria), isto
            vira uma parada de Tab sem propósito operável -- tentativa de
            tornar isso condicional via `matchMedia` + `useEffect` foi
            revertida: o axe-core roda antes do efeito React comitar (a
            violação real reaparecia no teste), então o custo de
            complexidade/fragilidade do toggle client-side não se pagou
            contra o benefício de uma parada de Tab a mais e inofensiva no
            mobile. Trade-off aceito conscientemente, não uma omissão. */}
        <div className="lancamentos-painel" tabIndex={0} role="region" aria-label="Resumo e pendentes">
          <div className="lancamentos-resumo">
            {categoriaSelecionada !== 'todas' ? (
              <Card>
                <CardHeader>
                  <CardTitle asChild className="text-[22.5px] font-bold">
                    <h2>Total -- {formatarValorEmReais(totalFiltrado)}</h2>
                  </CardTitle>
                </CardHeader>
                {/* CardContent só renderiza quando há algo pra mostrar --
                    achado real do review adversarial: Card usa `flex
                    flex-col gap-6` entre CardHeader/CardContent como
                    siblings, então um CardContent presente mas vazio (caso
                    comum: nenhum lançamento com titular pendente) ainda
                    reservava o gap de 24px abaixo do título, um espaço em
                    branco que o `<section className="card">` original nunca
                    tinha. */}
                {totalFiltradoIncluiTitularPendente && (
                  <CardContent>
                    <p className="hint">Inclui lançamento(s) com titular ainda não identificado.</p>
                  </CardContent>
                )}
              </Card>
            ) : pessoaSelecionada ? (
              <Card>
                <CardHeader>
                  <CardTitle asChild className="text-[22.5px] font-bold">
                    <h2>
                      {nomePorConta.get(pessoaSelecionada) ?? 'Pessoa'} --{' '}
                      {formatarValorEmReais(pessoaResumo?.totalCentavos ?? 0)}
                    </h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            ) : visao === 'combinada' ? (
              // card-highlight (spec-snowui-lancamentos-highlight-e-icone-
              // categoria.md): esta branch só é alcançada quando
              // `pessoaSelecionada === null` e `categoriaSelecionada ===
              // 'todas'` (as duas condições já filtram as branches acima),
              // exatamente o cruzamento "visão combinada sem filtro" do I/O
              // Matrix -- não precisa repetir a checagem aqui. `bg-[var(--highlight)]`
              // substitui `.card-highlight` (que só sobrescrevia `background`,
              // ver globals.css) -- ver Design Notes do spec-7-10 sobre por
              // que um utility arbitrário na mesma layer do Card é necessário
              // em vez de reusar a classe legada (`@layer base` perde para
              // `@layer utilities` do Card, mesma causa raiz do bug de
              // font-weight das Stories 7.6/7.8). Achado real do review
              // adversarial: sem `dark:` explícito, o `dark:bg-[var(--surface)]`
              // do próprio `Card` (também `@layer utilities`, batelado no MESMO
              // bloco `@media (prefers-color-scheme: dark)` que qualquer outra
              // classe `dark:` do app) vencia silenciosamente em modo escuro --
              // confirmado via `getComputedStyle` real (fundo caía pra
              // `--surface` em vez de `--highlight`). `!` (important) nos dois
              // lados, mesma técnica já usada na Story 7.6 para o mesmo tipo de
              // ambiguidade de ordem entre duas classes `dark:`.
              <Card className="bg-[var(--highlight)]! dark:bg-[var(--highlight)]!">
                <CardHeader>
                  <CardTitle asChild className="text-[22.5px] font-bold">
                    <h2>Casal -- {formatarValorEmReais(totalCombinado)}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            ) : resumoPessoas.length === 0 ? (
              <p className="empty-state">Nenhuma conta do casal encontrada -- tente novamente em instantes.</p>
            ) : (
              resumoPessoas.map((pessoa) => (
                <Card key={pessoa.usuarioId}>
                  <CardHeader>
                    <CardTitle asChild className="text-[22.5px] font-bold">
                      <h2>
                        {primeiroNome(pessoa.email)} -- {formatarValorEmReais(pessoa.totalCentavos)}
                      </h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {pendentes.length > 0 && (
            <div className="lancamentos-pendentes">
              <Card>
                <CardHeader>
                  <CardTitle asChild className="text-[22.5px] font-bold">
                    <h2>Pendente de revisão -- {formatarValorEmReais(totalPendentes)}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
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
