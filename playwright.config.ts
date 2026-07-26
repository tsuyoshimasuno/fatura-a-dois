import { defineConfig, devices } from '@playwright/test';

// Suíte de QA automatizada (Story 7.1) -- pré-requisito bloqueante do Epic 7
// (migração de design system para shadcn/ui). Roda sempre contra o app local
// (`npm run dev`), nunca contra produção -- ver Boundaries do
// spec-7-1-suite-qa-automatizada.md.
export default defineConfig({
  testDir: './e2e',
  // Onde o `toHaveScreenshot()` (e2e/visual/visual.spec.ts) guarda/compara os
  // baselines de screenshot. Só o template padrão do Playwright (não
  // introduzimos pixelmatch/pngjs -- decisão já tomada, ver epic-7-context.md).
  snapshotDir: './e2e/__snapshots__',
  // `launchPersistentContext` (e2e/fixtures/auth.ts) abre um único perfil de
  // Chromium em disco -- rodar specs autenticados em paralelo colidiria no
  // mesmo userDataDir. Suíte pequena (~11 rotas), serial é rápido o
  // suficiente e evita esse conflito.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Sobe `npm run dev` sozinho se `localhost:3000` ainda não estiver de pé
  // (`reuseExistingServer` evita um segundo servidor se o usuário já tiver um
  // rodando manualmente, ex. durante o login manual único da fixture de auth).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
