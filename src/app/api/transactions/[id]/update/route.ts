// POST /api/transactions/{id}/update
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const patch: {
    type?: "income" | "expense";
    amount?: number;
    raw_text?: string;
    payment_method?: "card" | "cash";
  } = {};
  if (body.type === "income" || body.type === "expense") patch.type = body.type;
  if (typeof body.amount === "number" && body.amount >= 0) patch.amount = body.amount;
  if (typeof body.raw_text === "string" && body.raw_text.trim()) patch.raw_text = body.raw_text.trim();
  if (body.payment_method === "card" || body.payment_method === "cash") patch.payment_method = body.payment_method;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경 항목 없음" }, { status: 400 });
  }

  // 할부 그룹에 속한 경우 payment_method는 그룹 전체 적용
  const { data: target } = await supabase
    .from("transactions")
    .select("installment_group_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (target?.installment_group_id && patch.payment_method) {
    await supabase
      .from("transactions")
      .update({ payment_method: patch.payment_method })
      .eq("installment_group_id", target.installment_group_id);
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: true, transaction: data });
}
