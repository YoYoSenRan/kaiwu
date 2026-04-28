CREATE TABLE `chat_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`member_id` text NOT NULL,
	`turn_run_id` text NOT NULL,
	`session_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`model` text,
	`trigger_message_id` text,
	`system_prompt` text NOT NULL,
	`history_text` text,
	`sent_message` text NOT NULL,
	`sent_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `chat_session_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_turns_turn_run_id_unique` ON `chat_turns` (`turn_run_id`);