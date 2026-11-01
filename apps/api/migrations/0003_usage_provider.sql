ALTER TABLE usage_reservations ADD COLUMN provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini','ollama'));
CREATE INDEX IF NOT EXISTS usage_provider_month ON usage_reservations(provider,month);
CREATE INDEX IF NOT EXISTS usage_provider_user_day ON usage_reservations(provider,user_id,day);
