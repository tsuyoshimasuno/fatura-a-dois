import { expect, test as baseTest } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';

// Diff visual nativo do Playwright (`toHaveScreenshot()`, sem
// pixelmatch/pngjs -- decisão já tomada, ver epic-7-context.md) para as 4
// telas amostradas do Epic 7, claro e escuro (8 screenshots no total). Na
// primeira execução, o Playwright cria o baseline automaticamente (sem
// baseline prévio para comparar) -- ver I/O & Edge-Case Matrix do
// spec-7-1-suite-qa-automatizada.md.

const MODOS_DE_COR = ['light', 'dark'] as const;

// /lancamentos, /categorias e / exigem sessão autenticada (grupo `(app)`) --
// usam a fixture de perfil persistente (e2e/fixtures/auth.ts). /redefinir-senha
// também entra aqui (achado real ao capturar o baseline desta story): não está
// em PUBLIC_PATHS (lib/supabase/middleware.ts) -- sem sessão, o middleware
// redireciona para /login antes da página renderizar, então o "screenshot da
// tela" seria na verdade o login. O middleware só trata como caso especial a
// combinação usuário-autenticado+"/login" (redireciona pra "/"); para
// qualquer outro path autenticado (incluindo /redefinir-senha) a página
// normal renderiza -- usar a mesma sessão comum da fixture é suficiente para
// amostrar o formulário real, sem precisar simular uma sessão de recovery.
const ROTAS_AUTENTICADAS = [
  { path: '/lancamentos', slug: 'lancamentos' },
  { path: '/categorias', slug: 'categorias' },
  { path: '/', slug: 'inicio' },
  { path: '/redefinir-senha', slug: 'redefinir-senha' },
];

for (const colorScheme of MODOS_DE_COR) {
  for (const { path, slug } of ROTAS_AUTENTICADAS) {
    authTest(`${slug} (${colorScheme}) -- screenshot`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      // `nextjs-portal` é o indicador de dev-mode do Next.js (canto inferior
      // esquerdo) -- mascarado como defesa em profundidade (nunca aparece em
      // produção). `caret: 'initial'` desliga o comportamento padrão do
      // Playwright de esconder o cursor de texto via `caret-color:
      // transparent` injetado -- achado real durante a captura do baseline:
      // esse valor injetado ANTES da hidratação do React terminar colidia com
      // o HTML server-rendered (nenhum input tem autofoco, então não há
      // cursor piscando para esconder de qualquer forma), disparando um aviso
      // de hydration mismatch que o Next.js reporta via `nextjs-portal`
      // ("1 Issue") de forma não-determinística -- não é bug do produto, é
      // interação entre a própria instrumentação de teste e o modo dev do
      // React.
      // `.card` cobre todo bloco com dado financeiro real do casal (lista de
      // lançamentos/categorias, resumos, estados do dashboard) -- mascarado
      // por 2 motivos reais achados no review adversarial: (1) sem isso, o
      // PNG de baseline commitado no git conteria valores/estabelecimentos
      // reais do casal (o mesmo cuidado que .gitignore já tem com
      // /Faturas`/`/fixtures`, aqui replicado para screenshot); (2) sem
      // isso, qualquer lançamento novo real mudaria o diff visual de forma
      // indistinguível de uma regressão de UI de verdade. Chrome/layout
      // (sidebar, cabeçalho, filtros) continua visível para detectar
      // regressão real na migração shadcn.
      await expect(page).toHaveScreenshot(`${slug}-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.locator('nextjs-portal'), page.locator('.card')],
        caret: 'initial',
      });
    });
  }

  // /login e /esqueci-senha são as únicas rotas realmente públicas
  // (PUBLIC_PATHS em lib/supabase/middleware.ts) -- um contexto autenticado
  // em /login seria redirecionado para "/" pelo middleware. Usa o contexto
  // padrão (deslogado).
  const ROTAS_PUBLICAS = [
    { path: '/login', slug: 'login' },
    { path: '/esqueci-senha', slug: 'esqueci-senha' },
  ];

  for (const { path, slug } of ROTAS_PUBLICAS) {
    baseTest(`${slug} (${colorScheme}) -- screenshot`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${slug}-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.locator('nextjs-portal')],
        caret: 'initial',
      });
    });
  }

  // Estados de erro (Alert destructive) das duas telas de auth de baixo
  // tráfego (Story 7.4) -- achado real do review adversarial: sem isso, a
  // única superfície visual nova desta story (o Alert de erro) nunca era
  // amostrada, deixando uma regressão de estilo nele invisível ao gate.
  baseTest(`esqueci-senha link expirado (${colorScheme}) -- screenshot`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/esqueci-senha?error=link_invalido');
    await expect(page).toHaveScreenshot(`esqueci-senha-link-expirado-${colorScheme}.png`, {
      fullPage: true,
      mask: [page.locator('nextjs-portal')],
      caret: 'initial',
    });
  });

  authTest(`redefinir-senha senhas divergentes (${colorScheme}) -- screenshot`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/redefinir-senha');
    await page.getByLabel('Nova senha', { exact: true }).fill('senha-123');
    await page.getByLabel('Confirmar nova senha').fill('outra-senha-456');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible();
    await expect(page).toHaveScreenshot(`redefinir-senha-erro-${colorScheme}.png`, {
      fullPage: true,
      mask: [page.locator('nextjs-portal')],
      caret: 'initial',
    });
  });

  baseTest(`login credenciais inválidas (${colorScheme}) -- screenshot`, async ({ page }) => {
    // Intercepta a chamada real do Supabase Auth (`signInWithPassword`) e
    // força uma resposta 400 determinística -- achado real do review
    // adversarial (Blind Hunter + Edge Case Hunter, convergente): sem isso,
    // este teste autenticaria de forma autônoma contra o Supabase Auth REAL
    // de produção (única instância deste projeto, usada pelo casal no
    // dia a dia), violando a própria restrição já registrada em
    // spec-7-1-suite-qa-automatizada.md ("não tentar autenticar de forma
    // autônoma contra Supabase Auth real") e arriscando rate-limit/lockout
    // real a cada execução da suite.
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      });
    });
    await page.emulateMedia({ colorScheme });
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('usuario-inexistente@example.com');
    await page.getByLabel('Senha').fill('senha-incorreta-123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveScreenshot(`login-erro-${colorScheme}.png`, {
      fullPage: true,
      mask: [page.locator('nextjs-portal')],
      caret: 'initial',
    });
  });
}
