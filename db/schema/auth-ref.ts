import { pgSchema, uuid } from 'drizzle-orm/pg-core';

// Referência somente-leitura ao schema `auth` do Supabase Auth -- nunca
// migrado/alterado por nós, só usado para declarar a FK de cartao.usuario_id.
const authSchema = pgSchema('auth');

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});
