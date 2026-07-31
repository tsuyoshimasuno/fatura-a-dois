'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Home, Receipt, CreditCard, Tag, CalendarClock } from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

// Upload não é item de sidebar (resolução tomada em
// spec-snowui-sidebar-shell.md -- fica acessível só via link em Início).
// `icon` (spec-8-1-chrome-compartilhado-icones-e-tokens-base.md, Design
// Notes) -- mapeamento ícone→item sugerido no spec, `lucide-react` (já
// instalado, zero uso antes desta story). `aria-hidden="true"` no `<Icon>`
// abaixo em ambos os pontos de renderização: o rótulo de texto já é o nome
// acessível do link, não duplicar.
const LINKS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/lancamentos', label: 'Lançamentos', icon: Receipt },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/categorias', label: 'Categorias', icon: Tag },
  { href: '/parcelas', label: 'Parcelas', icon: CalendarClock },
];

type NavProps = {
  pendentesCartoes?: number;
  pendentesLancamentos?: number;
};

// Contagem de pendência por rota de nav -- só "Cartões" e "Lançamentos" têm
// badge (spec-ux-dashboard-inicial.md); qualquer outro link nunca exibe.
export function Nav({ pendentesCartoes = 0, pendentesLancamentos = 0 }: NavProps) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const primeiroLinkRef = useRef<HTMLAnchorElement>(null);
  const botaoHamburguerRef = useRef<HTMLButtonElement>(null);

  const badgePorRota: Record<string, number> = {
    '/cartoes': pendentesCartoes,
    '/lancamentos': pendentesLancamentos,
  };

  // Ajusta o estado durante a renderização (padrão recomendado pelo React
  // para "resetar estado quando uma prop muda") em vez de useEffect -- fecha
  // o menu em qualquer mudança de rota, não só clique nos <Link>, cobrindo
  // navegação via voltar/avançar do navegador sem o onClick de nenhum link.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setMenuAberto(false);
  }

  // Mover o foco para o primeiro link é um efeito colateral imperativo de DOM
  // (não um reset de estado derivado de prop, como o bloco acima) --
  // useEffect é o padrão correto aqui. Só dispara a partir de uma ação
  // explícita do usuário (tocar o hambúrguer, que só existe/é clicável em
  // mobile): em desktop a sidebar já está sempre visível e `menuAberto` nunca
  // vira `true`, então este efeito nunca move o foco sem interação.
  //
  // A devolução de foco ao fechar NÃO mora mais aqui (bad_spec repair pass
  // 2): um efeito reativo a `menuAberto` virando `false` disparava em
  // QUALQUER fechamento, inclusive clique num link de navegação (usuário já
  // está saindo da página) e navegação via voltar/avançar do navegador --
  // devolver o foco ao hambúrguer nesses casos é uma regressão, não um
  // benefício. Agora só os dois handlers que de fato motivam devolver o foco
  // (Escape, clique no scrim -- abaixo) chamam `botaoHamburguerRef.current?.
  // focus()` diretamente.
  useEffect(() => {
    if (menuAberto) {
      primeiroLinkRef.current?.focus();
    }
  }, [menuAberto]);

  // Escape fecha o menu independente de onde o foco está -- listener em
  // `document`, não mais `onKeyDown` só dentro de `<nav>` (bad_spec repair
  // pass 1): o scrim é irmão do `<nav>`, não descendente, então um
  // `onKeyDown` só no `<nav>` nunca captura Escape com foco no scrim.
  // Adiciona/remove o listener só enquanto o painel está aberto. Devolve o
  // foco ao botão hambúrguer explicitamente (bad_spec repair pass 2) -- este
  // é um dos dois fechamentos (junto do clique no scrim) que motivam isso.
  useEffect(() => {
    if (!menuAberto) return;

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuAberto(false);
        botaoHamburguerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', fecharComEscape);
    return () => document.removeEventListener('keydown', fecharComEscape);
  }, [menuAberto]);

  // Trava o scroll do body enquanto o painel mobile está aberto (bad_spec
  // repair pass 2) -- sem isso, o conteúdo por trás do scrim rola
  // visivelmente enquanto o painel está aberto. Só tem efeito prático em
  // mobile (`menuAberto` nunca vira `true` em desktop, ver comentário acima),
  // mas a propriedade não causa nenhum efeito colateral se aplicada em
  // desktop mesmo assim. Limpa tanto no cleanup do efeito quanto quando
  // `menuAberto` volta a `false`.
  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  // Fecha o painel automaticamente se o viewport cruzar para desktop
  // (>=768px) enquanto ele está aberto (bad_spec repair pass 3) -- sem isso,
  // redimensionar a janela (ou girar/expandir um device emulator) com o
  // painel mobile aberto deixava `menuAberto` preso em `true`: o scroll-lock
  // do body (efeito acima) nunca era revertido e a ref do hambúrguer virava
  // alvo de foco num elemento `display:none` nesse breakpoint. Não move
  // foco algum aqui -- em desktop não há painel/scrim/hambúrguer mobile para
  // receber foco (a barra `.sidebar-toggle` some via CSS acima de 768px).
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    function fecharAoCruzarParaDesktop(event: MediaQueryListEvent) {
      if (event.matches) {
        setMenuAberto(false);
      }
    }

    mediaQuery.addEventListener('change', fecharAoCruzarParaDesktop);
    return () => mediaQuery.removeEventListener('change', fecharAoCruzarParaDesktop);
  }, []);

  return (
    <>
      <div className="sidebar-toggle">
        <span className="sidebar-brand">Fatura a Dois</span>
        <button
          type="button"
          ref={botaoHamburguerRef}
          className="sidebar-toggle-button"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="sidebar-drawer"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span className="sidebar-toggle-bar" aria-hidden="true" />
          <span className="sidebar-toggle-bar" aria-hidden="true" />
          <span className="sidebar-toggle-bar" aria-hidden="true" />
        </button>
      </div>

      {/* Scrim do painel off-canvas mobile -- clique fora fecha. Sem nome
          acessível/foco próprio (bad_spec repair pass 1): Escape (listener em
          `document` acima) e o botão hambúrguer (sempre visível/clicável,
          ver z-index em globals.css) já cobrem o fechamento por teclado e
          mouse/toque sem duplicar "Fechar menu" para leitor de tela. Não é
          role="dialog"/trap de foco: é disclosure de navegação, não modal
          (ver spec-snowui-sidebar-shell.md). Devolve o foco ao botão
          hambúrguer explicitamente (bad_spec repair pass 2) -- este é o
          segundo dos dois fechamentos (junto do Escape) que motivam isso. */}
      {menuAberto && (
        <div
          className="sidebar-scrim"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => {
            setMenuAberto(false);
            botaoHamburguerRef.current?.focus();
          }}
        />
      )}

      <nav id="sidebar-drawer" className={menuAberto ? 'sidebar aberto' : 'sidebar'}>
        <div className="sidebar-brand-row">
          <span className="sidebar-brand">Fatura a Dois</span>
          <Link
            href="/upload"
            className="sidebar-upload-link"
            aria-label="Enviar nova fatura"
            onClick={() => setMenuAberto(false)}
          >
            +
          </Link>
        </div>

        <ul className="sidebar-nav-list">
          {LINKS.map((link, index) => {
            const ativo = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            const badge = badgePorRota[link.href] ?? 0;
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  ref={index === 0 ? primeiroLinkRef : undefined}
                  aria-current={ativo ? 'page' : undefined}
                  className={ativo ? 'sidebar-nav-link ativo' : 'sidebar-nav-link'}
                  onClick={() => setMenuAberto(false)}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden="true" className="nav-icon" />
                  {link.label}
                  {badge > 0 && (
                    <span className="badge-pending" aria-label={`${badge} pendente(s)`}>
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Seletor de conta do casal -- puramente visual (ver
            spec-snowui-sidebar-shell.md): nenhum onClick, nenhum estado, não
            é botão nem link. Não introduz "espaços" separados por pessoa. */}
        <div className="sidebar-footer">
          <span className="sidebar-couple-avatars" aria-hidden="true">
            <span className="sidebar-couple-avatar">T</span>
            <span className="sidebar-couple-avatar">M</span>
          </span>
          <span className="sidebar-couple-names">Tsuyoshi &amp; Milena</span>
        </div>
      </nav>

      {/* Sidebar desktop (>=768px, componente shadcn vendorizado, Story 7.3
          spec-7-3-shell-sidebar-corte-atomico.md) -- elemento IRMÃO do
          <nav> mobile acima, nenhuma linha do bloco mobile foi alterada.
          `collapsible="none"` nunca colapsa nem troca para `Sheet`
          (mobile é tratado inteiramente pelo bloco acima); `hidden md:flex`
          garante que só um dos dois fica visível por vez (CSS decide, não
          JS -- mesmo padrão de `.sidebar-toggle`/`.sidebar` em globals.css,
          que escondem o `<nav>` mobile a partir de 768px).

          `className="contents"` no Provider -- o wrapper que o shadcn gera
          (`min-h-svh w-full`) empurraria `.app-content` (irmão, em
          app/(app)/layout.tsx) para baixo se participasse do layout flex de
          `.app-shell`; `display: contents` remove essa caixa da árvore de
          layout sem afetar a herança de `--sidebar-width` (custom property,
          herda normalmente por elemento). `fixed left-0 top-0 h-screen`
          no `<Sidebar>` reproduz o posicionamento que `.sidebar` (mobile)
          tinha antes desta story -- agora escopado só a >=768px via
          `hidden md:flex`.

          `role="navigation"`/`aria-label` (achado real do review adversarial):
          o `collapsible="none"` do componente vendorizado renderiza um
          `<div>` puro, sem a semântica de landmark que o `<nav>` mobile já
          tinha -- adicionado explicitamente para não perder isso em desktop.
          `gap-6` reaproveita o mesmo espaçamento entre seções (1.5rem) que
          `.sidebar` (mobile) já usa via `gap: 1.5rem` -- o padding p-2/gap-2
          default do shadcn (achado do review) ficava perceptivelmente mais
          apertado que o resto do produto. */}
      <SidebarProvider className="contents">
        <Sidebar
          collapsible="none"
          role="navigation"
          aria-label="Navegação principal"
          className="hidden md:flex fixed left-0 top-0 z-20 h-screen gap-6 border-r border-sidebar-border overflow-y-auto"
        >
          <SidebarHeader className="flex-row items-center justify-between px-4 pt-6">
            <span className="sidebar-brand">Fatura a Dois</span>
            {/* Mesmo link de atalho pra /upload que o painel mobile já tem
                (achado real do review adversarial -- sem ele, depois que a
                fatura do mês é enviada, "Início" deixa de linkar pra lá e o
                desktop ficava sem nenhum caminho de navegação até /upload). */}
            <Link
              href="/upload"
              className="sidebar-upload-link"
              aria-label="Enviar nova fatura"
            >
              +
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {LINKS.map((link) => {
                    const ativo =
                      link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                    const badge = badgePorRota[link.href] ?? 0;
                    const Icon = link.icon;
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={ativo}
                          // Indicador de borda esquerda colorida (achado real
                          // do review adversarial): sem isso, hover e item
                          // ativo usavam o mesmo `bg-sidebar-accent`,
                          // diferenciados só por font-weight -- mais fraco
                          // que o indicador já aprovado no painel mobile
                          // (`.sidebar-nav-link.ativo`, borda de 3px). Espaço
                          // reservado sempre (border-l-transparent) pra não
                          // deslocar o layout ao ativar.
                          //
                          // `text-muted-foreground` + override quando ativo
                          // (achado confirmado via getComputedStyle, não
                          // suposição): sem isso, todo item (ativo ou não)
                          // herdava `text-sidebar-foreground` do container
                          // (mesmo tom de `--foreground` usado no item
                          // ativo) -- o painel mobile já aprovado usa
                          // `--muted-foreground` pros itens inativos e só
                          // `--foreground` no ativo (`.sidebar-nav-link`
                          // vs `.sidebar-nav-link.ativo`), diferença real de
                          // peso visual que este ajuste reproduz.
                          className="border-l-[3px] border-l-transparent text-muted-foreground data-[active=true]:border-l-sidebar-primary data-[active=true]:text-sidebar-accent-foreground"
                        >
                          <Link href={link.href} aria-current={ativo ? 'page' : undefined}>
                            {/* `size-[18px]!` sobrescreve `[&>svg]:size-4`
                                (1rem/16px, `sidebarMenuButtonVariants` em
                                components/ui/sidebar.tsx) -- essa regra do
                                componente vendorizado mira qualquer `<svg>`
                                filho direto do botão e vence o atributo
                                `width`/`height` que o `size={18}` do
                                lucide-react define (atributo de apresentação
                                perde para regra de CSS, mesmo sem
                                `!important`), então sem o `!` aqui o ícone
                                renderiza a 16px no desktop enquanto o painel
                                mobile (sem essa regra concorrente) renderiza
                                a 18px -- divergência que a Story 8.1 proíbe
                                explicitamente. `gap-2` do próprio botão já
                                cuida do espaçamento -- nenhuma margem extra
                                aqui (diferente de `.sidebar-nav-link
                                .nav-icon` no mobile). */}
                            <Icon
                              size={18}
                              strokeWidth={2}
                              aria-hidden="true"
                              className="nav-icon size-[18px]!"
                            />
                            <span>{link.label}</span>
                            {/* Reaproveita `.badge-pending` (mesma pill
                                laranja/`--pending`) em vez de
                                `SidebarMenuBadge` do componente vendorizado
                                (2 achados reais do follow-up review: (1)
                                `SidebarMenuBadge` não tem nenhum `background`,
                                só herda `text-sidebar-foreground` -- a
                                contagem aparecia sem cor de atenção, sem pill,
                                diferente do mobile; (2) `SidebarMenuBadge` é
                                irmão do link, não filho -- o `aria-label`
                                ficava fora do nome acessível do link, então
                                tabular até o item no desktop não anunciava a
                                pendência como o mobile já anuncia). Colocar o
                                badge DENTRO do `<Link>`, igual ao mobile,
                                resolve os dois de uma vez. */}
                            {badge > 0 && (
                              <span className="badge-pending" aria-label={`${badge} pendente(s)`}>
                                {badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          {/* Sem border-t/padding-top no wrapper: a própria classe reaproveitada
              `.sidebar-footer` abaixo já define isso (border-top, padding-top,
              margin-top: auto) -- duplicar aqui geraria duas bordas empilhadas. */}
          <SidebarFooter className="px-4 pb-6">
            <div className="sidebar-footer">
              <span className="sidebar-couple-avatars" aria-hidden="true">
                <span className="sidebar-couple-avatar">T</span>
                <span className="sidebar-couple-avatar">M</span>
              </span>
              <span className="sidebar-couple-names">Tsuyoshi &amp; Milena</span>
            </div>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </>
  );
}
