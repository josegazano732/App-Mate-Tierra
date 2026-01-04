-- Drop existing view
DROP VIEW IF EXISTS payment_method_totals;

-- Create updated view with corrected transfer calculations
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
    payment_method,
    SUM(CASE 
      WHEN payment_method = from_method THEN -amount  -- Resta cuando es origen
      WHEN payment_method = to_method THEN amount     -- Suma cuando es destino
      ELSE 0
    END) as net_transfers
  FROM (
    SELECT from_method as payment_method, from_method, to_method, amount FROM cash_transfers
    UNION ALL
    SELECT to_method as payment_method, from_method, to_method, amount FROM cash_transfers
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