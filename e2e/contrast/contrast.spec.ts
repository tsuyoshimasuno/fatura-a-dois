import { expect, test } from '@playwright/test';
import { contrastRatio } from '../lib/wcag-contrast';

// Checa os pares texto/fundo (e borda/fundo) documentados em app/globals.css
// contra o mínimo WCAG AA aplicável, em claro e escuro, lendo os valores reais
// resolvidos no DOM (getComputedStyle em :root) -- não hardcoding os hex aqui,
// para que a suíte pegue drift de verdade se algum token mudar sem
// reverificação de contraste (o gap que motivou o achado pré-existente
// registrado em deferred-work.md > spec-snowui-paleta-de-cores.md).
//
// Todos os tokens abaixo são globais (:root / @media prefers-color-scheme),
// então qualquer rota pública serve para lê-los -- /login evita depender da
// fixture de auth (e2e/fixtures/auth.ts) só para isto.

type ParDeContraste = {
  id: string;
  nome: string;
  fgVar: string;
  bgVar: string;
  minimo: number;
};

const PARES: ParDeContraste[] = [
  { id: 'accent-fg-on-accent', nome: 'accent-foreground sobre accent (botão primário)', fgVar: '--accent-foreground', bgVar: '--accent', minimo: 4.5 },
  { id: 'danger-on-surface', nome: 'danger sobre surface', fgVar: '--danger', bgVar: '--surface', minimo: 4.5 },
  { id: 'danger-on-background', nome: 'danger sobre background', fgVar: '--danger', bgVar: '--background', minimo: 4.5 },
  { id: 'accent-fg-on-pending', nome: 'accent-foreground sobre pending (.badge-pending)', fgVar: '--accent-foreground', bgVar: '--pending', minimo: 4.5 },
  { id: 'accent-fg-on-category-1', nome: 'accent-foreground sobre category-color-1 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-1', minimo: 4.5 },
  { id: 'accent-fg-on-category-2', nome: 'accent-foreground sobre category-color-2 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-2', minimo: 4.5 },
  { id: 'accent-fg-on-category-3', nome: 'accent-foreground sobre category-color-3 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-3', minimo: 4.5 },
  { id: 'accent-fg-on-category-4', nome: 'accent-foreground sobre category-color-4 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-4', minimo: 4.5 },
  { id: 'accent-fg-on-category-5', nome: 'accent-foreground sobre category-color-5 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-5', minimo: 4.5 },
  { id: 'accent-fg-on-category-6', nome: 'accent-foreground sobre category-color-6 (.category-icon)', fgVar: '--accent-foreground', bgVar: '--category-color-6', minimo: 4.5 },
  { id: 'muted-fg-on-background', nome: 'muted-foreground sobre background', fgVar: '--muted-foreground', bgVar: '--background', minimo: 4.5 },
  { id: 'muted-fg-on-surface', nome: 'muted-foreground sobre surface', fgVar: '--muted-foreground', bgVar: '--surface', minimo: 4.5 },
  { id: 'border-on-surface', nome: 'border sobre surface (elemento gráfico)', fgVar: '--border', bgVar: '--surface', minimo: 3.0 },
  { id: 'border-on-background', nome: 'border sobre background (elemento gráfico)', fgVar: '--border', bgVar: '--background', minimo: 3.0 },
];

const MODOS_DE_COR = ['light', 'dark'] as const;

// Gaps já conhecidos e documentados em
// bmad-output/implementation-artifacts/deferred-work.md (source_spec
// spec-snowui-paleta-de-cores.md) -- não são bug desta story (Boundaries ->
// Block If do spec-7-1-suite-qa-automatizada.md). Marcados com `test.fail()`
// abaixo: a suíte continua reportando o número real (documentando o baseline),
// mas não conta como falha nova/inesperada da suíte.
//
// Chaveado por `id` estável (não pelo `nome` em prosa, achado real do review
// adversarial -- reescrever o rótulo legível não pode dessincronizar
// silenciosamente esta lista da suíte).
const GAPS_CONHECIDOS = new Set<string>([
  'accent-fg-on-pending::light', // ~3.27:1, ver deferred-work.md
  'border-on-surface::light', // ~1.20:1, ver deferred-work.md
  'border-on-background::light', // ~1.26:1, ver deferred-work.md
]);

for (const colorScheme of MODOS_DE_COR) {
  test.describe(`contraste WCAG AA -- modo ${colorScheme}`, () => {
    for (const par of PARES) {
      const chaveGap = `${par.id}::${colorScheme}`;
      const isGapConhecido = GAPS_CONHECIDOS.has(chaveGap);

      test(`${par.nome} (mínimo ${par.minimo}:1)`, async ({ page }) => {
        test.fail(
          isGapConhecido,
          'Gap de contraste pré-existente e já documentado em deferred-work.md -- não é bug desta story, só baseline.',
        );

        await page.emulateMedia({ colorScheme });
        await page.goto('/login');

        const [fg, bg] = await page.evaluate(
          ([fgVar, bgVar]) => {
            const estilos = getComputedStyle(document.documentElement);
            return [estilos.getPropertyValue(fgVar).trim(), estilos.getPropertyValue(bgVar).trim()];
          },
          [par.fgVar, par.bgVar] as [string, string],
        );

        const ratio = contrastRatio(fg, bg);

        expect(
          ratio,
          `${par.nome} (${colorScheme}): ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, mínimo exigido ${par.minimo}:1`,
        ).toBeGreaterThanOrEqual(par.minimo);
      });
    }
  });
}
