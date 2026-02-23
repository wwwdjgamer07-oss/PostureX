export type ReportPeriod = "daily" | "weekly";

export interface ReportRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface DailyScorePoint {
  date: string;
  avg_score: number;
  sessions_count: number;
}

export interface PostureReportMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  period: ReportPeriod;
  range: ReportRange;
  averagePostureScore: number;
  dailyScores: DailyScorePoint[];
  totalSittingTimeSeconds: number;
  slouchEventsCount: number;
  neckTiltDeviationAverage: number;
  shoulderImbalancePercent: number;
  fatigueIndex: number;
  improvementVsPreviousPeriod: number;
  aiInsightsSummary: string;
  recommendedCorrections: string[];
  streakDays: number;
  riskLevelClassification: "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "CRITICAL";
}

export interface DeliveryResult {
  ok: boolean;
  reason?: "already_sent" | "disabled" | "plan_not_eligible" | "out_of_schedule";
  error?: string;
  messageId?: string;
}
