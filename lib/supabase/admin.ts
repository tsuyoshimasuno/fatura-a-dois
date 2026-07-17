import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Client de servidor com service_role: bypassa RLS, nunca deve ser exposto ao browser.
// Uso restrito a jobs de confiança (ex.: backup) que rodam sem sessão de usuário.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
