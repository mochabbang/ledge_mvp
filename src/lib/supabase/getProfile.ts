import { createClient } from "@/lib/supabase/server";

export interface ProfileData {
  household_id: string | null;
  display_name: string;
}

export async function getProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ProfileData | null> {
  const { data } = await supabase
    .from("profiles")
    .select("household_id, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}
