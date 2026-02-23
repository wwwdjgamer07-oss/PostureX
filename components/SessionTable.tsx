import { SessionSummary } from "@/lib/types";
import { formatDate, formatPercent } from "@/lib/utils";

interface Props {
  sessions: SessionSummary[];
}

const riskColor = {
  LOW: "text-cyan-300",
  MODERATE: "text-blue-300",
  HIGH: "text-amber-300",
  SEVERE: "text-orange-300",
  CRITICAL: "text-red-300"
};

export function SessionTable({ sessions }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-blue-500/10 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Alignment</th>
              <th className="px-4 py-3">Symmetry</th>
              <th className="px-4 py-3">Stability</th>
              <th className="px-4 py-3">Fatigue</th>
              <th className="px-4 py-3">Peak Risk</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-t border-blue-200/10 text-slate-200">
                <td className="px-4 py-3">{formatDate(session.startedAt)}</td>
                <td className="px-4 py-3">{Math.round(session.durationSeconds / 60)} min</td>
                <td className="px-4 py-3">{formatPercent(session.avgAlignment)}</td>
                <td className="px-4 py-3">{formatPercent(session.avgSymmetry)}</td>
                <td className="px-4 py-3">{formatPercent(session.avgStability)}</td>
                <td className="px-4 py-3">{formatPercent(session.avgFatigue)}</td>
                <td className={`px-4 py-3 font-semibold ${riskColor[session.peakRisk]}`}>{session.peakRisk}</td>
                <td className="px-4 py-3">{session.source === "sensor" ? "Sensor" : "Camera"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
