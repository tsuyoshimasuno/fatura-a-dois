import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida (ver .env.example)');
}

// prepare:false é obrigatório: o pooler do Supabase em modo transaction
// não suporta prepared statements (ver Stack, ARCHITECTURE-SPINE.md).
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
