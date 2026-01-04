-- Drop existing view
DROP VIEW IF EXISTS payment_method_totals;

-- Create updated view for payment method totals that includes withdrawals
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
  (st.total_amount - COALESCE(wt.total_withdrawals, 0)) as available_amount
FROM sales_totals st
LEFT JOIN withdrawal_totals wt ON st.payment_method = wt.payment_method
ORDER BY st.total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;