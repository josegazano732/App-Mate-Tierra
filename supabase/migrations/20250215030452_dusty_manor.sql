-- Drop existing view if it exists
DROP VIEW IF EXISTS payment_method_totals;

-- Create a simplified view for payment method totals
CREATE OR REPLACE VIEW payment_method_totals AS
SELECT 
  s.payment_method as payment_method,
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
ORDER BY total_amount DESC;

-- Grant access to the view
GRANT SELECT ON payment_method_totals TO authenticated;