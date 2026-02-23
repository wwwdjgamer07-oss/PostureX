import { RiskLevel } from "./types";

export function classifyRisk(score: number, fatigue: number): RiskLevel {
  if (score < 40 || fatigue > 85) return "CRITICAL";
  if (score < 55 || fatigue > 70) return "SEVERE";
  if (score < 70 || fatigue > 50) return "HIGH";
  if (score < 85 || fatigue > 30) return "MODERATE";
  return "LOW";
}