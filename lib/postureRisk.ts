export type PostureRiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export interface PostureRiskInput {
  avgScore: number;
  fatigueTime: number;
  slouchEvents: number;
  headForwardEvents: number;
}

export interface PostureRiskClassification {
  risk_level: PostureRiskLevel;
  label: string;
  color: string;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function classifyPostureRisk(input: PostureRiskInput): PostureRiskClassification {
  const score = clampScore(input.avgScore);

  if (score > 85) {
    return {
      risk_level: "LOW",
      label: "Low risk",
      color: "#34d399"
    };
  }

  if (score >= 70) {
    return {
      risk_level: "MODERATE",
      label: "Moderate risk",
      color: "#facc15"
    };
  }

  if (score >= 50) {
    return {
      risk_level: "HIGH",
      label: "High risk",
      color: "#fb923c"
    };
  }

  return {
    risk_level: "SEVERE",
    label: "Severe risk",
    color: "#f43f5e"
  };
}
