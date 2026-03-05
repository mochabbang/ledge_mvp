-- ================================================
-- 가족 공유 기능 마이그레이션
-- Supabase Dashboard > SQL Editor 에서 실행
-- ================================================

-- 1. households 테이블 (가족 그룹)
CREATE TABLE IF NOT EXISTS public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. profiles 테이블 (닉네임 + 가족 연결)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- 3. transactions 에 household_id 추가
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id);

-- 4. goals 에 household_id 추가
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id);

-- 5. goals household 유니크 인덱스 (가족별 월 1개 목표)
CREATE UNIQUE INDEX IF NOT EXISTS goals_household_month
  ON public.goals(household_id, year_month)
  WHERE household_id IS NOT NULL;

-- 6. 내 household_id 반환 헬퍼 함수 (RLS 에서 사용)
CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT household_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ================================================
-- 7. households RLS
-- ================================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view household" ON public.households;
CREATE POLICY "members can view household" ON public.households
  FOR SELECT USING (auth.role() = 'authenticated');
  -- 초대 코드 조회를 위해 인증 사용자 전체 허용 (코드만 공개)

DROP POLICY IF EXISTS "users can create household" ON public.households;
CREATE POLICY "users can create household" ON public.households
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ================================================
-- 8. profiles RLS
-- ================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profile full access" ON public.profiles;
CREATE POLICY "own profile full access" ON public.profiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "household members can view profiles" ON public.profiles;
CREATE POLICY "household members can view profiles" ON public.profiles
  FOR SELECT USING (
    household_id IS NOT NULL
    AND household_id = public.get_my_household_id()
  );

-- ================================================
-- 9. transactions RLS 교체
-- ================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "view household transactions" ON public.transactions
  FOR SELECT USING (
    (household_id IS NOT NULL AND household_id = public.get_my_household_id())
    OR (household_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "insert household transactions" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own transactions" ON public.transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete own transactions" ON public.transactions
  FOR DELETE USING (user_id = auth.uid());

-- ================================================
-- 10. goals RLS 교체
-- ================================================
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "view household goals" ON public.goals
  FOR SELECT USING (
    (household_id IS NOT NULL AND household_id = public.get_my_household_id())
    OR (household_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "insert household goals" ON public.goals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own goals" ON public.goals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete own goals" ON public.goals
  FOR DELETE USING (user_id = auth.uid());
