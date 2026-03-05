"use client";
import { useState } from "react";
import type { Transaction } from "@/lib/supabase/types";

interface Props {
  transaction: Transaction;
  onSave: (patch: { type?: "income" | "expense"; amount?: number; raw_text?: string }) => Promise<void>;
  onClose: () => void;
}


export default function EditPanel({ transaction, onSave, onClose }: Props) {
  const [type, setType] = useState<"income" | "expense">(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [rawText, setRawText] = useState(transaction.raw_text);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 0) return;
    if (!rawText.trim()) return;
    setLoading(true);
    await onSave({ type, amount: numAmount, raw_text: rawText.trim() });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">내역 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* 텍스트 수정 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">내용</p>
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 타입 토글 */}
        <div className="flex gap-2">
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                type === t
                  ? t === "income" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {t === "income" ? "수입" : "지출"}
            </button>
          ))}
        </div>

        {/* 금액 조정 */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAmount(String(Math.max(0, (parseInt(amount, 10) || 0) - 10000)))}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            -1만
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="flex-1 border rounded-lg px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setAmount(String((parseInt(amount, 10) || 0) + 10000))}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            +1만
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
