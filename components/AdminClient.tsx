"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Loader2 } from "lucide-react";

interface PendingPayment {
  id: string;
  user_id: string | null;
  plan: string | null;
  amount_inr: number | null;
  status: string | null;
  created_at: string;
  user_email?: string;
}

interface Props {
  userCount: number;
  activeSessions: number;
  estimatedMrr: number;
  subscriptionBreakdown: {
    plan: string;
    count: number;
  }[];
  riskLevelBreakdown: {
    level: string;
    count: number;
  }[];
  heatmap: {
    hour: number;
    severity: number;
  }[];
  pendingPayments: PendingPayment[];
}

const riskColor: Record<string, string> = {
  LOW: "#00E5FF",
  MODERATE: "#29B6F6",
  HIGH: "#FFB300",
  SEVERE: "#FF7043",
  CRITICAL: "#FF1744"
};

export function AdminClient({
  userCount,
  activeSessions,
  estimatedMrr,
  subscriptionBreakdown,
  riskLevelBreakdown,
  heatmap,
  pendingPayments
}: Props) {
  const [items, setItems] = useState<PendingPayment[]>(pendingPayments);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);

  async function runAction(paymentId: string, action: "approve" | "reject") {
    setWorkingId(paymentId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/${action}`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Failed to ${action} payment.`);
      }

      setItems((previous) => previous.filter((item) => item.id !== paymentId));
      setMessage(payload.message || `Payment ${action}d.`);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : `Failed to ${action} payment.`);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="px-shell space-y-6 py-8">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">PostureX Operations</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Users", String(userCount)],
          ["Active Sessions", String(activeSessions)],
          ["Estimated MRR", `\u20b9${estimatedMrr}`],
          ["Pending Payments", String(pendingCount)]
        ].map(([label, value]) => (
          <article key={label} className="px-panel p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-200">{value}</p>
          </article>
        ))}
      </div>

      <div className="px-panel p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Payment Verification Queue</h2>
        {items.length === 0 ? <p className="text-sm text-slate-400">No pending payments.</p> : null}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-xl border border-slate-500/25 bg-slate-900/55 p-3 md:grid-cols-[1.2fr_0.7fr_0.6fr_0.8fr_auto] md:items-center">
              <div className="text-sm text-slate-200">
                <p className="font-semibold">{item.user_email || item.user_id || "Unknown user"}</p>
                <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <p className="text-sm text-slate-300">Plan: {String(item.plan || "").toUpperCase()}</p>
              <p className="text-sm text-cyan-200">\u20b9{item.amount_inr ?? 0}</p>
              <p className="text-sm uppercase tracking-wide text-amber-300">{item.status}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={workingId === item.id}
                  onClick={() => {
                    void runAction(item.id, "approve");
                  }}
                  className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-60"
                >
                  {workingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={workingId === item.id}
                  onClick={() => {
                    void runAction(item.id, "reject");
                  }}
                  className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="px-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Subscription Analytics</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscriptionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(145,180,255,.2)" />
                <XAxis dataKey="plan" tick={{ fill: "#b6c7f9", fontSize: 11 }} />
                <YAxis tick={{ fill: "#b6c7f9", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 15, 31, .94)",
                    border: "1px solid rgba(138, 180, 255, 0.3)",
                    borderRadius: 12
                  }}
                />
                <Bar dataKey="count" fill="#2962FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="px-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Risk Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskLevelBreakdown} dataKey="count" nameKey="level" innerRadius={64} outerRadius={108} paddingAngle={4}>
                  {riskLevelBreakdown.map((entry) => (
                    <Cell key={entry.level} fill={riskColor[entry.level] || "#2962FF"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 15, 31, .94)",
                    border: "1px solid rgba(138, 180, 255, 0.3)",
                    borderRadius: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="px-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Risk Heatmap Overview (24h)</h2>
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-12 lg:grid-cols-24">
          {heatmap.map((item) => {
            const opacity = Math.min(1, Math.max(0.08, item.severity / 15));
            return (
              <div key={item.hour} className="space-y-1 text-center">
                <div className="h-16 rounded-md border border-blue-300/20 bg-red-500" style={{ opacity }} />
                <p className="text-[10px] text-slate-400">{item.hour}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
