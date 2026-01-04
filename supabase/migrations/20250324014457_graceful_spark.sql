/*
  # Fix Cash Withdrawals RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies that properly handle authentication
    - Ensure proper admin role checks

  2. Security
    - Maintain data integrity
    - Allow proper access for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin read access for withdrawals" ON cash_withdrawals;
DROP POLICY IF EXISTS "Enable admin insert access for withdrawals" ON cash_withdrawals;

-- Create new policies for cash_withdrawals table
CREATE POLICY "Enable authenticated read access for withdrawals"
ON cash_withdrawals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable authenticated insert access for withdrawals"
ON cash_withdrawals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  AND auth.uid() = created_by
);

-- Ensure RLS is enabled
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;