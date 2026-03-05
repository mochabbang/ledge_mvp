# 04. 데이터 모델

## 1) Goal (월 목표)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | uuid | FK → auth.users |
| `year_month` | text | "YYYY-MM" (PK 일부) |
| `target_net_profit` | int | 월 순수익 목표 (원) |
| `created_at` | timestamptz | 자동 생성 |
| `updated_at` | timestamptz | 자동 갱신 |

제약: `UNIQUE (user_id, year_month)` → upsert on conflict

---

## 2) Transaction (거래 내역)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK, 기본값 `gen_random_uuid()` |
| `user_id` | uuid | FK → auth.users (RLS 기준) |
| `year_month` | text | "YYYY-MM" — 월별 조회 인덱스 |
| `type` | text | `"income"` 또는 `"expense"` |
| `amount` | int | 원 단위 정수 |
| `raw_text` | text | 사용자 입력 원문 |
| `created_at` | timestamptz | 거래 일시 (한국 정오로 저장) |
| `registered_by` | text | 등록자 닉네임 (`user_metadata.display_name` fallback: 이메일 앞부분) |

> `created_at`은 클라이언트가 전달한 날짜(`YYYY-MM-DD`)를 기준으로 서버에서 `${date}T12:00:00+09:00`으로 설정 (타임존 문제 방지)

---

## 3) RLS 정책

두 테이블 모두:
- `SELECT`: `user_id = auth.uid()`
- `INSERT`: `user_id = auth.uid()`
- `UPDATE`: `user_id = auth.uid()`
- `DELETE`: `user_id = auth.uid()`

---

## 4) Supabase 마이그레이션 이력

```sql
-- 초기 스키마
-- docs/05_supabase_schema.sql 참고

-- registered_by 컬럼 추가 (가족 공유 기능)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS registered_by text;
```

---

## 5) 집계 방식

- 서버에서 실시간 계산 (캐시 없음)
- `GET /api/summary?month=YYYY-MM` → `{ income, expense, net, target, progress, remaining }`
- `progress = Math.round((net / target) * 100)` (target=0이면 0)
- `remaining = target - net`
