'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/lancamentos', label: 'Lançamentos' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/parcelas', label: 'Parcelas' },
  { href: '/upload', label: 'Upload' },
  { href: '/categorias', label: 'Categorias' },
  { href: '/cartoes', label: 'Cartões' },
];

export function Nav() {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  // Ajusta o estado durante a renderização (padrão recomendado pelo React
  // para "resetar estado quando uma prop muda") em vez de useEffect -- fecha
  // o menu em qualquer mudança de rota, não só clique nos <Link>, cobrindo
  // navegação via voltar/avançar do navegador sem o onClick de nenhum link.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setMenuAberto(false);
  }

  return (
    <nav className="app-nav">
      <span className="app-nav-title">Fatura a Dois</span>
      <button
        type="button"
        className="app-nav-toggle"
        aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuAberto}
        aria-controls="app-nav-list"
        onClick={() => setMenuAberto((aberto) => !aberto)}
      >
        <span className="app-nav-toggle-bar" aria-hidden="true" />
        <span className="app-nav-toggle-bar" aria-hidden="true" />
        <span className="app-nav-toggle-bar" aria-hidden="true" />
      </button>
      <ul id="app-nav-list" className={menuAberto ? 'app-nav-list aberto' : 'app-nav-list'}>
        {LINKS.map((link) => {
          const ativo = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={ativo ? 'page' : undefined}
                className={ativo ? 'app-nav-link ativo' : 'app-nav-link'}
                onClick={() => setMenuAberto(false)}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
