CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, encrypted_token TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS oauth_states (state_hash TEXT PRIMARY KEY, challenge TEXT NOT NULL, expires_at INTEGER NOT NULL, exchange_hash TEXT UNIQUE, github_code TEXT, ip TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS oauth_expiry ON oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS usage_reservations (user_id TEXT NOT NULL, request_id TEXT NOT NULL, day TEXT NOT NULL, month TEXT NOT NULL, reserved_cost INTEGER NOT NULL CHECK (reserved_cost > 0), status TEXT NOT NULL DEFAULT 'reserved', PRIMARY KEY (user_id, request_id));
CREATE INDEX IF NOT EXISTS usage_month ON usage_reservations(month);
CREATE INDEX IF NOT EXISTS usage_user_day ON usage_reservations(user_id, day);
