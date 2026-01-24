-- =========================================================
-- Payments idempotency support
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.payments
      ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user_idempotency_key_unique
  ON public.payments(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

