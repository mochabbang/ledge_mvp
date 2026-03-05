// GET /api/summary?month=YYYY-MM
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month 파라미터 필요" }, { status: 400 });

  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .eq("year_month", month);

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
    .eq("user_id", user.id)
    .eq("year_month", month)
    .maybeSingle();

  const target = goal?.target_net_profit ?? 0;
  const progress = target > 0 ? Math.round((net / target) * 100) : 0;
  const remaining = target - net;

  return NextResponse.json({ income, expense, net, target, progress, remaining });
}
