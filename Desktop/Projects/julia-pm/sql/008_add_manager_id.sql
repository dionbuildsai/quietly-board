-- Add manager_id to properties table for property-to-manager routing
-- At 300+ doors, different managers handle different properties
-- Owner notifications route to the assigned manager's Telegram chat_id

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS manager_id TEXT;

-- Default all existing properties to the current owner chat ID
UPDATE properties SET manager_id = '6216258938' WHERE manager_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_manager_id ON properties(manager_id);
