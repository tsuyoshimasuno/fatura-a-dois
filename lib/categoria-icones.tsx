// Catálogo fechado dos 7 ícones de categoria que o casal pode escolher
// (spec-icone-categoria-escolhido.md) -- ponto único de verdade sobre quais
// chaves existem, reaproveitado tanto pelo picker do formulário
// (app/(app)/categorias/_components/*) quanto pela renderização em
// `lancamento-item.tsx`. Cada SVG segue exatamente a convenção visual já
// usada para os ícones de lápis/repasse em `lancamento-item.tsx`: viewBox
// "0 0 24 24", fill="none", stroke="currentColor", strokeWidth="2",
// strokeLinecap/strokeLinejoin="round", `aria-hidden="true"` no próprio
// <svg> -- o rótulo acessível fica sempre no elemento pai (`.category-icon`
// em lancamento-item.tsx, o `<label>`/botão do picker no formulário), nunca
// no SVG em si.
//
// Enum de 7 chaves como `const` array TypeScript + validação por
// `.includes()` (server/categorizacao/gerenciar-categorias.ts), não
// `pgEnum` do Drizzle -- evita fricção de migration para adicionar uma 8ª
// chave numa rodada futura (Design Notes da spec). Paleta fechada: não
// adicionar um 8º ícone nesta rodada.
import type { ComponentType, SVGProps } from 'react';

export const ICONES_CATEGORIA_VALIDOS = [
  'mercado',
  'transporte',
  'saude',
  'lazer',
  'moradia',
  'contas',
  'outro',
] as const;

export type IconeCategoriaChave = (typeof ICONES_CATEGORIA_VALIDOS)[number];

// Rótulo acessível em português por chave -- usado tanto no `aria-label` de
// cada botão do picker (criar-categoria-form.tsx/categoria-item.tsx) quanto
// no `aria-label`/`title` do círculo em lancamento-item.tsx.
export const ICONE_CATEGORIA_LABEL: Record<IconeCategoriaChave, string> = {
  mercado: 'Mercado',
  transporte: 'Transporte',
  saude: 'Saúde',
  lazer: 'Lazer',
  moradia: 'Moradia',
  contas: 'Contas',
  outro: 'Outro',
};

type IconeSvgProps = SVGProps<SVGSVGElement>;

function IconeMercado(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8Z M9 8V6a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeTransporte(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 16h14M6 16l1.2-4.8A2 2 0 0 1 9.1 9.7h5.8a2 2 0 0 1 1.9 1.5L18 16M7.5 16a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm12 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeSaude(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeLazer(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 5v14l11-7L8 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeMoradia(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 11 12 4l8 7M6 10v10h12V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeContas(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 3h8l4 4v14H7V3Zm8 0v4h4M9 12h6M9 16h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeOutro(props: IconeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M11 4H5a1 1 0 0 0-1 1v6l9.5 9.5a2 2 0 0 0 2.8 0l4.7-4.7a2 2 0 0 0 0-2.8L11 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mapa chave -> componente, ponto único usado tanto pelo picker do
// formulário quanto pela renderização em `lancamento-item.tsx`.
export const ICONE_CATEGORIA_COMPONENTE: Record<IconeCategoriaChave, ComponentType<IconeSvgProps>> = {
  mercado: IconeMercado,
  transporte: IconeTransporte,
  saude: IconeSaude,
  lazer: IconeLazer,
  moradia: IconeMoradia,
  contas: IconeContas,
  outro: IconeOutro,
};

// Type guard central -- mesma checagem usada por `validarIcone` no servidor
// (server/categorizacao/gerenciar-categorias.ts), reaproveitada aqui para
// evitar duas listas de chaves divergindo com o tempo.
export function ehIconeCategoriaValido(valor: string): valor is IconeCategoriaChave {
  return (ICONES_CATEGORIA_VALIDOS as readonly string[]).includes(valor);
}
