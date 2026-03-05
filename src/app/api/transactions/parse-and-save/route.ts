// POST /api/transactions/parse-and-save
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parse } from "@/lib/parser";

function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function getSummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  yearMonth: string
) {
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .eq("year_month", yearMonth);

  const income = (txs ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = (txs ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const { data: goal } = await supabase
    .from("goals")
    .select("target_net_profit")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  const target = goal?.target_net_profit ?? 0;
  const progress = target > 0 ? Math.round((net / target) * 100) : 0;
  const remaining = target - net;

  return { income, expense, net, target, progress, remaining };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const text: string = body?.text ?? "";
  // date: "YYYY-MM-DD" (클라이언트 로컬 날짜), 미전달 시 오늘
  const dateStr: string = body?.date ?? new Date().toISOString().slice(0, 10);
  const typeOverride: "income" | "expense" | undefined = body?.typeOverride;

  const parsed = parse(text);
  if (!parsed) {
    return NextResponse.json({ saved: false, error: "금액을 찾지 못했어요" });
  }

  // year_month는 날짜 문자열에서 직접 추출 (타임존 문제 회피)
  const yearMonth = dateStr.slice(0, 7); // "YYYY-MM"
  const createdAt = `${dateStr}T12:00:00+09:00`; // 한국 정오로 저장

  const registeredBy: string =
    user.user_metadata?.display_name ??
    user.email?.split("@")[0] ??
    "알 수 없음";

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      year_month: yearMonth,
      type: typeOverride ?? parsed.type,
      amount: parsed.amount,
      raw_text: parsed.raw_text,
      created_at: createdAt,
      registered_by: registeredBy,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ saved: false, error: error.message }, { status: 500 });
  }

  const summary = await getSummary(supabase, user.id, yearMonth);

  return NextResponse.json({
    saved: true,
    transaction,
    summary,
    suggestions: {
      type_candidates: parsed.type_candidates,
      amount_candidates: parsed.amount_candidates,
      needs_confirm: parsed.needs_confirm,
      reason: parsed.reason,
    },
  });
}
