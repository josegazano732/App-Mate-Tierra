-- Create discount settings table
CREATE TABLE IF NOT EXISTS discount_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier1_quantity integer NOT NULL DEFAULT 5 CHECK (tier1_quantity >= 2),
  tier1_discount numeric(5,2) NOT NULL DEFAULT 10 CHECK (tier1_discount > 0 AND tier1_discount < 100),
  tier2_quantity integer NOT NULL DEFAULT 10 CHECK (tier2_quantity > tier1_quantity),
  tier2_discount numeric(5,2) NOT NULL DEFAULT 20 CHECK (tier2_discount > tier1_discount AND tier2_discount < 100),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE discount_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for discount settings"
ON discount_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin access for discount settings"
ON discount_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO discount_settings (id, tier1_quantity, tier1_discount, tier2_quantity, tier2_discount)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  5,
  10,
  10,
  20
)
ON CONFLICT (id) DO UPDATE
SET 
  tier1_quantity = EXCLUDED.tier1_quantity,
  tier1_discount = EXCLUDED.tier1_discount,
  tier2_quantity = EXCLUDED.tier2_quantity,
  tier2_discount = EXCLUDED.tier2_discount;

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_discount_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_settings_timestamp
  BEFORE UPDATE ON discount_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_settings_updated_at();