-- Create cash withdrawals table
CREATE TABLE IF NOT EXISTS cash_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL REFERENCES payment_methods(code),
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable admin read access for withdrawals"
ON cash_withdrawals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for withdrawals"
ON cash_withdrawals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_method ON cash_withdrawals(payment_method);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON cash_withdrawals(created_at);