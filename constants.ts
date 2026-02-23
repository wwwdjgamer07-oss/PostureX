export const PLAN_PRICES = {
  FREE: { monthly: 0, yearly: 0 },
  PRO: { monthly: 39, yearly: 390 },
  ENTERPRISE: { monthly: 199, yearly: 1990 },
};

export const PLAN_FEATURES = {
  FREE: [
    "Real-time posture tracking",
    "Basic risk alerts",
    "7-day history retention",
    "Webcam landmark overlay"
  ],
  PRO: [
    "Advanced 3D analytics",
    "Unlimited history",
    "Voice coaching",
    "PDF/CSV exports",
    "Priority support"
  ],
  ENTERPRISE: [
    "Team analytics dashboard",
    "Admin controls",
    "Custom risk thresholds",
    "SLA guarantee",
    "Dedicated account manager"
  ]
};

export const RISK_COLORS = {
  LOW: "#00E5FF",
  MODERATE: "#29B6F6",
  HIGH: "#FFB300",
  SEVERE: "#FF7043",
  CRITICAL: "#FF1744"
};