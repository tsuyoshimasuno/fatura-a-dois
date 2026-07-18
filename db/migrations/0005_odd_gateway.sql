CREATE TABLE "compra_parcelada" (
	"id" serial PRIMARY KEY NOT NULL,
	"cartao_id" integer NOT NULL,
	"estabelecimento_normalizado" text NOT NULL,
	"valor_parcela_centavos" integer NOT NULL,
	"total_parcelas" integer NOT NULL,
	"competencia_inicial_ano" integer NOT NULL,
	"competencia_inicial_mes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compra_parcelada" ADD CONSTRAINT "compra_parcelada_cartao_id_cartao_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compra_parcelada_chave_idx" ON "compra_parcelada" USING btree ("cartao_id","estabelecimento_normalizado","valor_parcela_centavos","total_parcelas");--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_compra_parcelada_id_compra_parcelada_id_fk" FOREIGN KEY ("compra_parcelada_id") REFERENCES "public"."compra_parcelada"("id") ON DELETE no action ON UPDATE no action;