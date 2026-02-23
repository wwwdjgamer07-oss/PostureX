import { BatteryWarning } from "lucide-react";

export function FatigueMeter({ fatigue }: { fatigue: number }) {
  const level = Math.max(0, Math.min(100, fatigue));
  const color = level < 35 ? "#00E5FF" : level < 60 ? "#29B6F6" : level < 80 ? "#FFB300" : "#FF1744";

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Fatigue Meter</h3>
        <BatteryWarning className="h-4 w-4 text-slate-400" />
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full transition-all duration-500" style={{ width: `${level}%`, backgroundColor: color }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">Current fatigue load: {Math.round(level)}%</p>
    </div>
  );
}
