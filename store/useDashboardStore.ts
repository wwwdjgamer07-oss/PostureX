import { create } from "zustand";
import { PlanTier, PostureRecord, SessionSummary, TrendPoint, AiCoachMessage, RiskLevel } from "@/lib/types";

interface DashboardState {
  sessionId: string | null;
  running: boolean;
  planTier: PlanTier;
  liveMetrics: {
    alignment: number;
    symmetry: number;
    stability: number;
    fatigue: number;
    score: number;
    riskLevel: RiskLevel;
  };
  coach: AiCoachMessage;
  records: PostureRecord[];
  trend: TrendPoint[];
  history: SessionSummary[];
  breakReminderVisible: boolean;
  startedAt: number | null;
  
  setPlanTier: (tier: PlanTier) => void;
  setDemoMode: (isDemo: boolean) => void;
  startSession: (sessionId: string) => void;
  stopSession: () => void;
  ingestFrame: (metrics: Omit<DashboardState['liveMetrics'], 'riskLevel'> & { riskLevel: RiskLevel }, timestamp: number) => void;
  pushRecord: (record: PostureRecord) => void;
  setHistory: (sessions: SessionSummary[]) => void;
  showBreakReminder: (visible: boolean) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  sessionId: null,
  running: false,
  planTier: "FREE",
  liveMetrics: {
    alignment: 0,
    symmetry: 0,
    stability: 0,
    fatigue: 0,
    score: 0,
    riskLevel: "LOW"
  },
  coach: {
    title: "Ready to start",
    body: "Start a session to receive live coaching.",
    action: "Waiting..."
  },
  records: [],
  trend: [],
  history: [],
  breakReminderVisible: false,
  startedAt: null,

  setPlanTier: (tier) => set({ planTier: tier }),
  setDemoMode: () => {},
  startSession: (sessionId) => set({ sessionId, running: true, startedAt: Date.now(), records: [], trend: [] }),
  stopSession: () => set({ running: false, sessionId: null, startedAt: null }),
  ingestFrame: (metrics) => set({ liveMetrics: metrics }),
  pushRecord: (record) => set((state) => ({ 
    records: [...state.records, record],
    trend: [...state.trend, { 
      time: new Date(record.createdAt).toLocaleTimeString(), 
      alignment: record.alignment,
      symmetry: record.symmetry,
      stability: record.stability,
      fatigue: record.fatigue
    }].slice(-20)
  })),
  setHistory: (history) => set({ history }),
  showBreakReminder: (visible) => set({ breakReminderVisible: visible }),
  reset: () => set({ 
    sessionId: null, 
    running: false, 
    records: [], 
    trend: [], 
    liveMetrics: { alignment: 0, symmetry: 0, stability: 0, fatigue: 0, score: 0, riskLevel: "LOW" } 
  })
}));