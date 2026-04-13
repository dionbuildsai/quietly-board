-- Add ticket system columns to maintenance_requests
-- Consolidates the Google Sheets "Open tickets" tab into this table
-- Voice agent already uses: id, ticket_number, tenant_name, tenant_phone, property_id, unit_number, category, description, urgency, status, transcript, created_at, updated_at

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS ticket_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT,
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS tenant_message TEXT,
  ADD COLUMN IF NOT EXISTS telegram_id TEXT,
  ADD COLUMN IF NOT EXISTS media TEXT,
  ADD COLUMN IF NOT EXISTS property TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS tenant_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_ticket_id ON maintenance_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_phone ON maintenance_requests(phone);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_telegram_id ON maintenance_requests(telegram_id);
