-- ================================================
-- goals 테이블 unique index 추가
-- Supabase Dashboard > SQL Editor 에서 실행
-- ================================================

-- 개인 목표: user_id + year_month 유니크 인덱스
-- (PRIMARY KEY가 있으면 중복으로 생성되지만 오류 없음)
CREATE UNIQUE INDEX IF NOT EXISTS goals_user_month
  ON public.goals(user_id, year_month);

-- 가족 목표: household_id + year_month 유니크 인덱스 (household 있는 경우만)
CREATE UNIQUE INDEX IF NOT EXISTS goals_household_month
  ON public.goals(household_id, year_month)
  WHERE household_id IS NOT NULL;
