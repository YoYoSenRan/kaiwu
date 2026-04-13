CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'single',
  status      TEXT NOT NULL DEFAULT 'active',
  config      TEXT NOT NULL DEFAULT '{}',
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS chat_messages (
  id               TEXT PRIMARY KEY,
  chat_id          TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL,
  sender_agent_id  TEXT,
  content          TEXT NOT NULL,
  metadata         TEXT NOT NULL DEFAULT '{}',
  created_at       INTEGER NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat
  ON chat_messages(chat_id, created_at);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  session_key TEXT,
  config      TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (chat_id, agent_id)
);
