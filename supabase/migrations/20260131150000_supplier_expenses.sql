/*
  # Supplier expenses and payments

  1. New Tables
    - `supplier_expenses`
      - `id` (uuid, primary key)
      - `supplier_name` (text)
      - `description` (text)
      - `total_amount` (decimal)
      - `created_at` (timestamptz)
      - `created_by` (uuid)
    - `supplier_expense_splits`
      - `id` (uuid, primary key)
      - `expense_id` (uuid, references supplier_expenses)
      - `payment_method` (text, references payment_methods)
      - `amount` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS and admin-only policies

  3. Updates
    - Extend `payment_method_totals` to subtract supplier expenses
*/

-- Supplier expenses header table
CREATE TABLE IF NOT EXISTS supplier_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  description text NOT NULL,
  total_amount decimal(10,2) NOT NULL CHECK (total_amount > 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) NOT NULL
);

-- Supplier expense splits by payment method
CREATE TABLE IF NOT EXISTS supplier_expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES supplier_expenses(id) ON DELETE CASCADE NOT NULL,
  payment_method text NOT NULL REFERENCES payment_methods(code),
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE supplier_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_expense_splits ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_expenses
CREATE POLICY "Enable admin read access for supplier expenses"
ON supplier_expenses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for supplier expenses"
ON supplier_expenses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  AND created_by = auth.uid()
);

-- Policies for supplier_expense_splits
CREATE POLICY "Enable admin read access for supplier expense splits"
ON supplier_expense_splits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM supplier_expenses se
    JOIN users u ON u.id = auth.uid()
    WHERE se.id = supplier_expense_splits.expense_id
    AND u.role = 'admin'
  )
);

CREATE POLICY "Enable admin insert access for supplier expense splits"
ON supplier_expense_splits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM supplier_expenses se
    JOIN users u ON u.id = auth.uid()
    WHERE se.id = supplier_expense_splits.expense_id
    AND u.role = 'admin'
    AND se.created_by = auth.uid()
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_expenses_created_at ON supplier_expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_expense_splits_expense_id ON supplier_expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_supplier_expense_splits_payment_method ON supplier_expense_splits(payment_method);

-- Update payment method totals view to include supplier expenses
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
),
expense_totals AS (
  SELECT
    payment_method,
    SUM(amount) as total_expenses
  FROM supplier_expense_splits
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
  COALESCE(et.total_expenses, 0) as total_expenses,
  (
    st.total_amount - 
    COALESCE(wt.total_withdrawals, 0) -
    COALESCE(et.total_expenses, 0) + 
    COALESCE(it.total_incomes, 0)
  ) as available_amount
FROM sales_totals st
LEFT JOIN withdrawal_totals wt ON st.payment_method = wt.payment_method
LEFT JOIN income_totals it ON st.payment_method = it.payment_method
LEFT JOIN expense_totals et ON st.payment_method = et.payment_method
ORDER BY st.total_amount DESC;

GRANT SELECT ON payment_method_totals TO authenticated;
