'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/lancamentos', label: 'Lançamentos' },
  { href: '/upload', label: 'Upload' },
  { href: '/categorias', label: 'Categorias' },
  { href: '/cartoes', label: 'Cartões' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <span className="app-nav-title">Fatura a Dois</span>
      <ul className="app-nav-list">
        {LINKS.map((link) => {
          const ativo = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={ativo ? 'page' : undefined}
                className={ativo ? 'app-nav-link ativo' : 'app-nav-link'}
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
