import postgres from 'postgres';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'backups';
const RETENTION_DAYS = 30;

// Alternativa ao PITR pago do Supabase (NFR4): dump diário de todas as tabelas
// public em JSON, gravado no Storage do próprio projeto. Sem custo adicional,
// disparado por Vercel Cron (ver vercel.json + app/api/cron/backup/route.ts).
export async function runBackup() {
  if (!process.env.DIRECT_URL) {
    throw new Error('DIRECT_URL não definida (ver .env.example)');
  }

  const sql = postgres(process.env.DIRECT_URL, { prepare: false });
  const supabase = createAdminClient();

  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;

    const dump: Record<string, unknown[]> = {};
    for (const { table_name } of tables) {
      dump[table_name] = await sql.unsafe(`select * from "${table_name}"`);
    }

    await ensureBucket(supabase);

    const path = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, JSON.stringify(dump, null, 2), { contentType: 'application/json' });
    if (uploadError) throw uploadError;

    await pruneOldBackups(supabase);

    return {
      path,
      tables: Object.keys(dump),
      rows: Object.values(dump).reduce((total, rows) => total + rows.length, 0),
    };
  } finally {
    await sql.end();
  }
}

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (createError) throw createError;
  }
}

async function pruneOldBackups(supabase: ReturnType<typeof createAdminClient>) {
  const { data: files, error } = await supabase.storage.from(BUCKET).list();
  if (error) throw error;

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const stale = (files ?? [])
    .filter((file) => file.created_at && new Date(file.created_at).getTime() < cutoff)
    .map((file) => file.name);

  if (stale.length > 0) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(stale);
    if (removeError) throw removeError;
  }
}
