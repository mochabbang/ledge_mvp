"use client";
import { useCallback, useEffect, useState } from "react";
import KpiCards from "@/components/KpiCards";
import ProgressBar from "@/components/ProgressBar";
import InputBox from "@/components/InputBox";
import TransactionList from "@/components/TransactionList";
import DailyChart, { type DailyData } from "@/components/DailyChart";
import type { Summary, Transaction } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import type { HouseholdInfo } from "@/lib/supabase/types";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}년 ${parseInt(m)}월`;
}

function buildChartData(txs: Transaction[]): DailyData[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const tx of txs) {
    const date = tx.created_at.slice(5, 10); // "MM-DD"
    const entry = map.get(date) ?? { income: 0, expense: 0 };
    if (tx.type === "income") entry.income += tx.amount;
    else entry.expense += tx.amount;
    map.set(date, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, net: 0, target: 0, progress: 0, remaining: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [toast, setToast] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const today = currentMonth();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("year_month", month)
      .order("created_at", { ascending: false })
      .limit(30);

    if (txs) {
      setTransactions(txs as Transaction[]);
      setChartData(buildChartData(txs as Transaction[]));
    }

    const res = await fetch(`/api/summary?month=${month}`);
    if (res.ok) setSummary(await res.json());
  }, [month]);

  useEffect(() => {
    fetch("/api/household/info")
      .then((r) => r.json())
      .then((d) => setHousehold(d.household ?? null))
      .catch(() => {});
  }, []);

  function copyCode() {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  useEffect(() => { loadData(); }, [loadData]);

  async function handleInput(text: string, date: string, typeOverride?: "income" | "expense") {
    const res = await fetch("/api/transactions/parse-and-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, date, typeOverride }),
    });
    const data: { saved: boolean; transaction: Transaction; summary: Summary; error?: string } = await res.json();

    if (!data.saved) {
      showToast(data.error ?? "저장 실패");
      return;
    }

    await loadData();
    showToast("저장됨");
  }

  async function handleUpdate(id: string, patch: { type?: "income" | "expense"; amount?: number; raw_text?: string }) {
    const res = await fetch(`/api/transactions/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) { showToast("수정 실패"); return; }
    await loadData();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) { showToast("삭제 실패"); return; }
    await loadData();
    showToast("삭제됨");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Ledge</h1>
        <div className="flex items-center gap-2">
          {household?.invite_code && (
            <button
              onClick={copyCode}
              title="초대 코드 복사"
              className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-blue-600 hover:bg-blue-100 transition"
            >
              <span>{household.invite_code}</span>
              <span className="text-blue-400">{codeCopied ? "✓" : "⧉"}</span>
            </button>
          )}
          <a href="/onboarding" className="text-xs text-blue-500 hover:underline">설정</a>
        </div>
      </div>

      {/* 월 네비게이터 */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-xl px-4 py-2 shadow-sm">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded text-sm"
        >
          ‹
        </button>
        <span className="text-sm font-semibold w-28 text-center">{fmtMonth(month)}</span>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={month >= today}
          className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {/* KPI */}
      <KpiCards summary={summary} />

      {/* 진행바 */}
      <ProgressBar progress={summary.progress} />

      {/* 일별 차트 */}
      <DailyChart data={chartData} />

      {/* 입력창 */}
      <InputBox onSubmit={handleInput} />

      {/* 날짜별 내역 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">내역</h2>
        <TransactionList
          transactions={transactions}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
