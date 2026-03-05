"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(target.replace(/,/g, ""), 10);
    if (isNaN(value) || value < 0) {
      setError("유효한 금액을 입력하세요");
      return;
    }
    if (!displayName.trim()) {
      setError("이름을 입력하세요");
      return;
    }

    // Save display name to user metadata
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });
    if (updateError) {
      setError("이름 저장 실패. 다시 시도해주세요.");
      return;
    }

    const res = await fetch("/api/goal/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, target_net_profit: value }),
    });

    if (!res.ok) {
      setError("저장 실패. 다시 시도해주세요.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2">시작 설정</h1>
        <p className="text-gray-500 text-sm mb-6">{month} 순수익 목표를 입력하세요</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">이름 (닉네임)</label>
            <input
              type="text"
              placeholder="예) 엄마, 아빠, 홍길동"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">월 순수익 목표</label>
            <div className="relative">
              <input
                type="text"
                placeholder="3,000,000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
              <span className="absolute right-4 top-3 text-gray-400">원</span>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white rounded-lg py-3 font-semibold hover:bg-blue-600 transition"
          >
            저장하고 시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
