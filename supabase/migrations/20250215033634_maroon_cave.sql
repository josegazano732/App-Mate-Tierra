-- Add payment_splits column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_splits jsonb[];

-- Create function to validate payment splits
CREATE OR REPLACE FUNCTION validate_payment_splits()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that payment_splits total matches total_amount
  IF NEW.payment_splits IS NOT NULL THEN
    IF (
      SELECT SUM((split->>'amount')::decimal)
      FROM unnest(NEW.payment_splits) AS split
    ) != NEW.total_amount THEN
      RAISE EXCEPTION 'Payment splits total must match total_amount';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate payment splits
DROP TRIGGER IF EXISTS validate_payment_splits_trigger ON sales;
CREATE TRIGGER validate_payment_splits_trigger
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_splits();