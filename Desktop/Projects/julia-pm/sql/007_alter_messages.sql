-- Add message_id and telegram_id columns to messages table
-- message_id: Telegram message ID, used by Update Message nodes to match messages
-- telegram_id: Telegram user ID of the sender

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_id TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages(telegram_id);
