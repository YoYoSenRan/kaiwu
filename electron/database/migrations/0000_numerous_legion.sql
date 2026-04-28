CREATE TABLE `chat_budget_state` (
	`session_id` text PRIMARY KEY NOT NULL,
	`rounds_used` integer NOT NULL,
	`tokens_used` integer NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`openclaw_session_key` text,
	`openclaw_message_id` text,
	`sender_type` text NOT NULL,
	`sender_id` text,
	`role` text NOT NULL,
	`content_json` text NOT NULL,
	`mentions_json` text,
	`turn_run_id` text,
	`tags_json` text,
	`created_at_local` integer NOT NULL,
	`created_at_remote` integer,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_session_members` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`openclaw_key` text NOT NULL,
	`reply_mode` text NOT NULL,
	`joined_at` integer NOT NULL,
	`left_at` integer,
	`seed_history` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`label` text,
	`openclaw_key` text,
	`budget_json` text NOT NULL,
	`strategy_json` text NOT NULL,
	`supervisor_id` text,
	`archived` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_sessions_openclaw_key_unique` ON `chat_sessions` (`openclaw_key`);