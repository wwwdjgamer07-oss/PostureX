import { RiskLevel, AiCoachMessage } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

export function generateCoachMessage(
  riskLevel: RiskLevel,
  metrics: { alignment: number; symmetry: number; stability: number; fatigue: number }
): AiCoachMessage {
  const alignment = formatPercent(metrics.alignment);
  const symmetry = formatPercent(metrics.symmetry);
  const stability = formatPercent(metrics.stability);
  const fatigue = formatPercent(metrics.fatigue);

  if (riskLevel === "LOW") {
    return {
      title: "Posture baseline is healthy",
      body: `Alignment ${alignment}, symmetry ${symmetry}, stability ${stability}. Keep your current setup and micro-adjust every 20 minutes.`,
      action: "Hold posture and continue focus cycle."
    };
  }

  if (riskLevel === "MODERATE") {
    return {
      title: "Mild drift detected",
      body: `Alignment dropped to ${alignment}. Raise chest, relax traps, and level shoulders to recover symmetry (${symmetry}).`,
      action: "Perform 20-second shoulder reset."
    };
  }

  if (riskLevel === "HIGH") {
    return {
      title: "Significant strain pattern",
      body: `Stability ${stability} with fatigue at ${fatigue}. Your current posture trend can escalate without correction.`,
      action: "Stand up for 60 seconds and recalibrate chair height."
    };
  }

  if (riskLevel === "SEVERE") {
    return {
      title: "Severe ergonomic drift",
      body: `Fatigue ${fatigue} indicates sustained stress. Reduce neck forward lean and re-center pelvis before resuming.`,
      action: "Take a 3-minute guided break."
    };
  }

  return {
    title: "Critical posture risk",
    body: `Current metrics signal high injury potential. Stop active work immediately and run full recovery routine.`,
    action: "End session and perform corrective mobility now."
  };
}
