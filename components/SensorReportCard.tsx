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
      <article className="px-card px-reveal p-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 font-semibold">
            PX
          </div>
        </header>
        <p className="px-title text-xs uppercase">Sensor Report</p>
        <h3 className="mt-2 text-lg font-semibold text-white">Daily Posture Report</h3>
        <p className="px-sub mt-2">No sensor report data yet. Keep your phone open to start tracking.</p>
      </article>
    );
  }

  const trend = yesterdayReport ? report.avgScore - yesterdayReport.avgScore : null;
  const trendLabel = trend === null ? "No baseline yet" : trend === 0 ? "No change" : trend > 0 ? `+${trend} vs yesterday` : `${trend} vs yesterday`;

  return (
    <article className="px-card px-reveal p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 font-semibold">
          PX
        </div>
        {active ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Sensor Active
          </span>
        ) : null}
      </header>

      <div className="px-card px-glow p-5">
        <div className="px-title mb-2 text-xs uppercase">DAILY SCORE</div>
        <div className="px-value text-cyan-300">{report.avgScore}</div>
      </div>

      <div className="px-card mt-4 p-5">
        <div className="px-title text-xs uppercase">GOOD POSTURE %</div>
        <div className="px-value text-emerald-300">{report.goodPercent}%</div>
      </div>

      <div className="px-card mt-4 border border-red-500/30 p-5">
        <div className="px-title text-xs uppercase text-red-300">BAD POSTURE %</div>
        <div className="px-value text-red-400">{report.badPercent}%</div>
      </div>

      <div className="px-card mt-4 p-5">
        <div className="px-title text-xs uppercase">TRACKING TIME</div>
        <div className="px-value text-blue-300">{formatDuration(report.duration)}</div>
      </div>

      <div className="px-card mt-4 p-5">
        <div className="px-title text-xs uppercase">TREND</div>
        <p className="mt-2 text-sm font-semibold text-violet-200">{trendLabel}</p>
      </div>
    </article>
  );
}
