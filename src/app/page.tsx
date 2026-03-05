// 루트: 인증 확인 후 대시보드 or 온보딩으로 리다이렉트
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 이번 달 목표 설정 여부 확인
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: goal } = await supabase
    .from("goals")
    .select("target_net_profit")
    .eq("user_id", user.id)
    .eq("year_month", month)
    .maybeSingle();

  if (!goal) redirect("/onboarding");
  redirect("/dashboard");
}
