export type PlanTier = "FREE" | "BASIC" | "PRO";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "CRITICAL";
export type NotificationType = "info" | "success" | "warning" | "payment" | "session" | "plan" | "posture" | "break" | "report" | "reward";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  avgAlignment: number;
  avgSymmetry: number;
  avgStability: number;
  avgFatigue: number;
  peakRisk: RiskLevel;
  durationSeconds: number;
  source?: "camera" | "sensor";
}

export interface PostureRecord {
  sessionId: string;
  createdAt: string;
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
  score: number;
  riskLevel: RiskLevel;
  source?: "camera" | "sensor";
}

export interface AiCoachMessage {
  title: string;
  body: string;
  action: string;
}

export interface TrendPoint {
  time: string;
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
}
