"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { SessionSummary } from "@/lib/types";
import { SessionTable } from "@/components/SessionTable";
import { TrendChart } from "@/components/TrendChart";

interface Props {
  sessions: SessionSummary[];
}

export function HistoryClient({ sessions }: Props) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const start = new Date(session.startedAt).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : Number.MIN_SAFE_INTEGER;
      const to = toDate ? new Date(toDate).getTime() + 86_399_999 : Number.MAX_SAFE_INTEGER;
      return start >= from && start <= to;
    });
  }, [fromDate, sessions, toDate]);

  const trendData = filtered
    .slice()
    .reverse()
    .map((session, index) => ({
      time: `S${index + 1}`,
      alignment: session.avgAlignment,
      symmetry: session.avgSymmetry,
      stability: session.avgStability,
      fatigue: session.avgFatigue
    }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const response = await fetch(`/api/history/export?${params.toString()}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to export CSV.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mrx-ai-history-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // No-op: surfaced by button state reset.
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="section-shell space-y-6 py-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">History</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Session analytics archive</h1>
      </header>

      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <label className="space-y-1 text-sm text-slate-300">
          <span className="text-xs text-slate-400">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-lg border border-blue-300/25 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-blue-300/40 focus:ring"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span className="text-xs text-slate-400">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-lg border border-blue-300/25 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-blue-300/40 focus:ring"
          />
        </label>
        <button type="button" onClick={exportCsv} className="btn-secondary inline-flex items-center gap-2 py-2 text-xs">
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
        <p className="ml-auto text-xs text-slate-400">{filtered.length} sessions in range</p>
      </div>

      <TrendChart data={trendData} />
      <SessionTable sessions={filtered} />
    </section>
  );
}
