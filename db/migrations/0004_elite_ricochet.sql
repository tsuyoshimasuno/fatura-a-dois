CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "regra_categorizacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"padrao_estabelecimento" text NOT NULL,
	"categoria_id" integer NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regra_categorizacao_padrao_estabelecimento_unique" UNIQUE("padrao_estabelecimento")
);
--> statement-breakpoint
ALTER TABLE "regra_categorizacao" ADD CONSTRAINT "regra_categorizacao_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;