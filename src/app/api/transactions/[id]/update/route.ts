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

  // 할부 개월 수 변경 → 그룹 전체 재생성
  if (typeof body.installment_months === "number" && body.installment_months >= 1) {
    const { data: origTx, error: fetchErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !origTx) {
      return NextResponse.json({ error: "내역을 찾을 수 없습니다" }, { status: 404 });
    }

    const newMonths = body.installment_months;
    const totalAmount = origTx.amount * (origTx.installment_months ?? 1);
    const newPerMonth = newMonths > 1 ? Math.round(totalAmount / newMonths) : totalAmount;
    const newGroupId = newMonths > 1 ? crypto.randomUUID() : null;
    const origDate = origTx.created_at.slice(0, 10);

    // 기존 그룹 전체 삭제 (또는 단건 삭제)
    if (origTx.installment_group_id) {
      await supabase
        .from("transactions")
        .delete()
        .eq("installment_group_id", origTx.installment_group_id);
    } else {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", params.id)
        .eq("user_id", user.id);
    }

    // 새 레코드 생성
    const records = Array.from({ length: newMonths }, (_, i) => {
      const d = new Date(origDate);
      d.setMonth(d.getMonth() + i);
      const ds = d.toISOString().slice(0, 10);
      return {
        user_id: user.id,
        household_id: origTx.household_id ?? null,
        year_month: ds.slice(0, 7),
        type: body.type ?? origTx.type,
        amount: newPerMonth,
        raw_text: body.raw_text ?? origTx.raw_text,
        payment_method: body.payment_method ?? origTx.payment_method,
        installment_months: newMonths,
        installment_group_id: newGroupId,
        created_at: `${ds}T12:00:00+09:00`,
        registered_by: origTx.registered_by,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from("transactions")
      .insert(records)
      .select();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ updated: true, transaction: inserted?.[0], restructured: true });
  }

  // 일반 필드 수정
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
