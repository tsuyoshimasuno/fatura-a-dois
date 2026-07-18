import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
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
    // Sem FK ainda: tabela `categoria` só existe no Epic 3.
    categoriaId: integer('categoria_id'),
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
