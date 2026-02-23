import { AlertTriangle } from "lucide-react";
import { RISK_COLORS } from "@/lib/constants";
import { RiskLevel } from "@/lib/types";

const riskDescriptions: Record<RiskLevel, string> = {
  LOW: "Posture stable and ergonomically balanced.",
  MODERATE: "Minor imbalance observed. Correct now to avoid drift.",
  HIGH: "High strain pattern is building. Trigger coaching sequence.",
  SEVERE: "Severe drift. Pause, reset body position, and re-evaluate.",
  CRITICAL: "Critical posture risk. End current session and recover."
};

export function RiskIndicator({ level }: { level: RiskLevel }) {
  const color = RISK_COLORS[level];

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Risk Level</h3>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color, backgroundColor: `${color}20` }}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {level}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: level === "LOW" ? "20%" : level === "MODERATE" ? "40%" : level === "HIGH" ? "60%" : level === "SEVERE" ? "80%" : "100%",
            backgroundColor: color
          }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-400">{riskDescriptions[level]}</p>
    </div>
  );
}
