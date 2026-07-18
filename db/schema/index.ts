import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from './auth-ref';

export const cartao = pgTable('cartao', {
  id: serial('id').primaryKey(),
  numeroMascarado: text('numero_mascarado').notNull().unique(),
  nomeTitular: text('nome_titular').notNull(),
  tipoCartao: text('tipo_cartao').notNull(),
  usuarioId: uuid('usuario_id').references(() => authUsers.id),
  terceiro: boolean('terceiro').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Compartilhada pelas duas contas (AD-8) -- nunca ganha coluna de escopo por
// usuário. Exclusão é sempre lógica (removidoEm): um lançamento que aponta
// para uma categoria removida continua com FK íntegra, distinguindo
// "categoria removida" de "nunca categorizado" (categoriaId is null).
export const categoria = pgTable(
  'categoria',
  {
    id: serial('id').primaryKey(),
    nome: text('nome').notNull(),
    removidoEm: timestamp('removido_em'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // Índice único parcial: só categorias ativas precisam de nome único,
    // permitindo recriar uma categoria com o mesmo nome de uma já removida.
    uniqueIndex('categoria_nome_ativa_idx').on(table.nome).where(sql`removido_em is null`),
  ],
);

// Regra memorizada de categorização por padrão de estabelecimento (AD-3,
// Story 3.3) -- compartilhada pelas duas contas, assim como `categoria`.
// Uma linha por `padraoEstabelecimento` (upsert em `corrigir-categoria.ts`
// garante isso); `resolverCategoriaSugerida` consulta via `similarity()`
// (pg_trgm) contra o estabelecimento normalizado de um lançamento novo.
export const regraCategorizacao = pgTable('regra_categorizacao', {
  id: serial('id').primaryKey(),
  padraoEstabelecimento: text('padrao_estabelecimento').notNull().unique(),
  categoriaId: integer('categoria_id')
    .notNull()
    .references(() => categoria.id),
  atualizadoEm: timestamp('atualizado_em').notNull().defaultNow(),
});

export const lancamento = pgTable(
  'lancamento',
  {
    id: serial('id').primaryKey(),
    competenciaAno: integer('competencia_ano').notNull(),
    competenciaMes: integer('competencia_mes').notNull(),
    data: date('data').notNull(),
    estabelecimento: text('estabelecimento').notNull(),
    valorCentavos: integer('valor_centavos').notNull(),
    cartaoId: integer('cartao_id')
      .notNull()
      .references(() => cartao.id),
    categoriaId: integer('categoria_id').references(() => categoria.id),
    // Sem FK ainda: tabela `compra_parcelada` só existe no Epic 5.
    compraParceladaId: integer('compra_parcelada_id'),
    parcelaNumero: integer('parcela_numero'),
    parcelaTotal: integer('parcela_total'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('lancamento_cartao_id_idx').on(table.cartaoId),
    // Epic 4 (visão por competência) e Epic 5 (parcelas) sempre filtram por
    // competência -- índice composto cobre ambos os padrões de consulta.
    index('lancamento_competencia_idx').on(table.competenciaAno, table.competenciaMes),
  ],
);
