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

  const yearMonth = dateStr.slice(0, 7);
  const createdAt = `${dateStr}T12:00:00+09:00`;

  const profile = await getProfile(supabase, user.id);
  const householdId = profile?.household_id ?? null;

  const registeredBy: string =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "알 수 없음";

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      household_id: householdId,
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

  // summary 재계산
  const txQuery = supabase.from("transactions").select("type, amount").eq("year_month", yearMonth);
  if (householdId) txQuery.eq("household_id", householdId);
  else txQuery.eq("user_id", user.id);
  const { data: txs } = await txQuery;

  const income = (txs ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = (txs ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const goalQuery = supabase.from("goals").select("target_net_profit").eq("year_month", yearMonth);
  if (householdId) goalQuery.eq("household_id", householdId);
  else goalQuery.eq("user_id", user.id);
  const { data: goal } = await goalQuery.maybeSingle();

  const target = goal?.target_net_profit ?? 0;
  const progress = target > 0 ? Math.round((net / target) * 100) : 0;

  return NextResponse.json({
    saved: true,
    transaction,
    summary: { income, expense, net, target, progress, remaining: target - net },
    suggestions: {
      type_candidates: parsed.type_candidates,
      amount_candidates: parsed.amount_candidates,
      needs_confirm: parsed.needs_confirm,
      reason: parsed.reason,
    },
  });
}
