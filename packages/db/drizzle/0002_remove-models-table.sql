ALTER TABLE "models" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "models" CASCADE;--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "model_id";