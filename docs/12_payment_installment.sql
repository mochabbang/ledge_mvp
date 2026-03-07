-- ================================================
-- 결제수단 + 할부 기능 마이그레이션
-- Supabase Dashboard > SQL Editor 에서 실행
-- ================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('card', 'cash')),
  ADD COLUMN IF NOT EXISTS installment_months integer NOT NULL DEFAULT 1
    CHECK (installment_months >= 1 AND installment_months <= 60),
  ADD COLUMN IF NOT EXISTS installment_group_id uuid;
