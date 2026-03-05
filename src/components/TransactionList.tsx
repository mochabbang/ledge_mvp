"use client";
import { useState } from "react";
import type { Transaction } from "@/lib/supabase/types";

interface Props {
  transactions: Transaction[];
  onSave: (id: string, patch: { type?: "income" | "expense"; amount?: number; raw_text?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function toDateLabel(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function groupByDate(txs: Transaction[]): { dateLabel: string; items: Transaction[] }[] {
  const groups: { dateLabel: string; items: Transaction[] }[] = [];
  for (const tx of txs) {
    const label = toDateLabel(tx.created_at);
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) last.items.push(tx);
    else groups.push({ dateLabel: label, items: [tx] });
  }
  return groups;
}

function InlineEdit({
  tx,
  onSave,
  onDelete,
  onClose,
}: {
  tx: Transaction;
  onSave: (patch: { type?: "income" | "expense"; amount?: number; raw_text?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">(tx.type);
  const [rawText, setRawText] = useState(tx.raw_text);
  const [amount, setAmount] = useState(String(tx.amount));
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const num = parseInt(amount, 10) || 0;

  function adjust(delta: number) {
    setAmount(String(Math.max(0, num + delta)));
  }

  async function handleSave() {
    if (!rawText.trim() || num < 0) return;
    setLoading(true);
    await onSave({ type, amount: num, raw_text: rawText.trim() });
    setLoading(false);
    onClose();
  }

  return (
    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
      {/* 내용 */}
      <div>
        <p className="text-xs text-gray-400 mb-1">내용</p>
        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      {/* 타입 토글 */}
      <div className="flex gap-2">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition ${
              type === t
                ? t === "income"
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            {t === "income" ? "수입" : "지출"}
          </button>
        ))}
      </div>

      {/* 금액 입력 */}
      <div>
        <p className="text-xs text-gray-400 mb-1">금액</p>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full border rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
        {/* 조정 버튼 — 입력칸 아래 */}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[
            { label: "−만원", delta: -10000 },
            { label: "−천원", delta: -1000 },
            { label: "+천원", delta: 1000 },
            { label: "+만원", delta: 10000 },
          ].map(({ label, delta }) => (
            <button
              key={label}
              onClick={() => adjust(delta)}
              className="py-1.5 border rounded-lg text-xs bg-white hover:bg-gray-100 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 저장 / 삭제 */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? "저장 중…" : "저장"}
        </button>
        {confirmDelete ? (
          <button
            onClick={async () => { await onDelete(); onClose(); }}
            className="px-4 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-600 transition"
          >
            확인
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 border border-red-300 text-red-500 rounded-lg py-2 text-sm hover:bg-red-50 transition"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, onSave, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400 space-y-1">
        <p>아직 내역이 없습니다</p>
        <p className="text-xs">
          예) <span className="text-gray-500">외주 50만원</span> ·{" "}
          <span className="text-gray-500">점심 1.2만</span>
        </p>
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="space-y-4">
      {groups.map(({ dateLabel, items }) => {
        const dayIncome = items
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const dayExpense = items
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);

        return (
          <div key={dateLabel}>
            {/* 날짜 헤더 */}
            <div className="flex justify-between items-center mb-1.5 px-1">
              <p className="text-xs font-semibold text-gray-500">{dateLabel}</p>
              <div className="flex gap-2 text-xs">
                {dayIncome > 0 && (
                  <span className="text-green-600">+{fmt(dayIncome)}</span>
                )}
                {dayExpense > 0 && (
                  <span className="text-red-500">−{fmt(dayExpense)}</span>
                )}
              </div>
            </div>

            {/* 해당 날짜 내역 */}
            <ul className="space-y-2">
              {items.map((tx) => {
                const isIncome = tx.type === "income";
                const isOpen = openId === tx.id;

                return (
                  <li key={tx.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* 항목 행 */}
                    <button
                      onClick={() => setOpenId(isOpen ? null : tx.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:scale-[0.99] transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg leading-none ${isIncome ? "text-green-500" : "text-red-400"}`}
                        >
                          {isIncome ? "▲" : "▼"}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{tx.raw_text}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-gray-400">{timeAgo(tx.created_at)}</p>
                            {tx.registered_by && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                                {tx.registered_by}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${isIncome ? "text-green-600" : "text-red-500"}`}>
                            {isIncome ? "+" : "−"}{fmt(tx.amount)}원
                          </p>
                          <p className="text-xs text-gray-400">
                            {isIncome ? "순수익 ↑" : "순수익 ↓"}
                          </p>
                        </div>
                        <span
                          className={`text-gray-400 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                          ▾
                        </span>
                      </div>
                    </button>

                    {/* 인라인 수정 */}
                    {isOpen && (
                      <InlineEdit
                        tx={tx}
                        onSave={(patch) => onSave(tx.id, patch)}
                        onDelete={() => onDelete(tx.id)}
                        onClose={() => setOpenId(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
