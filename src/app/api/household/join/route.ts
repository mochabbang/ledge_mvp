// POST /api/household/join
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const invite_code: string = (body?.invite_code ?? "").toUpperCase().trim();
  const displayName: string = (body?.display_name ?? "").trim();

  if (!invite_code) {
    return NextResponse.json({ error: "초대 코드를 입력하세요" }, { status: 400 });
  }

  // 초대 코드로 household 조회
  const { data: household, error: hError } = await supabase
    .from("households")
    .select("id, invite_code")
    .eq("invite_code", invite_code)
    .maybeSingle();

  if (hError || !household) {
    return NextResponse.json({ error: "초대 코드를 찾을 수 없습니다" }, { status: 404 });
  }

  // profile upsert
  const { error: pError } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, household_id: household.id, display_name: displayName },
      { onConflict: "user_id" }
    );

  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

  await supabase.auth.updateUser({ data: { display_name: displayName } });

  return NextResponse.json({ household_id: household.id, invite_code: household.invite_code });
}
