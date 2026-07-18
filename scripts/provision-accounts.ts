import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '../lib/supabase/admin.ts';

config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não definidas (ver .env.local).',
  );
}

// Lista fixa: provisionamento administrativo, não há auto-cadastro (FR1).
const ACCOUNTS = ['tsuyoshi.masuno@gmail.com', 'milena.smasuno@gmail.com'];

function generateTemporaryPassword() {
  return randomBytes(18).toString('base64url');
}

async function main() {
  const supabase = createAdminClient();

  // perPage alto porque o app é hardcoded para exatamente 2 contas para sempre
  // (sem auto-cadastro, FR1) -- a página default (~50) já bastaria, mas isso
  // garante que a checagem de existência nunca fica cega a um usuário real.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  let hadFailure = false;

  for (const email of ACCOUNTS) {
    try {
      const existing = data.users.find((user) => user.email === email);
      if (existing) {
        console.log(`[já existe] ${email}`);
        continue;
      }

      const password = generateTemporaryPassword();
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;

      console.log(`[criada] ${email} -- senha temporária: ${password}`);
    } catch (accountError) {
      hadFailure = true;
      console.error(`[falhou] ${email}:`, accountError);
    }
  }

  if (hadFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Falha ao provisionar contas:', error);
  process.exitCode = 1;
});
