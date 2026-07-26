import fs from 'node:fs';
import path from 'node:path';
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';

// Perfil persistente do Chromium, fora do repo/git (ver .gitignore) -- contém
// a sessão real de uma das 2 contas do casal, autenticada manualmente uma
// única vez pelo usuário. A suíte NUNCA autentica sozinha contra o Supabase
// Auth real (Boundaries -> Block If do spec-7-1-suite-qa-automatizada.md).
export const USER_DATA_DIR = path.join(process.cwd(), '.playwright-profile');

function assertPerfilExiste(): void {
  if (fs.existsSync(USER_DATA_DIR)) {
    return;
  }

  throw new Error(
    [
      `Perfil persistente de autenticação não encontrado em: ${USER_DATA_DIR}`,
      '',
      'Esta suíte precisa de uma sessão real autenticada para testar as rotas de',
      '/(app) -- e nunca autentica de forma autônoma contra o Supabase Auth real.',
      '',
      'Para resolver, rode uma vez (fora desta suíte):',
      '  npx tsx scripts/playwright-login.mts',
      'Isso abre uma janela Chromium real com este mesmo perfil -- faça login',
      'manualmente com uma das contas do casal e feche a janela quando terminar.',
      'Depois disso a sessão fica salva no perfil e esta suíte pode reaproveitá-la.',
    ].join('\n'),
  );
}

type Fixtures = {
  context: BrowserContext;
  page: Page;
};

// Padrão oficial do Playwright para reaproveitar uma sessão via perfil
// persistente (https://playwright.dev/docs/auth#reuse-signed-in-state):
// substitui os fixtures `context`/`page` padrão (que criariam um contexto
// novo e deslogado) por um `launchPersistentContext` sobre o mesmo
// userDataDir usado no login manual.
export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    assertPerfilExiste();

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: true,
    });

    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';
