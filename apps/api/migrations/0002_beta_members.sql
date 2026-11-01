CREATE TABLE IF NOT EXISTS beta_members (
  user_id TEXT PRIMARY KEY,
  login TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
