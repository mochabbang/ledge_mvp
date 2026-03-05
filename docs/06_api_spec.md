# 06. API 설계

모든 API는 Supabase Auth 쿠키 기반 인증. 미인증 시 `401` 반환.

---

## 1) POST `/api/transactions/parse-and-save`

거래 텍스트를 파싱하고 저장. 클라이언트가 미리보기에서 수입/지출을 변경했을 경우 `typeOverride`로 전달.

**Request:**
```json
{
  "text": "외주 50만원",
  "date": "2026-03-04",
  "typeOverride": "income"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `text` | string | ✅ | 사용자 입력 원문 |
| `date` | string | ✅ | 클라이언트 로컬 날짜 `YYYY-MM-DD` |
| `typeOverride` | `"income"` \| `"expense"` | ❌ | 사용자가 입력창에서 직접 전환한 타입 |

**서버 처리:**
1. `parse(text)` → 금액 추출, 타입 자동 판별
2. `year_month = date.slice(0, 7)`
3. `type = typeOverride ?? parsed.type`
4. `registered_by = user_metadata.display_name ?? email.split('@')[0]`
5. `created_at = ${date}T12:00:00+09:00`
6. `transactions` 테이블에 insert

**Response (성공):**
```json
{
  "saved": true,
  "transaction": {
    "id": "uuid",
    "user_id": "uuid",
    "year_month": "2026-03",
    "type": "income",
    "amount": 500000,
    "raw_text": "외주 50만원",
    "created_at": "2026-03-04T12:00:00+09:00",
    "registered_by": "엄마"
  },
  "summary": {
    "income": 500000,
    "expense": 0,
    "net": 500000,
    "target": 3000000,
    "progress": 16,
    "remaining": 2500000
  },
  "suggestions": {
    "type_candidates": ["income", "expense"],
    "amount_candidates": [],
    "needs_confirm": false,
    "reason": {
      "matched_amount": "50만원",
      "matched_type_keyword": "외주"
    }
  }
}
```

**Response (실패):**
```json
{ "saved": false, "error": "금액을 찾지 못했어요" }
```

---

## 2) POST `/api/transactions/{id}/update`

거래 내역 수정 (인라인 편집).

**Request:**
```json
{
  "type": "expense",
  "amount": 15000,
  "raw_text": "점심 식사"
}
```
모든 필드 optional. 변경할 필드만 포함.

**Response:** `200 OK` / `404` / `500`

---

## 3) DELETE `/api/transactions/{id}`

거래 삭제. RLS로 본인 데이터만 삭제 가능.

**Response:** `200 OK` / `404` / `500`

---

## 4) GET `/api/summary?month=YYYY-MM`

월별 집계.

**Response:**
```json
{
  "income": 2000000,
  "expense": 600000,
  "net": 1400000,
  "target": 3000000,
  "progress": 46,
  "remaining": 1600000
}
```

---

## 5) POST `/api/goal/set`

월 목표 upsert.

**Request:**
```json
{
  "month": "2026-03",
  "target_net_profit": 3000000
}
```

**Response:** `200 OK` / `500`
