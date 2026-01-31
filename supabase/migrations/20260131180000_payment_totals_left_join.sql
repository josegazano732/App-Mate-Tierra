/*
  # Include all payment methods in totals view

  1. Changes
    - Use LEFT JOIN to keep sales even if payment method is missing in catalog
    - Fallback to payment_method code when name is not available
*/

DROP VIEW IF EXISTS payment_method_totals;

CREATE VIEW payment_method_totals AS
WITH sales_totals AS (
  SELECT 
    s.payment_method,
    COALESCE(pm.name, s.payment_method) as payment_method_name,
    COUNT(*) as number_of_sales,
    MIN(s.created_at) as first_sale,
    MAX(s.created_at) as last_sale,
    SUM(s.total_amount) as total_amount,
    ROUND(AVG(s.total_amount), 2) as average_sale_amount
  FROM sales s
  LEFT JOIN payment_methods pm ON pm.code = s.payment_method
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
