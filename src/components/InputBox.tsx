"use client";
import { useState, useRef } from "react";
import { parse } from "@/lib/parser";

interface Props {
  onSubmit: (text: string, date: string, typeOverride?: "income" | "expense") => Promise<void>;
  disabled?: boolean;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function InputBox({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [typeOverride, setTypeOverride] = useState<"income" | "expense" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = value.trim() ? parse(value) : null;
  const effectiveType = typeOverride ?? parsed?.type ?? "expense";

  function handleChange(v: string) {
    setValue(v);
    setTypeOverride(null); // 텍스트 바뀌면 수동 전환 초기화
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault();
      setLoading(true);
      await onSubmit(value.trim(), date, typeOverride ?? undefined);
      setValue("");
      setTypeOverride(null);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
      {/* 날짜 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">날짜</span>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-xs text-gray-600 border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* 텍스트 입력 */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="예) 외주 50만원 / 점심 1.2만"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className="flex-1 outline-none text-sm placeholder:text-gray-400 disabled:opacity-50"
        />
        {loading
          ? <span className="text-xs text-gray-400">저장 중…</span>
          : <span className="text-xs text-gray-300">Enter</span>
        }
      </div>

      {/* 실시간 파싱 미리보기 */}
      {parsed && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {/* 수입/지출 토글 버튼 */}
          <button
            type="button"
            onClick={() =>
              setTypeOverride(effectiveType === "income" ? "expense" : "income")
            }
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              effectiveType === "income"
                ? "bg-green-500 text-white border-green-500"
                : "bg-red-500 text-white border-red-500"
            }`}
          >
            {effectiveType === "income" ? "수입" : "지출"}
          </button>

          {/* 감지된 금액 */}
          <span className="text-sm font-semibold text-gray-700">
            {fmt(parsed.amount)}원
          </span>

          {/* 결제수단 배지 */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            parsed.payment_method === "card"
              ? "bg-blue-50 text-blue-500"
              : "bg-gray-100 text-gray-500"
          }`}>
            {parsed.payment_method === "card" ? "💳 카드" : "현금"}
          </span>

          {/* 할부 정보 */}
          {parsed.installment_months > 1 && (
            <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-full">
              {parsed.installment_months}할부 {fmt(Math.round(parsed.amount / parsed.installment_months))}원/월
            </span>
          )}

          {/* 금액 불확실 표시 */}
          {parsed.needs_confirm && (
            <span className="text-[10px] text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded-full">
              금액 확인
            </span>
          )}

          <span className="text-[10px] text-gray-300 ml-auto">탭으로 전환</span>
        </div>
      )}
    </div>
  );
}
