CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text NOT NULL,
	`name` text NOT NULL,
	`workspace` text NOT NULL,
	`model` text,
	`emoji` text,
	`avatar` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_synced_at` integer,
	`pinned` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`tags` text,
	`last_opened_at` integer,
	`remark` text,
	`sync_state` text DEFAULT 'ok' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_unique` ON `agents` (`agent`);--> statement-breakpoint
CREATE INDEX `idx_agents_list` ON `agents` (`hidden`,"pinned" DESC,`sort_order`,"created_at" DESC);