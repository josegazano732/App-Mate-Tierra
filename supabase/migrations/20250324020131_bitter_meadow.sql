-- Drop existing policies
DROP POLICY IF EXISTS "Enable authenticated read access for withdrawals" ON cash_withdrawals;
DROP POLICY IF EXISTS "Enable authenticated insert access for withdrawals" ON cash_withdrawals;

-- Create new policies for cash_withdrawals table with proper admin role check
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
  AND created_by = auth.uid()
);

-- Add policy for admin updates
CREATE POLICY "Enable admin update access for withdrawals"
ON cash_withdrawals FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;