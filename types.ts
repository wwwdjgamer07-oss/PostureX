export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "CRITICAL";

export interface PostureRecord {
  sessionId: string;
  createdAt: string;
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
  score: number;
  riskLevel: RiskLevel;
}

export interface SessionSummary {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  avgAlignment: number;
  avgSymmetry: number;
  avgStability: number;
  avgFatigue: number;
  peakRisk: RiskLevel;
  durationSeconds: number;
}