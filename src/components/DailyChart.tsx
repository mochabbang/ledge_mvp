"use client";

export interface DailyData {
  date: string;   // "MM-DD"
  income: number;
  expense: number;
}

const fmtK = (n: number) => {
  if (n >= 100000000) return `${(n / 100000000).toFixed(0)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}천`;
  return String(n);
};

export default function DailyChart({ data }: { data: DailyData[] }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const BAR_HEIGHT = 90;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-gray-600">일별 수입 · 지출</p>
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> 수입
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> 지출
          </span>
        </div>
      </div>

      {/* 바 차트 (가로 스크롤) */}
      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-2"
          style={{ height: BAR_HEIGHT + 24, minWidth: data.length * 36 }}
        >
          {data.map((d) => {
            const incomeH = d.income > 0 ? Math.max(4, Math.round((d.income / maxVal) * BAR_HEIGHT)) : 0;
            const expenseH = d.expense > 0 ? Math.max(4, Math.round((d.expense / maxVal) * BAR_HEIGHT)) : 0;

            // Build tooltip text
            const tooltipParts: string[] = [];
            if (d.income > 0) tooltipParts.push(`수입 ${fmtK(d.income)}원`);
            if (d.expense > 0) tooltipParts.push(`지출 ${fmtK(d.expense)}원`);
            const tooltip = tooltipParts.join(" / ");

            return (
              <div
                key={d.date}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-[28px] group relative"
              >
                {/* 날짜별 통합 툴팁 */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {tooltip}
                </span>

                {/* 바 영역 */}
                <div className="w-full flex gap-0.5 items-end" style={{ height: BAR_HEIGHT }}>
                  <div className="flex-1 flex flex-col justify-end">
                    {incomeH > 0 && (
                      <div className="bg-green-400 rounded-t w-full" style={{ height: incomeH }} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {expenseH > 0 && (
                      <div className="bg-red-400 rounded-t w-full" style={{ height: expenseH }} />
                    )}
                  </div>
                </div>

                {/* 날짜 레이블 */}
                <p className="text-[9px] text-gray-400 leading-tight">{d.date.slice(3)}일</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 최대값 참고 */}
      <p className="text-[10px] text-gray-400 mt-1 text-right">최대 {fmtK(maxVal)}원</p>
    </div>
  );
}
