// GET /api/summary?month=YYYY-MM
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/getProfile";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month 파라미터 필요" }, { status: 400 });

  const profile = await getProfile(supabase, user.id);
  const householdId = profile?.household_id ?? null;

  // 거래 내역 조회 (가족 or 개인)
  const txQuery = supabase
    .from("transactions")
    .select("type, amount")
    .eq("year_month", month);

  if (householdId) {
    txQuery.eq("household_id", householdId);
  } else {
    txQuery.eq("user_id", user.id);
  }

  const { data: txs } = await txQuery;

  const income = (txs ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = (txs ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // 목표 조회
  const goalQuery = supabase
    .from("goals")
    .select("target_net_profit")
    .eq("year_month", month);

  if (householdId) {
    goalQuery.eq("household_id", householdId);
  } else {
    goalQuery.eq("user_id", user.id);
  }

  const { data: goal } = await goalQuery.maybeSingle();

  const target = goal?.target_net_profit ?? 0;
  const progress = target > 0 ? Math.round((net / target) * 100) : 0;
  const remaining = target - net;

  return NextResponse.json({ income, expense, net, target, progress, remaining });
}
