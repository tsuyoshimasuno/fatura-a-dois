import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { test as testAutenticado } from '../fixtures/auth';

// Rotas genuinamente públicas (fora do grupo `(app)`, sem sessão) -- ver
// lib/supabase/middleware.ts PUBLIC_PATHS. Não precisam da fixture de sessão
// persistente: o contexto/página padrão do Playwright já basta.
const ROTAS = [
  { path: '/login', label: 'login' },
  { path: '/esqueci-senha', label: 'esqueci-senha' },
];

// `/redefinir-senha` NÃO está em PUBLIC_PATHS (middleware.ts) -- exige alguma
// sessão válida (normalmente vinda do fluxo PKCE de recuperação, mas o
// middleware não distingue de uma sessão comum). Achado real durante a
// captura do baseline: testá-la em contexto deslogado sempre redireciona
// para /login, não é um bug da rota -- corrigido usando a fixture
// autenticada, mesma usada pelas rotas do grupo (app).
const ROTAS_AUTENTICADAS = [{ path: '/redefinir-senha', label: 'redefinir-senha' }];

const MODOS_DE_COR = ['light', 'dark'] as const;

// Impacto mínimo do axe-core tratado como bloqueante nesta suíte -- "critical"
// e "serious" (ver Acceptance Criteria do spec-7-1-suite-qa-automatizada.md).
// "moderate"/"minor" não bloqueiam esta story.
const IMPACTOS_BLOQUEANTES = new Set(['critical', 'serious']);

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
      expect(
        page.url(),
        `${path} não deveria redirecionar para outra rota (contexto deslogado)`,
      ).toContain(path);

      expect(
        errosDeConsole,
        `Erro(s) de console em ${path} (${colorScheme}):\n${errosDeConsole.join('\n')}`,
      ).toEqual([]);

      const resultadoAxe = await new AxeBuilder({ page }).analyze();
      const violacoesBloqueantes = resultadoAxe.violations.filter((v) =>
        IMPACTOS_BLOQUEANTES.has(v.impact ?? ''),
      );

      expect(
        violacoesBloqueantes,
        `Violação(ões) axe-core crítica/séria em ${path} (${colorScheme}):\n` +
          JSON.stringify(violacoesBloqueantes, null, 2),
      ).toEqual([]);
    });
  }
}

for (const { path, label } of ROTAS_AUTENTICADAS) {
  for (const colorScheme of MODOS_DE_COR) {
    testAutenticado(`${label} (${colorScheme}) -- smoke + acessibilidade`, async ({ page }) => {
      const errosDeConsole = await coletarErrosDeConsole(page);

      await page.emulateMedia({ colorScheme });
      const response = await page.goto(path);

      expect(response?.ok(), `Navegação para ${path} não retornou 2xx`).toBeTruthy();
      expect(
        page.url(),
        `Redirecionado para /login em ${path} -- sessão da fixture de auth parece ter expirado/quebrado`,
      ).not.toContain('/login');

      expect(
        errosDeConsole,
        `Erro(s) de console em ${path} (${colorScheme}):\n${errosDeConsole.join('\n')}`,
      ).toEqual([]);

      const resultadoAxe = await new AxeBuilder({ page }).analyze();
      const violacoesBloqueantes = resultadoAxe.violations.filter((v) =>
        IMPACTOS_BLOQUEANTES.has(v.impact ?? ''),
      );

      expect(
        violacoesBloqueantes,
        `Violação(ões) axe-core crítica/séria em ${path} (${colorScheme}):\n` +
          JSON.stringify(violacoesBloqueantes, null, 2),
      ).toEqual([]);
    });
  }
}
