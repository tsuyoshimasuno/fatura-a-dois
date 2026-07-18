CREATE TABLE "categoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"removido_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "categoria_nome_ativa_idx" ON "categoria" USING btree ("nome") WHERE removido_em is null;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;