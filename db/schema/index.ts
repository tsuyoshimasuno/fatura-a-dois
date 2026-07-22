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

// Identidade de uma compra parcelada (AD-4) -- uma linha por compra
// original, materializada quando a primeira parcela conhecida (upload,
// Epic 2) é processada. A chave de identidade é o índice único
// composto abaixo: cartão + estabelecimento normalizado (AD-9) + valor de
// cada parcela + total de parcelas -- nunca `data` nem `parcelaNumero`, que
// variam entre parcelas da mesma compra. `server/parcelas` é o único módulo
// que escreve aqui (AD-7); `server/ingestao` sempre chama uma função de
// serviço exposta por `server/parcelas`, nunca insere/seleciona aqui direto.
export const compraParcelada = pgTable(
  'compra_parcelada',
  {
    id: serial('id').primaryKey(),
    cartaoId: integer('cartao_id')
      .notNull()
      .references(() => cartao.id),
    estabelecimentoNormalizado: text('estabelecimento_normalizado').notNull(),
    valorParcelaCentavos: integer('valor_parcela_centavos').notNull(),
    totalParcelas: integer('total_parcelas').notNull(),
    // Apenas âncora/exibição: competência do lançamento que disparou a
    // criação desta compra. A projeção de parcelas futuras (Story 5.2) não
    // depende deste valor para calcular meses futuros -- usa a competência e
    // o número da parcela do lançamento real mais recente conhecido.
    competenciaInicialAno: integer('competencia_inicial_ano').notNull(),
    competenciaInicialMes: integer('competencia_inicial_mes').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('compra_parcelada_chave_idx').on(
      table.cartaoId,
      table.estabelecimentoNormalizado,
      table.valorParcelaCentavos,
      table.totalParcelas
    ),
  ],
);

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
    compraParceladaId: integer('compra_parcelada_id').references(() => compraParcelada.id),
    parcelaNumero: integer('parcela_numero'),
    parcelaTotal: integer('parcela_total'),
    // Repasse de responsabilidade financeira (Epic 6, Story 6.1) -- override
    // de `cartao.usuarioId` só para fins de total/agregação/filtro por
    // pessoa; nulo preserva o comportamento histórico (dono = titular do
    // cartão). A exibição de titular ("quem gastou") nunca lê esta coluna,
    // sempre `cartao.usuarioId`. `repassadoPor`/`repassadoEm` registram só a
    // última ação (repassar ou desfazer), não um histórico completo.
    responsavelId: uuid('responsavel_id').references(() => authUsers.id, { onDelete: 'set null' }),
    repassadoPor: uuid('repassado_por').references(() => authUsers.id, { onDelete: 'set null' }),
    repassadoEm: timestamp('repassado_em'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('lancamento_cartao_id_idx').on(table.cartaoId),
    // Epic 4 (visão por competência) e Epic 5 (parcelas) sempre filtram por
    // competência -- índice composto cobre ambos os padrões de consulta.
    index('lancamento_competencia_idx').on(table.competenciaAno, table.competenciaMes),
  ],
);
