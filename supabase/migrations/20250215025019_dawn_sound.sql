-- Create a view for payment method totals
CREATE OR REPLACE VIEW payment_method_totals AS
WITH split_methods AS (
  SELECT 
    s.id,
    s.created_at,
    s.status,
    s.total_amount,
    unnest(string_to_array(s.payment_method, ',')) as method,
    unnest(s.payment_splits) as split_data
  FROM sales s
  WHERE s.status = 'completed'
),
payment_totals AS (
  SELECT 
    sm.method as payment_method,
    pm.name as payment_method_name,
    COUNT(DISTINCT sm.id) as number_of_sales,
    MIN(sm.created_at) as first_sale,
    MAX(sm.created_at) as last_sale,
    SUM(
      COALESCE(
        ((sm.split_data->>'amount')::decimal)::numeric,
        sm.total_amount / (array_length(string_to_array(s.payment_method, ','), 1))::numeric
      )
    ) as total_amount
  FROM split_methods sm
  JOIN payment_methods pm ON pm.code = sm.method
  JOIN sales s ON s.id = sm.id
  WHERE (sm.split_data->>'method')::text = sm.method 
     OR sm.split_data IS NULL
  GROUP BY sm.method, pm.name
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