-- Create cash transfers table
CREATE TABLE IF NOT EXISTS cash_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_method text NOT NULL REFERENCES payment_methods(code),
  to_method text NOT NULL REFERENCES payment_methods(code),
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) NOT NULL,
  CHECK (from_method != to_method)
);

-- Enable RLS
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable admin read access for transfers"
ON cash_transfers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for transfers"
ON cash_transfers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transfers_from_method ON cash_transfers(from_method);
CREATE INDEX IF NOT EXISTS idx_transfers_to_method ON cash_transfers(to_method);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON cash_transfers(created_at);

-- Update payment method totals view to include transfers
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
  GROUP BY payment_method
),
transfer_totals AS (
  SELECT 
    from_method as payment_method,
    SUM(amount) as transfers_out
  FROM cash_transfers
  GROUP BY from_method
  UNION ALL
  SELECT 
    to_method as payment_method,
    -SUM(amount) as transfers_out
  FROM cash_transfers
  GROUP BY to_method
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
  COALESCE(SUM(tt.transfers_out), 0) as total_transfers,
  (
    st.total_amount - 
    COALESCE(wt.total_withdrawals, 0) + 
    COALESCE(SUM(tt.transfers_out), 0)
  ) as available_amount
FROM sales_totals st
LEFT JOIN withdrawal_totals wt ON st.payment_method = wt.payment_method
LEFT JOIN transfer_totals tt ON st.payment_method = tt.payment_method
GROUP BY 
  st.payment_method,
  st.payment_method_name,
  st.number_of_sales,
  st.first_sale,
  st.last_sale,
  st.total_amount,
  st.average_sale_amount,
  wt.total_withdrawals
ORDER BY st.total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;