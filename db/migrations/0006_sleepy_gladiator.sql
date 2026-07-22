ALTER TABLE "lancamento" ADD COLUMN "responsavel_id" uuid;--> statement-breakpoint
ALTER TABLE "lancamento" ADD COLUMN "repassado_por" uuid;--> statement-breakpoint
ALTER TABLE "lancamento" ADD COLUMN "repassado_em" timestamp;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_repassado_por_users_id_fk" FOREIGN KEY ("repassado_por") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;