-- Create vendors table
-- Stores contractor/vendor contact info by service category

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  category TEXT NOT NULL,  -- plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance, landscaping, cleaning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast category lookups (used by vendor dispatch)
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
