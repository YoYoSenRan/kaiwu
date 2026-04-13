CREATE TABLE `agent_knowledge` (
	`agent_id` text NOT NULL,
	`kb_id` text NOT NULL,
	PRIMARY KEY(`agent_id`, `kb_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ak_agent` ON `agent_knowledge` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_ak_kb` ON `agent_knowledge` (`kb_id`);--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`kb_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`size` integer NOT NULL,
	`chunk_count` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_kd_kb` ON `knowledge_documents` (`kb_id`,`state`);--> statement-breakpoint
CREATE TABLE `knowledges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`embedding_model` text NOT NULL,
	`chunk_count` integer DEFAULT 0 NOT NULL,
	`doc_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_knowledges_created` ON `knowledges` ("created_at" DESC);