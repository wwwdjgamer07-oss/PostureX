"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldAlert, Users, Video } from "lucide-react";

interface LiveUserItem {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  plan_tier: string;
  created_at: string | null;
  updated_at: string | null;
  wallet: {
    coins: number;
    gems: { blue: number; purple: number; gold: number };
  };
  sessions: {
    total_known: number;
    active: number;
    latest: null | {
      id: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number;
      peak_risk: string;
      alert_count: number;
      source: "camera" | "sensor";
      score: number;
    };
  };
  posture_live: null | {
    captured_at: string;
    score: number;
    alignment: number;
    symmetry: number;
    stability: number;
    risk_level: string;
    source: "camera" | "sensor";
  };
  breaks_today: {
    total: number;
    taken: number;
  };
}

interface LivePayload {
  admin: { email: string | null };
  generated_at: string;
  summary: {
    users_total: number;
    sessions_total_loaded: number;
    sessions_active: number;
    records_total_loaded: number;
    average_live_score: number;
  };
  users: LiveUserItem[];
}

interface Props {
  initial: LivePayload;
}

function riskTone(level: string) {
  const normalized = String(level ?? "LOW").toUpperCase();
  if (normalized === "LOW") return "text-emerald-300";
  if (normalized === "MODERATE") return "text-amber-300";
  if (normalized === "HIGH") return "text-orange-300";
  return "text-rose-300";
}

export function AdminLiveClient({ initial }: Props) {
  const [data, setData] = useState<LivePayload>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onlineUsers = useMemo(() => data.users.filter((u) => u.sessions.active > 0).length, [data.users]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/live/overview", { credentials: "include" });
      const payload = (await response.json()) as LivePayload | { error?: string };
      if (!response.ok || !("users" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Failed to refresh admin live view.");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh admin live view.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const schedule = (ms: number) => {
      if (!active) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          await refresh();
        }
        schedule(5000);
      }, ms);
    };

    schedule(5000);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <section className="px-shell space-y-6 py-8">
      <header className="px-panel p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Live View</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Global User + Session Telemetry</h1>
        <p className="mt-2 text-sm text-slate-300">
          Live operational detail for all users. Camera stream itself is not exposed; live posture telemetry is shown from stored session records.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void refresh()} className="px-button inline-flex" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Now
          </button>
          <p className="text-xs text-slate-400">Last update: {new Date(data.generated_at).toLocaleString()}</p>
          <p className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            Admin: {data.admin.email ?? "-"}
          </p>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Users", value: data.summary.users_total, icon: Users },
          { label: "Active Sessions", value: data.summary.sessions_active, icon: Activity },
          { label: "Online Users", value: onlineUsers, icon: Video },
          { label: "Loaded Records", value: data.summary.records_total_loaded, icon: ShieldAlert },
          { label: "Live Avg Score", value: data.summary.average_live_score, icon: Activity }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="px-panel p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-2 flex items-center gap-2 text-3xl font-semibold text-cyan-200">
                <Icon className="h-5 w-5 text-cyan-300" />
                {item.value}
              </p>
            </article>
          );
        })}
      </div>

      <article className="px-panel p-5">
        <h2 className="text-sm font-semibold text-white">All Users - Live Detail</h2>
        <div className="mt-4 space-y-3">
          {data.users.map((u) => (
            <div
              key={u.id}
              className="grid gap-3 rounded-xl border border-slate-500/30 bg-slate-900/55 p-4 text-sm text-slate-200 lg:grid-cols-[2fr_1fr_1.3fr_1.4fr_1.2fr]"
            >
              <div>
                <p className="font-semibold text-white">{u.full_name || "Unnamed User"}</p>
                <p className="text-xs text-slate-400">{u.email || u.id}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {u.role} | {u.plan_tier}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Coins {u.wallet.coins} | Gems {u.wallet.gems.blue}/{u.wallet.gems.purple}/{u.wallet.gems.gold}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Sessions</p>
                <p>Total: {u.sessions.total_known}</p>
                <p>Active: {u.sessions.active}</p>
                {u.sessions.latest ? (
                  <p className="text-xs text-slate-400">
                    Latest {u.sessions.latest.source} | score {u.sessions.latest.score}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">No session data</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Live Posture</p>
                {u.posture_live ? (
                  <>
                    <p>Score: {Math.round(u.posture_live.score)}</p>
                    <p className={riskTone(u.posture_live.risk_level)}>Risk: {u.posture_live.risk_level}</p>
                    <p className="text-xs text-slate-400">
                      A/S/Y: {Math.round(u.posture_live.alignment)}/{Math.round(u.posture_live.stability)}/
                      {Math.round(u.posture_live.symmetry)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {u.posture_live.source} | {new Date(u.posture_live.captured_at).toLocaleTimeString()}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No live telemetry</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Latest Session</p>
                {u.sessions.latest ? (
                  <>
                    <p>Duration: {Math.round(u.sessions.latest.duration_seconds)}s</p>
                    <p>Alerts: {u.sessions.latest.alert_count}</p>
                    <p className={riskTone(u.sessions.latest.peak_risk)}>Peak Risk: {u.sessions.latest.peak_risk}</p>
                    <p className="text-xs text-slate-500">{new Date(u.sessions.latest.started_at).toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No latest session</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Breaks Today</p>
                <p>Total: {u.breaks_today.total}</p>
                <p>Taken: {u.breaks_today.taken}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
