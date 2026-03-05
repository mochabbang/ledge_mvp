"use client";
import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/supabase/types";

interface Suggestions {
  type_candidates: Array<"income" | "expense">;
  amount_candidates: number[];
  needs_confirm: boolean;
  reason?: { matched_amount: string; matched_type_keyword: string };
}

interface Props {
  transaction: Transaction;
  suggestions: Suggestions;
  onUpdate: (patch: { type?: "income" | "expense"; amount?: number }) => Promise<void>;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function SuggestionCard({ transaction, suggestions, onUpdate, onUndo, onDismiss }: Props) {
  // Undo 5초 카운트다운
  const [undoLeft, setUndoLeft] = useState(5);
  const [undoDone, setUndoDone] = useState(false);

  useEffect(() => {
    if (undoDone) return;
    const id = setInterval(() => {
      setUndoLeft((n) => {
        if (n <= 1) { clearInterval(id); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [undoDone]);

  async function handleUndo() {
    setUndoDone(true);
    await onUndo();
    onDismiss();
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">저장됨</p>
          <p className="font-semibold">
            {transaction.type === "income" ? "🟢 수입" : "🔴 지출"}&nbsp;
            {fmt(transaction.amount)}원
          </p>
          <p className="text-xs text-gray-400 mt-0.5">"{transaction.raw_text}"</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      {/* 타입 토글 */}
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate({ type: "income" })}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition ${
            transaction.type === "income"
              ? "bg-green-500 text-white border-green-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-green-50"
          }`}
        >
          수입으로
        </button>
        <button
          onClick={() => onUpdate({ type: "expense" })}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition ${
            transaction.type === "expense"
              ? "bg-red-500 text-white border-red-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-red-50"
          }`}
        >
          지출로
        </button>
      </div>

      {/* 금액 조정 */}
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate({ amount: Math.max(0, transaction.amount - 10000) })}
          className="flex-1 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50"
        >
          금액 -1만
        </button>
        <button
          onClick={() => onUpdate({ amount: transaction.amount + 10000 })}
          className="flex-1 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50"
        >
          금액 +1만
        </button>
      </div>

      {/* needs_confirm 후보 */}
      {suggestions.needs_confirm && suggestions.amount_candidates.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {suggestions.amount_candidates.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ amount: c })}
              className="px-3 py-1 rounded-lg text-sm border bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
            >
              {fmt(c)}원
            </button>
          ))}
        </div>
      )}

      {/* Undo */}
      {!undoDone && undoLeft > 0 && (
        <button
          onClick={handleUndo}
          className="w-full py-1.5 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition"
        >
          Undo ({undoLeft}초)
        </button>
      )}
    </div>
  );
}
