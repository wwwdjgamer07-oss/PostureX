"use client";

import type { SensorDailyReport } from "@/lib/sensorPostureEngine";

interface SensorReportCardProps {
  report: SensorDailyReport | null;
  yesterdayReport: SensorDailyReport | null;
  active: boolean;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

export function SensorReportCard({ report, yesterdayReport, active }: SensorReportCardProps) {
  if (!report) {
    return (
      <article className="px-panel px-reveal p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Sensor Report</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Daily Posture Report</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No sensor report data yet. Keep your phone open to start tracking.</p>
      </article>
    );
  }

  const trend = yesterdayReport ? report.avgScore - yesterdayReport.avgScore : null;
  const trendLabel = trend === null ? "No baseline yet" : trend === 0 ? "No change" : trend > 0 ? `+${trend} vs yesterday` : `${trend} vs yesterday`;

  return (
    <article className="px-panel px-reveal p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Sensor Report</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Daily Posture Report</h3>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Sensor Mode Active
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Daily Score</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-100">{report.avgScore}</p>
        </div>
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Good Posture %</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-100">{report.goodPercent}%</p>
        </div>
        <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-rose-200">Bad Posture %</p>
          <p className="mt-2 text-2xl font-semibold text-rose-100">{report.badPercent}%</p>
        </div>
        <div className="rounded-xl border border-slate-300/25 bg-slate-900/55 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Tracking Time</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{formatDuration(report.duration)}</p>
        </div>
        <div className="rounded-xl border border-violet-300/30 bg-violet-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-violet-200">Trend</p>
          <p className="mt-2 text-sm font-semibold text-violet-100">{trendLabel}</p>
        </div>
      </div>
    </article>
  );
}

