ALTER TABLE "lancamento" DROP CONSTRAINT "lancamento_responsavel_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lancamento" DROP CONSTRAINT "lancamento_repassado_por_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_repassado_por_users_id_fk" FOREIGN KEY ("repassado_por") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;