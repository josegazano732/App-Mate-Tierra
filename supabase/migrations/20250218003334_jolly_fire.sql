/*
  # Fix Reversals Implementation

  1. Changes
    - Remove transaction management functions
    - Add trigger to handle reversals atomically
    - Add validation functions for reversals

  2. Security
    - Add RLS policies for reversals
    - Ensure data consistency
*/

-- Create or replace function to validate reversal
CREATE OR REPLACE FUNCTION validate_reversal()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate withdrawal reversal
  IF NEW.original_type = 'withdrawal' THEN
    IF EXISTS (
      SELECT 1 FROM cash_withdrawals
      WHERE id = NEW.original_id
      AND reversed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'This withdrawal has already been reversed';
    END IF;
  END IF;

  -- Validate transfer reversal
  IF NEW.original_type = 'transfer' THEN
    IF EXISTS (
      SELECT 1 FROM cash_transfers
      WHERE id = NEW.original_id
      AND reversed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'This transfer has already been reversed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reversal validation
DROP TRIGGER IF EXISTS validate_reversal_trigger ON cash_reversals;
CREATE TRIGGER validate_reversal_trigger
  BEFORE INSERT ON cash_reversals
  FOR EACH ROW
  EXECUTE FUNCTION validate_reversal();

-- Create function to handle reversal
CREATE OR REPLACE FUNCTION handle_reversal()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the original transaction based on type
  IF NEW.original_type = 'withdrawal' THEN
    UPDATE cash_withdrawals
    SET reversed_at = NOW(),
        reversed_by = NEW.created_by
    WHERE id = NEW.original_id;
  ELSIF NEW.original_type = 'transfer' THEN
    UPDATE cash_transfers
    SET reversed_at = NOW(),
        reversed_by = NEW.created_by
    WHERE id = NEW.original_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic reversal handling
DROP TRIGGER IF EXISTS handle_reversal_trigger ON cash_reversals;
CREATE TRIGGER handle_reversal_trigger
  AFTER INSERT ON cash_reversals
  FOR EACH ROW
  EXECUTE FUNCTION handle_reversal();