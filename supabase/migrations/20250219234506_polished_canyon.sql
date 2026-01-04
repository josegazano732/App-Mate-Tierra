/*
  # Add Cash Incomes Table

  1. New Tables
    - `cash_incomes`
      - `id` (uuid, primary key)
      - `payment_method` (text, references payment_methods)
      - `amount` (decimal)
      - `description` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references users)

  2. Security
    - Enable RLS on `cash_incomes` table
    - Add policies for admin access
*/

-- Create cash incomes table
CREATE TABLE IF NOT EXISTS cash_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL REFERENCES payment_methods(code),
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE cash_incomes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable admin read access for incomes"
ON cash_incomes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for incomes"
ON cash_incomes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incomes_payment_method ON cash_incomes(payment_method);
CREATE INDEX IF NOT EXISTS idx_incomes_created_at ON cash_incomes(created_at);

-- Update payment method totals view to include incomes
DROP VIEW IF EXISTS payment_method_totals;

CREATE VIEW payment_method_totals AS
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
income_totals AS (
  SELECT 
    payment_method,
    SUM(amount) as total_incomes
  FROM cash_incomes
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
  COALESCE(it.total_incomes, 0) as total_incomes,
  (
    st.total_amount - 
    COALESCE(wt.total_withdrawals, 0) + 
    COALESCE(it.total_incomes, 0)
  ) as available_amount
FROM sales_totals st
LEFT JOIN withdrawal_totals wt ON st.payment_method = wt.payment_method
LEFT JOIN income_totals it ON st.payment_method = it.payment_method
ORDER BY st.total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;