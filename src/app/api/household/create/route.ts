// POST /api/household/create
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName: string = (body?.display_name ?? "").trim();

  // 고유 초대 코드 생성
  let invite_code = generateCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", invite_code)
      .maybeSingle();
    if (!existing) break;
    invite_code = generateCode();
  }

  // household 생성
  const { data: household, error: hError } = await supabase
    .from("households")
    .insert({ invite_code, created_by: user.id })
    .select()
    .single();

  if (hError) return NextResponse.json({ error: hError.message }, { status: 500 });

  // profile upsert
  const { error: pError } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, household_id: household.id, display_name: displayName },
      { onConflict: "user_id" }
    );

  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

  // user_metadata 동기화
  await supabase.auth.updateUser({ data: { display_name: displayName } });

  return NextResponse.json({ household_id: household.id, invite_code });
}
