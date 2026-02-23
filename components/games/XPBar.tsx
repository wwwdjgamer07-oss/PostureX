"use client";

interface XPBarProps {
  current: number;
  total: number;
  label?: string;
}

export function XPBar({ current, total, label = "XP Progress" }: XPBarProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(0, Math.min(current, safeTotal));
  const pct = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{safeCurrent} / {safeTotal}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-cyan-300/30 bg-slate-900/70">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
