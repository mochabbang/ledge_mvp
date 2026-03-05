# 07. 구현 현황 & 로드맵

## ✅ 완료된 기능

### 기반 구축
- [x] Next.js 14 App Router + TypeScript + Tailwind CSS 프로젝트 셋업
- [x] Supabase Auth (이메일/패스워드) + RLS 완전 적용
- [x] `goals` / `transactions` 테이블 생성 (`docs/05_supabase_schema.sql`)
- [x] 환경변수 설정 (`.env.local`)

### 파싱 & 저장
- [x] 정규식/키워드 파서 (`src/lib/parser.ts`) — LLM 없음
- [x] `POST /api/transactions/parse-and-save`
  - [x] `date` 파라미터 (과거 날짜 등록)
  - [x] `typeOverride` 파라미터 (사용자 수동 전환)
  - [x] `registered_by` 자동 삽입 (닉네임 → 이메일 앞부분 fallback)
- [x] `POST /api/transactions/{id}/update`
- [x] `DELETE /api/transactions/{id}`
- [x] `GET /api/summary?month=YYYY-MM`
- [x] `POST /api/goal/set`

### UI
- [x] 로그인 페이지 (`/login`)
- [x] 온보딩 페이지 (`/onboarding`) — 닉네임 + 목표 금액 입력
- [x] 대시보드 (`/dashboard`)
  - [x] 월 네비게이터 (‹ 2026년 3월 ›, 미래 잠금)
  - [x] KPI 카드 (목표/순수익/달성률/총수입/총지출)
  - [x] 진행바
  - [x] 일별 수입·지출 바 차트 (호버 툴팁)
  - [x] 입력창 — 날짜 선택기 + 실시간 파싱 미리보기 + 수입/지출 토글
  - [x] 내역 리스트 — 날짜별 그룹 + 일별 소계
  - [x] 인라인 수정 (아코디언) — 내용/타입/금액/저장/삭제
  - [x] 등록자 닉네임 뱃지 (`registered_by`)
  - [x] 토스트 알림

### DB 마이그레이션
- [x] `registered_by text` 컬럼 추가
  ```sql
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS registered_by text;
  ```

---

## 🔜 다음 단계 후보

### 안정성
- [ ] 파서 단위 테스트 CI 연동 (`npm test`)
- [ ] 에러 바운더리 (API 장애 시 fallback UI)

### 기능 확장
- [ ] 거래 30건 초과 시 페이지네이션 or 무한 스크롤
- [ ] 카테고리 태그 (자유 태그 입력)
- [ ] 월별 요약 내보내기 (CSV)
- [ ] 가족 멤버 관리 (초대 링크)

### 배포
- [ ] Vercel 배포 (권장)
- [ ] Termux 자체 서버 배포 → `docs/09_deployment_termux.md` 참고

---

## KPI (목표)
- 목표 설정 완료율 ≥ 70%
- 7일 유지율 ≥ 25%
- 1주 3회 이상 입력 비율 ≥ 30%
