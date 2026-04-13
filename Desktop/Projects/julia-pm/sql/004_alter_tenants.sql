-- Add telegram_id column to tenants table
-- Used for Telegram bot registration and lookups

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telegram_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_telegram_id ON tenants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
