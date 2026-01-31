/*
  # Cuenta corriente en ventas

  1. Cambios
    - Agrega customer_name y payment_due_date a sales.
    - Permite el método de pago 'cuenta_corriente' en la restricción.

  2. Seguridad
    - Mantiene RLS previa.
*/

-- Permitir nuevos métodos sin romper valores existentes (solo exige texto no vacío)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IS NOT NULL AND length(trim(payment_method)) > 0);

-- Datos de cuenta corriente
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_due_date date;
