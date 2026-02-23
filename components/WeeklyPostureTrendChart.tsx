"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface WeeklyPoint {
  date: string;
  avg_score: number;
  total_duration: number;
  sessions_count: number;
}

interface WeeklyResponse {
  data: WeeklyPoint[];
  improvement_pct: number;
  summary?: {
    avg_weekly_score: number;
    total_sessions: number;
    total_duration: number;
  };
}

function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short" });
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}m ${String(sec).padStart(2, "0")}s`;
}

function formatHoursMinutes(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function WeeklyPostureTrendChart() {
  const [rows, setRows] = useState<WeeklyPoint[]>([]);
  const [improvementPct, setImprovementPct] = useState(0);
  const [summary, setSummary] = useState<{ avg_weekly_score: number; total_sessions: number; total_duration: number }>({
    avg_weekly_score: 0,
    total_sessions: 0,
    total_duration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/analytics/weekly", { cache: "no-store" });
        const payload = (await response.json()) as WeeklyResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load weekly analytics.");
        }
        if (!active) return;
        setRows(Array.isArray(payload.data) ? payload.data : []);
        setImprovementPct(Number(payload.improvement_pct ?? 0));
        setSummary({
          avg_weekly_score: Number(payload.summary?.avg_weekly_score ?? 0),
          total_sessions: Number(payload.summary?.total_sessions ?? 0),
          total_duration: Number(payload.summary?.total_duration ?? 0)
        });
      } catch (errorValue) {
        if (!active) return;
        setError(errorValue instanceof Error ? errorValue.message : "Failed to load weekly analytics.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      rows.map((item) => ({
        ...item,
        day: formatDayLabel(item.date)
      })),
    [rows]
  );

  const improvementTone = improvementPct >= 0 ? "text-emerald-300" : "text-rose-300";
  const improvementText = `${improvementPct >= 0 ? "+" : ""}${improvementPct.toFixed(1)}% vs previous week`;

  return (
    <article className="px-panel px-reveal p-6" style={{ animationDelay: "560ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Weekly Posture Trend</h2>
        <p className={`rounded-full border border-slate-500/30 bg-slate-900/50 px-3 py-1 text-xs font-semibold ${improvementTone}`}>{improvementText}</p>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-4 h-[260px] w-full rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-3 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        {loading ? (
          <div className="grid h-full place-items-center text-sm text-slate-400">Loading weekly analytics...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 14, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" vertical={false} />
              <XAxis dataKey="day" stroke="#8290b3" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#8290b3" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: "#39d9ff", strokeOpacity: 0.25 }}
                contentStyle={{
                  backgroundColor: "#0a1228",
                  border: "1px solid rgba(57, 217, 255, 0.35)",
                  borderRadius: "12px",
                  color: "#e5eeff",
                  fontSize: "12px"
                }}
                formatter={(value: number, key: string) => {
                  if (key === "avg_score") return [`${Number(value).toFixed(1)}%`, "Avg Score"];
                  if (key === "total_duration") return [formatDuration(Number(value)), "Duration"];
                  if (key === "sessions_count") return [String(value), "Sessions"];
                  return [String(value), key];
                }}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { date?: string; day?: string } | undefined;
                  if (!point) return "";
                  return `${point.day ?? ""} (${point.date ?? ""})`;
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_score"
                stroke="#3be3ff"
                strokeWidth={4}
                dot={false}
                strokeOpacity={0.25}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avg_score"
                stroke="#3be3ff"
                strokeWidth={2.4}
                dot={{ r: 2.5, strokeWidth: 0, fill: "#8df0ff" }}
                activeDot={{ r: 4, fill: "#ffffff", stroke: "#3be3ff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-slate-950/55 p-4 shadow-[0_0_22px_rgba(34,211,238,0.14)]">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Weekly Posture Report</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Score</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-100">{Math.round(summary.avg_weekly_score)}</p>
          </div>
          <div className="rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary.total_sessions}</p>
          </div>
          <div className="rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Time</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatHoursMinutes(summary.total_duration)}</p>
          </div>
          <div className="rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Change</p>
            <p className={`mt-1 text-2xl font-semibold ${improvementPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {improvementPct >= 0 ? "+" : ""}
              {improvementPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
