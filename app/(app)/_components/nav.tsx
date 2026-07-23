'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Upload não é item de sidebar (resolução tomada em
// spec-snowui-sidebar-shell.md -- fica acessível só via link em Início).
const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/lancamentos', label: 'Lançamentos' },
  { href: '/cartoes', label: 'Cartões' },
  { href: '/categorias', label: 'Categorias' },
  { href: '/parcelas', label: 'Parcelas' },
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
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  ref={index === 0 ? primeiroLinkRef : undefined}
                  aria-current={ativo ? 'page' : undefined}
                  className={ativo ? 'sidebar-nav-link ativo' : 'sidebar-nav-link'}
                  onClick={() => setMenuAberto(false)}
                >
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
    </>
  );
}
