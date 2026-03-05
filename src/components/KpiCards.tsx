import type { Summary } from "@/lib/supabase/types";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function KpiCards({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-3">
      {/* 목표 대비 현황 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">목표</p>
          <p className="text-base font-bold">{fmt(summary.target)}원</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">순수익</p>
          <p className={`text-base font-bold ${summary.net >= 0 ? "text-blue-600" : "text-red-500"}`}>
            {summary.net >= 0 ? "+" : ""}{fmt(summary.net)}원
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">달성률</p>
          <p className={`text-base font-bold ${summary.progress >= 100 ? "text-green-500" : "text-gray-800"}`}>
            {summary.progress}%
          </p>
        </div>
      </div>

      {/* 수입 / 지출 내역 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-green-600 mb-1">+ 총 수입</p>
          <p className="text-base font-bold text-green-700">{fmt(summary.income)}원</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-red-500 mb-1">− 총 지출</p>
          <p className="text-base font-bold text-red-600">{fmt(summary.expense)}원</p>
        </div>
      </div>
    </div>
  );
}
