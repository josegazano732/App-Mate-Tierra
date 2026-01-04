-- Create a view for payment method totals
CREATE OR REPLACE VIEW payment_method_totals AS
WITH split_payments AS (
  SELECT 
    s.id,
    s.created_at,
    s.status,
    s.total_amount,
    s.payment_splits[0]::jsonb as split_data
  FROM sales s
  WHERE s.status = 'completed'
),
payment_totals AS (
  SELECT 
    (split_data->>'method')::text as payment_method,
    pm.name as payment_method_name,
    COUNT(DISTINCT sp.id) as number_of_sales,
    MIN(sp.created_at) as first_sale,
    MAX(sp.created_at) as last_sale,
    SUM((split_data->>'amount')::decimal) as total_amount
  FROM split_payments sp
  JOIN payment_methods pm ON pm.code = (split_data->>'method')
  GROUP BY split_data->>'method', pm.name
)
SELECT 
  payment_method,
  payment_method_name,
  total_amount,
  number_of_sales,
  first_sale,
  last_sale,
  ROUND(total_amount / NULLIF(number_of_sales, 0), 2) as average_sale_amount
FROM payment_totals
ORDER BY total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;