// GET /api/household/info
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.household_id) {
    return NextResponse.json({ household: null });
  }

  const { data: household } = await supabase
    .from("households")
    .select("invite_code")
    .eq("id", profile.household_id)
    .single();

  const { data: members } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("household_id", profile.household_id);

  return NextResponse.json({
    household: {
      invite_code: household?.invite_code ?? "",
      members: members ?? [],
    },
  });
}
