// POST /api/goal/set
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/getProfile";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { month, target_net_profit } = body;

  if (!month || typeof target_net_profit !== "number" || target_net_profit < 0) {
    return NextResponse.json({ error: "month, target_net_profit(>=0) 필요" }, { status: 400 });
  }

  const profile = await getProfile(supabase, user.id);
  const householdId = profile?.household_id ?? null;

  let data, error;

  if (householdId) {
    // 가족 목표: household_id 기준 upsert
    ({ data, error } = await supabase
      .from("goals")
      .upsert(
        { user_id: user.id, household_id: householdId, year_month: month, target_net_profit, updated_at: new Date().toISOString() },
        { onConflict: "household_id,year_month" }
      )
      .select()
      .single());
  } else {
    // 개인 목표: user_id 기준 upsert
    ({ data, error } = await supabase
      .from("goals")
      .upsert(
        { user_id: user.id, year_month: month, target_net_profit, updated_at: new Date().toISOString() },
        { onConflict: "user_id,year_month" }
      )
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: true, goal: data });
}
