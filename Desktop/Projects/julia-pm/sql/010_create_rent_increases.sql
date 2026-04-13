CREATE TABLE IF NOT EXISTS rent_increases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  current_rent NUMERIC(10,2) NOT NULL,
  proposed_rent NUMERIC(10,2) NOT NULL,
  increase_type TEXT NOT NULL CHECK (increase_type IN ('new_rent', 'flat', 'percentage')),
  increase_value NUMERIC(10,2) NOT NULL,
  lease_end_date DATE NOT NULL,
  notice_window_start DATE NOT NULL,
  notice_window_end DATE NOT NULL,
  other_modifications TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  pdf_path TEXT,
  notice_sent_at TIMESTAMPTZ,
  response_deadline DATE,
  response_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (response_status IN ('not_sent','pending','accepted','refused','leaving','auto_accepted')),
  responded_at TIMESTAMPTZ,
  tal_deadline DATE,
  tal_filed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rent_increases_lease ON rent_increases(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_increases_tenant ON rent_increases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_increases_property ON rent_increases(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_increases_status ON rent_increases(response_status);
