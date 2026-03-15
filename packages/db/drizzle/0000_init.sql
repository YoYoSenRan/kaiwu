CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "themes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"theme_id" integer NOT NULL,
	"stage_type" text NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"description" text,
	"color" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"label" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "models_model_id_unique" UNIQUE("model_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_type" text NOT NULL,
	"sub_role" text,
	"model_id" integer,
	"workspace" text,
	"soul_prompt" text,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"reject_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'triage' NOT NULL,
	"current_stage" text DEFAULT 'triage' NOT NULL,
	"current_agent" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"output_dir" text,
	"acceptance_criteria" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" text NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"agent_id" text,
	"verdict" text DEFAULT 'proceed' NOT NULL,
	"reason" text,
	"duration_sec" integer,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" text NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"description" text,
	"agent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"output_path" text,
	"checkpoints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"agent_id" text,
	"published_url" text,
	"published_path" text,
	"deploy_log" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_id" text,
	"topic" text NOT NULL,
	"event_type" text NOT NULL,
	"producer" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_current_agent_agents_id_fk" FOREIGN KEY ("current_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_theme_stage_unique" ON "pipelines" USING btree ("theme_id","stage_type");--> statement-breakpoint
CREATE INDEX "pipelines_theme_sort_idx" ON "pipelines" USING btree ("theme_id","sort_order");--> statement-breakpoint
CREATE INDEX "agents_stage_type_idx" ON "agents" USING btree ("stage_type");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposals_source_idx" ON "proposals" USING btree ("source");--> statement-breakpoint
CREATE INDEX "proposals_created_at_idx" ON "proposals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "productions_status_idx" ON "productions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "productions_current_stage_idx" ON "productions" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "productions_is_archived_idx" ON "productions" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "productions_created_at_idx" ON "productions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "productions_status_archived_idx" ON "productions" USING btree ("status","is_archived");--> statement-breakpoint
CREATE INDEX "production_stages_production_id_idx" ON "production_stages" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "production_stages_created_at_idx" ON "production_stages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "production_stages_production_created_idx" ON "production_stages" USING btree ("production_id","created_at");--> statement-breakpoint
CREATE INDEX "production_tasks_production_id_idx" ON "production_tasks" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "production_tasks_agent_id_idx" ON "production_tasks" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "production_tasks_status_idx" ON "production_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_tasks_parent_id_idx" ON "production_tasks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "publications_production_id_idx" ON "publications" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "publications_channel_idx" ON "publications" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "production_events_production_id_idx" ON "production_events" USING btree ("production_id");--> statement-breakpoint
CREATE INDEX "production_events_topic_idx" ON "production_events" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "production_events_created_at_idx" ON "production_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "production_events_production_topic_idx" ON "production_events" USING btree ("production_id","topic");