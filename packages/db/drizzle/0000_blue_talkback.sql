CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"project_id" uuid,
	"phase_id" uuid,
	"task_id" uuid,
	"type" varchar NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"visibility" varchar DEFAULT 'internal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"stat_key" varchar NOT NULL,
	"raw_value" real DEFAULT 0 NOT NULL,
	"star_level" integer DEFAULT 1 NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"title" varchar NOT NULL,
	"emoji" varchar NOT NULL,
	"stage_type" varchar NOT NULL,
	"personality" jsonb,
	"status" varchar DEFAULT 'idle' NOT NULL,
	"activity" text,
	"activity_detail" jsonb,
	"current_project" uuid,
	"level" integer DEFAULT 1 NOT NULL,
	"level_name" varchar DEFAULT '初出茅庐',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"agent_id" varchar NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"stance" varchar NOT NULL,
	"key_point" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"project_id" uuid,
	"phase_id" uuid,
	"agent_id" varchar,
	"type" varchar NOT NULL,
	"title" varchar,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_seq_unique" UNIQUE("seq")
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" varchar NOT NULL,
	"reason" text NOT NULL,
	"source" varchar DEFAULT 'user_submit' NOT NULL,
	"submitted_by" uuid,
	"score" integer,
	"seal_votes" integer DEFAULT 0 NOT NULL,
	"blank_votes" integer DEFAULT 0 NOT NULL,
	"weight" real DEFAULT 0,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"pre_scout_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"tagline" varchar,
	"description" text,
	"url" varchar,
	"repo_url" varchar,
	"screenshot_urls" varchar[],
	"tech_stack" varchar[],
	"metrics" jsonb,
	"story_published" boolean DEFAULT false,
	"launched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword_id" uuid,
	"name" varchar,
	"slug" varchar,
	"description" text,
	"status" varchar NOT NULL,
	"current_phase" varchar,
	"product_url" varchar,
	"repo_url" varchar,
	"started_at" timestamp,
	"launched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "retrospectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"trigger_day" integer NOT NULL,
	"metrics" jsonb,
	"verdicts" jsonb,
	"stat_changes" jsonb,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"assigned_agent" varchar,
	"sub_role" varchar,
	"depends_on" uuid[],
	"result" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" varchar NOT NULL,
	"username" varchar NOT NULL,
	"avatar_url" varchar,
	"github_stars" integer DEFAULT 0,
	"github_created" timestamp,
	"last_submit_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"stance" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_stats" ADD CONSTRAINT "agent_stats_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_current_project_projects_id_fk" FOREIGN KEY ("current_project") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debates" ADD CONSTRAINT "debates_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debates" ADD CONSTRAINT "debates_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retrospectives" ADD CONSTRAINT "retrospectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_agent_agents_id_fk" FOREIGN KEY ("assigned_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_logs_project_id" ON "agent_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_agent_logs_agent_id" ON "agent_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_stats_key" ON "agent_stats" USING btree ("agent_id","stat_key");--> statement-breakpoint
CREATE INDEX "idx_debates_phase_round" ON "debates" USING btree ("phase_id","round");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_events_seq" ON "events" USING btree ("seq");--> statement-breakpoint
CREATE INDEX "idx_events_project_id" ON "events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_events_created_at" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_keywords_status_weight" ON "keywords" USING btree ("status","weight");--> statement-breakpoint
CREATE INDEX "idx_keywords_submitted_by" ON "keywords" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "idx_phases_project_type" ON "phases" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_current_phase" ON "projects" USING btree ("current_phase");--> statement-breakpoint
CREATE INDEX "idx_retrospectives_project" ON "retrospectives" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_status" ON "tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_assigned_agent" ON "tasks" USING btree ("assigned_agent","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_github_id" ON "users" USING btree ("github_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_votes_user_keyword" ON "votes" USING btree ("user_id","keyword_id");