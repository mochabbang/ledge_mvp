// 03_parsing_rules.md 규칙을 그대로 구현 (LLM 금지, 정규식/키워드만)

export interface ParseResult {
  raw_text: string;
  type: "income" | "expense";
  amount: number;
  needs_confirm: boolean;
  type_candidates: Array<"income" | "expense">;
  amount_candidates: number[];
  payment_method: "card" | "cash";
  installment_months: number;
  reason: {
    matched_amount: string;
    matched_type_keyword: string;
  };
}

// 결제수단 감지
function extractPaymentMethod(text: string): "card" | "cash" {
  if (/카드|신용카드|체크카드/.test(text)) return "card";
  if (/현금/.test(text)) return "cash";
  return "cash"; // 기본값
}

// 할부 개월 수 감지 ("3할부", "할부3", "3개월할부", "할부3개월")
function extractInstallmentMonths(text: string): number {
  const m =
    text.match(/(\d+)\s*개월\s*할부/) ??
    text.match(/할부\s*(\d+)\s*개월/) ??
    text.match(/(\d+)\s*할부/) ??
    text.match(/할부\s*(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 2 && n <= 60) return n;
  }
  return 1; // 일시불
}

// 3-1. 키워드 사전
const EXPENSE_KEYWORDS = [
  "광고", "임대", "식비", "점심", "커피", "교통", "세금",
  "보험", "구독", "장비", "구매", "결제",
];
const INCOME_KEYWORDS = [
  "외주", "강의", "급여", "정산", "입금", "수익", "매출",
];

// 3-2. 타입 판별 (결정적)
function classifyType(text: string): {
  type: "income" | "expense";
  matchedKeyword: string;
  hasConflict: boolean;
} {
  const hasExpense = EXPENSE_KEYWORDS.some((k) => text.includes(k));
  const hasIncome = INCOME_KEYWORDS.some((k) => text.includes(k));
  const expenseKeyword = EXPENSE_KEYWORDS.find((k) => text.includes(k)) ?? "";
  const incomeKeyword = INCOME_KEYWORDS.find((k) => text.includes(k)) ?? "";

  if (hasExpense && hasIncome) {
    // 동점: 지출 우선 + conflict
    return { type: "expense", matchedKeyword: expenseKeyword, hasConflict: true };
  }
  if (hasExpense) {
    return { type: "expense", matchedKeyword: expenseKeyword, hasConflict: false };
  }
  if (hasIncome) {
    return { type: "income", matchedKeyword: incomeKeyword, hasConflict: false };
  }
  // 3-2-3: 둘 다 없으면 기본 expense
  return { type: "expense", matchedKeyword: "", hasConflict: false };
}

// 2-3. 금액 추출 (우선순위대로)
interface AmountMatch {
  amount: number;
  matched: string;
  needsConfirm: boolean;
  candidates: number[];
}

function extractAmount(text: string): AmountMatch | null {
  // 우선순위 1: 소수점+만 단위
  const decimalManPattern = /(\d+(?:\.\d+)?)\s*(만원|만)/;
  const m1 = text.match(decimalManPattern);
  if (m1) {
    const amount = Math.round(parseFloat(m1[1]) * 10000);
    return {
      amount,
      matched: m1[0],
      needsConfirm: false,
      candidates: [],
    };
  }

  // 우선순위 2: 정수 + 단위
  const unitPattern = /(\d+)\s*(만원|만|천원|천|원)/;
  const m2 = text.match(unitPattern);
  if (m2) {
    const num = parseInt(m2[1], 10);
    const unit = m2[2];
    let amount: number;
    if (unit === "만원" || unit === "만") amount = num * 10000;
    else if (unit === "천원" || unit === "천") amount = num * 1000;
    else amount = num; // 원
    return {
      amount,
      matched: m2[0],
      needsConfirm: false,
      candidates: [],
    };
  }

  // 우선순위 3: 단위 없는 가장 큰 정수 토큰
  const allNums = [...text.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (allNums.length > 0) {
    const biggest = Math.max(...allNums);
    const needsConfirm = biggest < 1000; // 4자리 미만
    const candidates = needsConfirm ? [biggest, biggest * 1000] : [];
    return {
      amount: biggest,
      matched: String(biggest),
      needsConfirm,
      candidates,
    };
  }

  return null;
}

export function parse(text: string): ParseResult | null {
  const raw_text = text.trim();
  if (!raw_text) return null;

  const amountMatch = extractAmount(raw_text);
  // 금액을 찾지 못하면 null 반환
  if (!amountMatch) return null;

  const { type, matchedKeyword, hasConflict } = classifyType(raw_text);

  const type_candidates: Array<"income" | "expense"> =
    hasConflict || type === "expense"
      ? ["expense", "income"]
      : ["income", "expense"];

  return {
    raw_text,
    type,
    amount: amountMatch.amount,
    needs_confirm: amountMatch.needsConfirm,
    type_candidates,
    amount_candidates: amountMatch.candidates,
    payment_method: extractPaymentMethod(raw_text),
    installment_months: extractInstallmentMonths(raw_text),
    reason: {
      matched_amount: amountMatch.matched,
      matched_type_keyword: matchedKeyword,
    },
  };
}
