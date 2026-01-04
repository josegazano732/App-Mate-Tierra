-- Create reversals table to track all reversals
CREATE TABLE IF NOT EXISTS cash_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_type text NOT NULL CHECK (original_type IN ('withdrawal', 'transfer')),
  original_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE cash_reversals ENABLE ROW LEVEL SECURITY;

-- Create policies for reversals
CREATE POLICY "Enable admin read access for reversals"
ON cash_reversals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for reversals"
ON cash_reversals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Add reversed_at column to withdrawals and transfers
ALTER TABLE cash_withdrawals 
ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES users(id);

ALTER TABLE cash_transfers 
ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reversals_original_id ON cash_reversals(original_id);
CREATE INDEX IF NOT EXISTS idx_reversals_created_at ON cash_reversals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reversed_at ON cash_withdrawals(reversed_at);
CREATE INDEX IF NOT EXISTS idx_transfers_reversed_at ON cash_transfers(reversed_at);

-- Update payment method totals view to exclude reversed transactions
DROP VIEW IF EXISTS payment_method_totals;

CREATE OR REPLACE VIEW payment_method_totals AS
WITH sales_totals AS (
  SELECT 
    s.payment_method,
    pm.name as payment_method_name,
    COUNT(*) as number_of_sales,
    MIN(s.created_at) as first_sale,
    MAX(s.created_at) as last_sale,
    SUM(s.total_amount) as total_amount,
    ROUND(AVG(s.total_amount), 2) as average_sale_amount
  FROM sales s
  JOIN payment_methods pm ON pm.code = s.payment_method
  WHERE s.status = 'completed'
  GROUP BY s.payment_method, pm.name
),
withdrawal_totals AS (
  SELECT 
    payment_method,
    SUM(amount) as total_withdrawals
  FROM cash_withdrawals
  WHERE reversed_at IS NULL
  GROUP BY payment_method
),
transfer_totals AS (
  SELECT 
    payment_method,
    SUM(CASE 
      WHEN payment_method = from_method THEN -amount
      WHEN payment_method = to_method THEN amount
      ELSE 0
    END) as net_transfers
  FROM (
    SELECT from_method as payment_method, from_method, to_method, amount 
    FROM cash_transfers
    WHERE reversed_at IS NULL
    UNION ALL
    SELECT to_method as payment_method, from_method, to_method, amount 
    FROM cash_transfers
    WHERE reversed_at IS NULL
  ) t
  GROUP BY payment_method
)
SELECT 
  st.payment_method,
  st.payment_method_name,
  st.number_of_sales,
  st.first_sale,
  st.last_sale,
  st.total_amount,
  st.average_sale_amount,
  COALESCE(wt.total_withdrawals, 0) as total_withdrawals,
  COALESCE(tt.net_transfers, 0) as total_transfers,
  (
    st.total_amount - 
    COALESCE(wt.total_withdrawals, 0) + 
    COALESCE(tt.net_transfers, 0)
  ) as available_amount
FROM sales_totals st
LEFT JOIN withdrawal_totals wt ON st.payment_method = wt.payment_method
LEFT JOIN transfer_totals tt ON st.payment_method = tt.payment_method
ORDER BY st.total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;