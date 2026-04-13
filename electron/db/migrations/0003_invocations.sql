-- chat_messages 新增列
ALTER TABLE chat_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN invocation_id TEXT;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN run_id TEXT;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN remote_seq INTEGER;
--> statement-breakpoint
ALTER TABLE chat_messages ADD COLUMN content_hash TEXT;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_cm_run
  ON chat_messages(chat_id, run_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_cm_hash
  ON chat_messages(chat_id, sender_type, content_hash, created_at);

--> statement-breakpoint

-- chat_invocations 新表
CREATE TABLE IF NOT EXISTS chat_invocations (
  id              TEXT PRIMARY KEY,
  chat_id         TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  session_key     TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  model           TEXT,
  provider        TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cache_read      INTEGER,
  cache_write     INTEGER,
  cost            REAL,
  stop_reason     TEXT,
  duration_ms     INTEGER,
  raw             TEXT,
  created_at      INTEGER NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ci_chat
  ON chat_invocations(chat_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_agent
  ON chat_invocations(agent_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_model
  ON chat_invocations(model, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ci_session
  ON chat_invocations(session_key);
