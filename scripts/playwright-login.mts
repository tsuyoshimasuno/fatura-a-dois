import path from 'node:path';
import { chromium } from '@playwright/test';

// Script de uso único: abre uma janela Chromium real (headed) com o mesmo
// perfil persistente (.playwright-profile/) que a suíte e2e usa depois para
// reaproveitar a sessão (ver e2e/fixtures/auth.ts). Faça login manualmente
// com uma das contas do casal e feche a janela quando terminar -- a sessão
// fica salva no perfil.
//
// Uso: npx tsx scripts/playwright-login.mts

const USER_DATA_DIR = path.join(process.cwd(), '.playwright-profile');

async function main() {
  console.log(`Abrindo Chromium com perfil persistente em: ${USER_DATA_DIR}`);
  console.log('Faça login manualmente e feche a janela do navegador quando terminar.');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3000/login');
  } catch (error) {
    console.error(
      'Não consegui abrir http://localhost:3000/login -- o servidor está rodando? ' +
        '(rode "npm run dev" antes deste script)',
    );
    console.error(error);
    await context.close();
    process.exitCode = 1;
    return;
  }

  // Aguarda a janela ser fechada manualmente pelo usuário -- é assim que o
  // script sabe que o login terminou (sem heurística de "sessão detectada").
  await new Promise<void>((resolve) => {
    context.on('close', () => resolve());
  });

  console.log('Perfil salvo. Pode rodar "npm run test:e2e" agora.');
}

main();
