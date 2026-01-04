/*
  # Fix Product Deletion and Payment Method Validation

  1. Changes
    - Modify sale_items foreign key to SET NULL on product deletion
    - Update sales payment_method check constraint
    - Add function to validate payment methods

  2. Security
    - Maintain existing RLS policies
*/

-- First modify the sale_items foreign key to SET NULL
ALTER TABLE sale_items 
  DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey,
  ADD CONSTRAINT sale_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE SET NULL;

-- Update sales payment_method check constraint
ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- Create function to validate payment methods
CREATE OR REPLACE FUNCTION validate_payment_methods(methods text)
RETURNS boolean AS $$
DECLARE
  method_array text[];
  method text;
BEGIN
  -- Split the input string into an array
  method_array := string_to_array(methods, ',');
  
  -- Check each method
  FOREACH method IN ARRAY method_array
  LOOP
    -- Return false if any method doesn't exist or is inactive
    IF NOT EXISTS (
      SELECT 1 FROM payment_methods 
      WHERE code = method 
      AND active = true
    ) THEN
      RETURN false;
    END IF;
  END LOOP;
  
  -- All methods are valid
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add new constraint with validation
ALTER TABLE sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (
    payment_method ~ '^[a-z]+(,[a-z]+)*$' AND
    validate_payment_methods(payment_method)
  );