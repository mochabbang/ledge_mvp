// POST /api/transactions/parse-and-save
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parse } from "@/lib/parser";
import { getProfile } from "@/lib/supabase/getProfile";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const text: string = body?.text ?? "";
  const dateStr: string = body?.date ?? new Date().toISOString().slice(0, 10);
  const typeOverride: "income" | "expense" | undefined = body?.typeOverride;

  const parsed = parse(text);
  if (!parsed) {
    return NextResponse.json({ saved: false, error: "금액을 찾지 못했어요" });
  }

  const profile = await getProfile(supabase, user.id);
  const householdId = profile?.household_id ?? null;
  const registeredBy: string =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "알 수 없음";

  const installmentMonths = parsed.installment_months;
  const perMonthAmount =
    installmentMonths > 1 ? Math.round(parsed.amount / installmentMonths) : parsed.amount;
  const groupId = installmentMonths > 1 ? crypto.randomUUID() : null;

  // 할부 개월 수만큼 레코드 생성
  const records = Array.from({ length: installmentMonths }, (_, i) => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + i);
    const ds = d.toISOString().slice(0, 10);
    return {
      user_id: user.id,
      household_id: householdId,
      year_month: ds.slice(0, 7),
      type: typeOverride ?? parsed.type,
      amount: perMonthAmount,
      raw_text: parsed.raw_text,
      payment_method: parsed.payment_method,
      installment_months: installmentMonths,
      installment_group_id: groupId,
      created_at: `${ds}T12:00:00+09:00`,
      registered_by: registeredBy,
    };
  });

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert(records)
    .select();

  if (error) {
    return NextResponse.json({ saved: false, error: error.message }, { status: 500 });
  }

  // summary 재계산 (병렬 조회)
  const yearMonth = dateStr.slice(0, 7);
  let txQ = supabase.from("transactions").select("type, amount").eq("year_month", yearMonth);
  txQ = householdId ? txQ.eq("household_id", householdId) : txQ.eq("user_id", user.id);

  let goalQ = supabase.from("goals").select("target_net_profit").eq("year_month", yearMonth);
  goalQ = householdId ? goalQ.eq("household_id", householdId) : goalQ.eq("user_id", user.id);

  const [{ data: txs }, { data: goal }] = await Promise.all([txQ, goalQ.maybeSingle()]);

  const income = (txs ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = (txs ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const target = goal?.target_net_profit ?? 0;
  const progress = target > 0 ? Math.round((net / target) * 100) : 0;

  return NextResponse.json({
    saved: true,
    transaction: inserted?.[0],
    summary: { income, expense, net, target, progress, remaining: target - net },
    suggestions: {
      type_candidates: parsed.type_candidates,
      amount_candidates: parsed.amount_candidates,
      needs_confirm: parsed.needs_confirm,
      reason: parsed.reason,
    },
  });
}
