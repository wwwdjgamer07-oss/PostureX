import { RiskLevel } from "./types";

export function classifyRisk(score: number, fatigue: number): RiskLevel {
  if (score > 85 && fatigue < 30) return "LOW";
  if (score > 70 && fatigue < 50) return "MODERATE";
  if (score > 50) return "HIGH";
  if (score > 30) return "SEVERE";
  return "CRITICAL";
}

export function calculateAdjustedScore(score: number, fatigue: number): number {
  const fatiguePenalty = fatigue * 0.35;
  const adjusted = score - fatiguePenalty;
  return Math.max(0, Math.min(100, adjusted));
}

export function riskLabelDetail(risk: RiskLevel): string {
  switch (risk) {
    case "LOW":
      return "Low risk: posture and fatigue are in a healthy range.";
    case "MODERATE":
      return "Moderate risk: minor strain indicators are present.";
    case "HIGH":
      return "High risk: posture quality is dropping and corrective action is recommended.";
    case "SEVERE":
      return "Severe risk: prolonged strain is likely without immediate correction.";
    case "CRITICAL":
      return "Critical risk: immediate rest and posture reset are strongly advised.";
    default:
      return "Unknown risk level.";
  }
}
