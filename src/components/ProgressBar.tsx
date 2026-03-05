export default function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 100);
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>진행률</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
