"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "nickname" | "household" | "goal";
type HouseholdAction = "none" | "create" | "join";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("nickname");
  const [displayName, setDisplayName] = useState("");
  const [householdAction, setHouseholdAction] = useState<HouseholdAction>("none");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Step 1: 닉네임 → API 없이 즉시 다음 단계
  function handleNicknameNext(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError("이름을 입력하세요"); return; }
    setError("");
    setStep("household");
  }

  // Step 2: 가족 연결
  async function handleHouseholdNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (householdAction === "create") {
      const res = await fetch("/api/household/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "가족 생성 실패"); setLoading(false); return; }
      setCreatedCode(data.invite_code);
    } else if (householdAction === "join") {
      if (!inviteCode.trim()) { setError("초대 코드를 입력하세요"); setLoading(false); return; }
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim(), display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "참여 실패"); setLoading(false); return; }
    }

    setLoading(false);
    setStep("goal");
  }

  // Step 3: 목표 + 프로필 저장
  async function handleGoalSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(target.replace(/,/g, ""), 10);
    if (isNaN(value) || value < 0) { setError("유효한 금액을 입력하세요"); return; }
    setError("");
    setLoading(true);

    // 혼자 시작인 경우 프로필 저장 (create/join은 이미 저장됨)
    if (householdAction === "none") {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          { user_id: user.id, display_name: displayName.trim() },
          { onConflict: "user_id" }
        );
        if (profileError) {
          setError(`프로필 저장 실패: ${profileError.message}`);
          setLoading(false);
          return;
        }
      }
    }

    const res = await fetch("/api/goal/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, target_net_profit: value }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(`목표 저장 실패: ${data.error ?? res.status}`);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const stepIndex = step === "nickname" ? 0 : step === "household" ? 1 : 2;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        {/* Progress indicator */}
        <div className="flex gap-1 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-blue-500" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-1">{stepIndex + 1}/3</p>

        {/* Step 1: Nickname */}
        {step === "nickname" && (
          <>
            <h1 className="text-xl font-bold mb-1">이름을 알려주세요</h1>
            <p className="text-gray-500 text-sm mb-6">가족에게 보여질 이름입니다</p>
            <form onSubmit={handleNicknameNext} className="space-y-4">
              <input
                type="text"
                placeholder="예) 엄마, 아빠, 홍길동"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
                className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-blue-500 text-white rounded-lg py-3 font-semibold hover:bg-blue-600 transition"
              >
                다음
              </button>
            </form>
          </>
        )}

        {/* Step 2: Household */}
        {step === "household" && (
          <>
            <h1 className="text-xl font-bold mb-1">가족 연결</h1>
            <p className="text-gray-500 text-sm mb-6">가족과 함께 쓰거나 혼자 시작할 수 있어요</p>
            <form onSubmit={handleHouseholdNext} className="space-y-3">
              {(["none", "create", "join"] as HouseholdAction[]).map((action) => {
                const labels: Record<HouseholdAction, { title: string; sub: string }> = {
                  none:   { title: "혼자 시작하기",         sub: "나중에 가족을 초대할 수 있어요" },
                  create: { title: "새 가족 만들기",         sub: "초대 코드를 생성해 가족을 초대해요" },
                  join:   { title: "초대 코드로 참여하기",   sub: "가족에게 받은 6자리 코드를 입력해요" },
                };
                const { title, sub } = labels[action];
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => { setHouseholdAction(action); setError(""); }}
                    className={`w-full border rounded-lg px-4 py-3 text-sm font-medium text-left transition ${
                      householdAction === action
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {title}
                    <span className="block text-xs text-gray-400 font-normal mt-0.5">{sub}</span>
                  </button>
                );
              })}

              {householdAction === "join" && (
                <input
                  type="text"
                  placeholder="초대 코드 6자리"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(""); }}
                  maxLength={6}
                  className="w-full border rounded-lg px-4 py-3 text-sm tracking-widest font-mono outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                  autoFocus
                />
              )}

              {createdCode && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-blue-500 mb-1">생성된 초대 코드</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-blue-700">{createdCode}</p>
                  <p className="text-xs text-gray-400 mt-1">가족에게 이 코드를 알려주세요</p>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white rounded-lg py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-60"
              >
                {loading ? "처리 중..." : "다음"}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Goal */}
        {step === "goal" && (
          <>
            <h1 className="text-xl font-bold mb-1">이번 달 목표</h1>
            <p className="text-gray-500 text-sm mb-6">{month} 순수익 목표를 입력하세요</p>
            <form onSubmit={handleGoalSave} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="3,000,000"
                  value={target}
                  onChange={(e) => { setTarget(e.target.value); setError(""); }}
                  className="w-full border rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                  required
                />
                <span className="absolute right-4 top-3 text-gray-400">원</span>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white rounded-lg py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-60"
              >
                {loading ? "저장 중..." : "저장하고 시작하기"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
