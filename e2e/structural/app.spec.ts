import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/auth';

// Rotas reais do grupo `(app)` -- exige sessão autenticada via perfil
// persistente (ver e2e/fixtures/auth.ts). NÃO inclui `/gastos`: é só
// `permanentRedirect` para `/lancamentos` (ver app/(app)/gastos/page.tsx),
// não uma tela própria a testar (Boundaries do spec-7-1).
const ROTAS = [
  { path: '/', label: 'inicio' },
  { path: '/upload', label: 'upload' },
  { path: '/cartoes', label: 'cartoes' },
  { path: '/categorias', label: 'categorias' },
  { path: '/lancamentos', label: 'lancamentos' },
  { path: '/parcelas', label: 'parcelas' },
];

const MODOS_DE_COR = ['light', 'dark'] as const;

// Mesmo critério de bloqueio de e2e/structural/auth.spec.ts -- "critical" e
// "serious" bloqueiam, "moderate"/"minor" não (ver Acceptance Criteria do
// spec-7-1-suite-qa-automatizada.md).
const IMPACTOS_BLOQUEANTES = new Set(['critical', 'serious']);

// Gaps de acessibilidade pré-existentes, achados reais mas não causados por
// esta story (Boundaries -> Block If do spec-7-1) -- todos registrados em
// deferred-work.md. Filtrados nó a nó, nunca a regra inteira, para não
// mascarar uma futura violação real de qualquer um destes IDs em outro
// elemento:
// - `color-contrast` em `.badge-pending` (~3.27:1 no claro, ver
//   spec-snowui-paleta-de-cores.md / contrast.spec.ts).
// - `label` no input `name="nome"` do form inline "+ Nova categoria" em
//   `lancamento-item.tsx` (mesmo padrão de input sem label que existia em
//   `categoria-item.tsx`/`criar-categoria-form.tsx` antes da Story 7.7 --
//   aqueles dois JÁ FORAM corrigidos nessa story, mas este terceiro caso em
//   `/lancamentos` continua sem label real; candidato a correção na Story
//   7.10, junto da migração de `/lancamentos`). Achado real da própria
//   Story 7.7: remover este filtro cegamente ao corrigir os 2 primeiros
//   casos reabriria um blind spot -- o filtro casa por HTML, não por
//   arquivo, então continua necessário até o terceiro caso ser corrigido.
// - `aria-prohibited-attr` em `.category-icon` (`aria-label` num `<span>`
//   sem `role`) -- candidato a correção na Story 7.10 (migração de
//   `/lancamentos`).
// - `scrollable-region-focusable` em `.lancamentos-painel` (painel rolável
//   do layout de 2 colunas, sem `tabindex`) -- idem, Story 7.10.
//
// Achado real do review adversarial: o `label` original filtrava por
// substring `target` (`input[value=`), que casaria com QUALQUER input com
// atributo `value` em qualquer tela futura, mascarando um achado novo e
// genuíno por coincidência de forma de seletor. Corrigido para checar o
// `html` renderizado do nó (`name="nome"`), que identifica o elemento real
// e específico do bug, não um padrão genérico de seletor.
type GapConhecido = { ruleId: string; soLight?: boolean } & (
  | { targetIncludes: string }
  | { htmlIncludes: string }
);

const GAPS_CONHECIDOS: GapConhecido[] = [
  { ruleId: 'color-contrast', targetIncludes: 'badge-pending', soLight: true },
  { ruleId: 'label', htmlIncludes: 'name="nome" placeholder="Nome da categoria"' },
  { ruleId: 'aria-prohibited-attr', targetIncludes: 'category-icon' },
  { ruleId: 'scrollable-region-focusable', targetIncludes: 'lancamentos-painel' },
];

function noGapConhecido(node: { target: unknown[]; html: string }, gap: GapConhecido): boolean {
  if ('targetIncludes' in gap) {
    return node.target.some((t) => String(t).includes(gap.targetIncludes));
  }
  return node.html.includes(gap.htmlIncludes);
}

function semGapsConhecidos(
  violacoes: import('axe-core').AxeResults['violations'],
  colorScheme: 'light' | 'dark',
) {
  return violacoes
    .map((v) => {
      const gapsDaRegra = GAPS_CONHECIDOS.filter(
        (g) => g.ruleId === v.id && (!g.soLight || colorScheme === 'light'),
      );
      if (gapsDaRegra.length === 0) {
        return v;
      }
      const nodes = v.nodes.filter((n) => !gapsDaRegra.some((g) => noGapConhecido(n, g)));
      return { ...v, nodes };
    })
    .filter((v) => v.nodes.length > 0);
}

async function coletarErrosDeConsole(page: Page): Promise<string[]> {
  const erros: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      erros.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    erros.push(String(err));
  });
  return erros;
}

for (const { path, label } of ROTAS) {
  for (const colorScheme of MODOS_DE_COR) {
    test(`${label} (${colorScheme}) -- smoke + acessibilidade`, async ({ page }) => {
      const errosDeConsole = await coletarErrosDeConsole(page);

      await page.emulateMedia({ colorScheme });
      const response = await page.goto(path);

      expect(response?.ok(), `Navegação para ${path} não retornou 2xx`).toBeTruthy();

      // Sinal de que a fixture de auth quebrou (sessão expirada/perfil
      // inválido) em vez de um bug da rota em si -- ver I/O & Edge-Case
      // Matrix do spec-7-1 ("Rota sem sessão").
      expect(
        page.url(),
        `Redirecionado para /login em ${path} -- sessão da fixture de auth parece ter expirado/quebrado`,
      ).not.toContain('/login');

      expect(
        errosDeConsole,
        `Erro(s) de console em ${path} (${colorScheme}):\n${errosDeConsole.join('\n')}`,
      ).toEqual([]);

      const resultadoAxe = await new AxeBuilder({ page }).analyze();
      const violacoesBloqueantes = semGapsConhecidos(
        resultadoAxe.violations.filter((v) => IMPACTOS_BLOQUEANTES.has(v.impact ?? '')),
        colorScheme,
      );

      expect(
        violacoesBloqueantes,
        `Violação(ões) axe-core crítica/séria em ${path} (${colorScheme}):\n` +
          JSON.stringify(violacoesBloqueantes, null, 2),
      ).toEqual([]);
    });
  }
}
