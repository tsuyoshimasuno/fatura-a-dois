CREATE TABLE "cartao" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_mascarado" text NOT NULL,
	"nome_titular" text NOT NULL,
	"tipo_cartao" text NOT NULL,
	"usuario_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cartao_numero_mascarado_unique" UNIQUE("numero_mascarado")
);
--> statement-breakpoint
CREATE TABLE "lancamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"competencia_ano" integer NOT NULL,
	"competencia_mes" integer NOT NULL,
	"data" date NOT NULL,
	"estabelecimento" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"cartao_id" integer NOT NULL,
	"categoria_id" integer,
	"compra_parcelada_id" integer,
	"parcela_numero" integer,
	"parcela_total" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cartao" ADD CONSTRAINT "cartao_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_cartao_id_cartao_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartao"("id") ON DELETE no action ON UPDATE no action;