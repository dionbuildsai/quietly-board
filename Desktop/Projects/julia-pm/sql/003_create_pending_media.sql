-- Create pending_media table
-- Tracks photo/media uploads from tenants before they're attached to tickets

CREATE TABLE IF NOT EXISTS pending_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT,
  chat_id TEXT,
  file_id TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending',  -- pending, attached
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_media_chat_id ON pending_media(chat_id);
CREATE INDEX IF NOT EXISTS idx_pending_media_ticket_id ON pending_media(ticket_id);
