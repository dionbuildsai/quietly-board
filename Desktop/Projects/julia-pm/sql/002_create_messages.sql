-- Create messages table
-- Stores conversation logs between tenants and the system

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT,
  ticket_id TEXT,
  sender TEXT,          -- tenant, system, owner
  message_text TEXT,
  media TEXT,
  channel TEXT,         -- telegram, email, sms
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by chat and ticket
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
