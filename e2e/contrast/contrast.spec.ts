import { expect, test } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';
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

// Mistura manual alpha-sobre-fundo -- `getComputedStyle` reporta a cor
// especificada (`rgba(r,g,b,a)`), não o resultado já compositado contra o
// fundo, então uma checagem ingênua de `color` vs `background-color`
// ignoraria qualquer opacidade <1 e reportaria um contraste otimista demais.
// Necessário para o teste abaixo (achado real do review adversarial da
// Story 7.9: `text-destructive/90` no `AlertDescription` reduzia o
// contraste real para ~4.06:1 no escuro, abaixo do mínimo AA, mas nenhum
// par de `PARES` acima (que só lê variáveis CSS cruas, sem alpha) pegava
// isso).
function blendAlphaSobreFundo(corComAlpha: string, corDeFundo: string): string {
  const match = corComAlpha.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (!match) throw new Error(`Cor com alpha não reconhecida: "${corComAlpha}"`);
  const [, r, g, b, a] = match;
  const alpha = a === undefined ? 1 : Number(a);
  if (alpha >= 1) return corComAlpha;

  const bgMatch = corDeFundo.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (!bgMatch) throw new Error(`Cor de fundo não reconhecida: "${corDeFundo}"`);
  const [, bgR, bgG, bgB, bgA] = bgMatch;
  // Achado real do review adversarial (Edge Case Hunter): esta função
  // assumia fundo sempre opaco -- o `Card`/`Alert` deste projeto sempre
  // resolvem pra uma cor sólida (nunca transparente), então essa premissa
  // já é verdadeira hoje, mas falhar alto (em vez de misturar errado em
  // silêncio) é mais seguro que assumir opacidade 1 sem checar.
  if (bgA !== undefined && Number(bgA) < 1) {
    throw new Error(
      `Fundo não-opaco não suportado por este helper (alpha=${bgA}): "${corDeFundo}". Composição contra um segundo fundo (ex.: o body) precisaria ser implementada explicitamente.`,
    );
  }

  const blend = (fg: number, bg: number) => Math.round(alpha * fg + (1 - alpha) * bg);
  return `rgb(${blend(Number(r), Number(bgR))}, ${blend(Number(g), Number(bgG))}, ${blend(Number(b), Number(bgB))})`;
}

for (const colorScheme of MODOS_DE_COR) {
  test.describe(`contraste WCAG AA -- modo ${colorScheme}`, () => {
    test(`Alert destructive: texto sobre o próprio fundo (mínimo 4.5:1)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.route('**/auth/v1/token**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
        });
      });
      await page.goto('/login');
      await page.getByLabel('E-mail').fill('usuario-inexistente@example.com');
      await page.getByLabel('Senha').fill('senha-incorreta-123');
      await page.getByRole('button', { name: 'Entrar' }).click();

      const alertDescription = page.locator('[data-slot="alert-description"]').first();
      await expect(alertDescription).toBeVisible();

      const { fg, bg } = await alertDescription.evaluate((el) => {
        // Tailwind v4 resolve modificadores de opacidade (`/90`) via
        // `color-mix()`, que o Chromium computa e reporta em `oklab()`, não
        // `rgb()`/`rgba()` -- um parser de regex simples não entende esse
        // formato. Normaliza para `rgb()` de verdade desenhando a cor num
        // canvas 1x1 e lendo o pixel de volta (o navegador faz a conversão
        // de espaço de cor por nós, funciona para qualquer sintaxe CSS de
        // cor válida, não só oklab).
        function paraRgb(cor: string): string {
          // Achado real do review adversarial (Edge Case Hunter): o navegador
          // ignora silenciosamente `fillStyle` inválido e mantém o valor
          // anterior (preto opaco por padrão) -- sem checar antes, uma cor
          // computada em formato inesperado normalizaria pra preto em vez de
          // falhar alto, mascarando um erro de verdade como um resultado de
          // contraste plausível (mas errado).
          if (!CSS.supports('color', cor)) {
            throw new Error(`Cor computada não reconhecida pelo navegador: "${cor}"`);
          }
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.fillStyle = cor;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        }

        const cs = getComputedStyle(el);
        const alertEl = el.closest('[data-slot="alert"]');
        return {
          fg: paraRgb(cs.color),
          bg: paraRgb(alertEl ? getComputedStyle(alertEl).backgroundColor : getComputedStyle(document.body).backgroundColor),
        };
      });

      const fgEfetivo = blendAlphaSobreFundo(fg, bg);
      const ratio = contrastRatio(fgEfetivo, bg);

      expect(
        ratio,
        `Alert destructive (${colorScheme}): ${fg} (efetivo ${fgEfetivo}) sobre ${bg} = ${ratio.toFixed(2)}:1, mínimo exigido 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

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

// Story 8.1 -- achado real do review adversarial (Blind Hunter): o hover/
// ativo intensificado de `sidebar-nav` (0.05→0.08 claro, 0.06→0.1 escuro no
// painel mobile; `--color-sidebar-accent` via color-mix no desktop) só tinha
// verificação de contraste calculada à mão num comentário de
// `app/globals.css`, sem nenhum teste automatizado -- ao contrário de todo
// outro valor sensível a contraste deste projeto (PARES acima, Alert
// destructive). Precisa da sessão autenticada real (fixture `../fixtures/
// auth`, nunca autenticação autônoma contra o Supabase) porque a sidebar só
// existe dentro do grupo `(app)`.
// Viewport mobile explícito (`.sidebar-nav-link` some via CSS a partir de
// 768px, ver globals.css) -- sem isto o Playwright roda no viewport desktop
// padrão e os testes mobile falham por elemento "not visible", não por
// contraste real (achado do primeiro `test:e2e` desta suíte nova).
const VIEWPORT_MOBILE = { width: 375, height: 800 };
const VIEWPORT_DESKTOP = { width: 1280, height: 800 };

for (const colorScheme of MODOS_DE_COR) {
  authTest.describe(`contraste WCAG AA -- navegação da sidebar -- modo ${colorScheme}`, () => {
    async function corDoElemento(locator: import('@playwright/test').Locator) {
      return locator.evaluate((el) => {
        // Mesma técnica de normalização via canvas do teste "Alert
        // destructive" acima (Tailwind v4 resolve color-mix()/opacidade via
        // oklab(), que um parser de regex simples não entende) -- duplicada
        // aqui porque funções passadas a `page.evaluate`/`locator.evaluate`
        // rodam serializadas no navegador, sem acesso a closures externas.
        function paraRgb(cor: string): string {
          if (!CSS.supports('color', cor)) {
            throw new Error(`Cor computada não reconhecida pelo navegador: "${cor}"`);
          }
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.fillStyle = cor;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        }

        // O fundo real de `.sidebar-nav-link`/`SidebarMenuButton` é a
        // composição de N camadas translúcidas empilhadas (o próprio
        // hover/ativo em rgba/color-mix, por cima do fundo sólido da
        // sidebar) -- não um único `background-color`. Sobe a árvore
        // coletando toda camada não totalmente transparente até achar a
        // primeira 100% opaca, depois PINTA as camadas em ordem (da mais
        // externa/opaca para a mais interna) no mesmo canvas 1x1 -- o
        // próprio compositor 2D do navegador faz o alpha-blend correto
        // camada a camada, em vez de reimplementar a matemática à mão.
        //
        // Cada camada passa primeiro por `paraRgb` (normaliza para
        // `rgb()`/`rgba()` real via canvas) ANTES de examinar o alpha --
        // achado real: uma primeira versão lia `alpha` direto do
        // `background-color` bruto via regex `rgba?(...)`, que não casa com
        // o formato `oklab(...)` que o Chromium reporta para o resultado de
        // `color-mix()` (mesmo formato documentado no teste "Alert
        // destructive" acima) -- qualquer camada nesse formato caía no
        // `alpha === undefined ? 1` e era tratada como 100% opaca sem ser,
        // parando a subida cedo demais e produzindo um contraste calculado
        // sobre a cor errada (confirmado rodando contra a sidebar desktop:
        // devolvia ~1.04:1 em vez do valor real).
        const camadas: string[] = [];
        let no: Element | null = el;
        while (no) {
          const corNormalizada = paraRgb(getComputedStyle(no).backgroundColor);
          const [, , , , a] = corNormalizada.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/) ?? [];
          const alpha = a === undefined ? 1 : Number(a);
          if (alpha > 0) {
            camadas.push(corNormalizada);
            if (alpha >= 1) break;
          }
          no = no.parentElement;
        }
        camadas.reverse(); // opaco (fundo real) primeiro, hover/ativo do elemento por último

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        for (const camada of camadas) {
          ctx.fillStyle = camada;
          ctx.fillRect(0, 0, 1, 1);
        }
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const bg = `rgb(${r}, ${g}, ${b})`; // composição final é sempre opaca (base opaca garantida pelo loop acima)

        return { fg: paraRgb(getComputedStyle(el).color), bg };
      });
    }

    authTest('sidebar mobile: item ativo, texto sobre o próprio fundo (mínimo 4.5:1)', async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize(VIEWPORT_MOBILE);
      await page.goto('/categorias');
      // `.sidebar-nav-link` só fica visível (fora do off-canvas) com o painel
      // aberto -- mesmo elemento existe sempre no DOM (nav.tsx), só a
      // posição/CSS muda com `menuAberto`.
      await page.getByRole('button', { name: 'Abrir menu' }).click();

      const linkAtivo = page.locator('.sidebar-nav-link.ativo').first();
      await expect(linkAtivo).toBeVisible();

      const { fg, bg } = await corDoElemento(linkAtivo);
      const ratio = contrastRatio(fg, bg);

      expect(
        ratio,
        `sidebar mobile ativo (${colorScheme}): ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, mínimo exigido 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    authTest('sidebar mobile: hover, texto sobre o próprio fundo (mínimo 4.5:1)', async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize(VIEWPORT_MOBILE);
      await page.goto('/categorias');
      await page.getByRole('button', { name: 'Abrir menu' }).click();

      // Link inativo (Início) para isolar o estado `:hover` do `.ativo`.
      const linkInativo = page.locator('.sidebar-nav-link:not(.ativo)').first();
      await expect(linkInativo).toBeVisible();
      await linkInativo.hover();

      const { fg, bg } = await corDoElemento(linkInativo);
      const ratio = contrastRatio(fg, bg);

      expect(
        ratio,
        `sidebar mobile hover (${colorScheme}): ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, mínimo exigido 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    authTest('sidebar desktop: item ativo, texto sobre o próprio fundo (mínimo 4.5:1)', async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize(VIEWPORT_DESKTOP);
      await page.goto('/categorias');

      const linkAtivo = page.locator('[data-sidebar="menu-button"][data-active="true"]').first();
      await expect(linkAtivo).toBeVisible();

      const { fg, bg } = await corDoElemento(linkAtivo);
      const ratio = contrastRatio(fg, bg);

      expect(
        ratio,
        `sidebar desktop ativo (${colorScheme}): ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, mínimo exigido 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  });
}
