export type CoachingSeverity = "good" | "warning" | "bad";

export interface PostureCoachingMetrics {
  head_forward_angle: number;
  shoulder_tilt: number;
  spine_angle: number;
  score: number;
}

export interface PostureCoachingFeedback {
  message: string;
  severity: CoachingSeverity;
  suggestion: string;
}

export function get_correction_tips(metrics: PostureCoachingMetrics): string[] {
  const tips: string[] = [];

  if (metrics.head_forward_angle > 20) {
    tips.push("Pull chin back", "Raise monitor height");
  }

  if (metrics.spine_angle > 15) {
    tips.push("Lean back 8°", "Support lower back");
  }

  if (metrics.shoulder_tilt > 10) {
    tips.push("Level shoulders", "Center keyboard");
  }

  if (tips.length === 0) {
    if (metrics.score > 85) {
      return ["Hold this posture", "Keep shoulders relaxed"];
    }
    return ["Micro-adjust posture", "Reset spine alignment"];
  }

  return Array.from(new Set(tips));
}

export function generate_posture_feedback(metrics: PostureCoachingMetrics): PostureCoachingFeedback {
  if (metrics.head_forward_angle > 20) {
    return {
      message: "Head forward posture",
      severity: metrics.score < 60 ? "bad" : "warning",
      suggestion: "Straighten your neck"
    };
  }

  if (metrics.shoulder_tilt > 10) {
    return {
      message: "Shoulders uneven",
      severity: metrics.score < 60 ? "bad" : "warning",
      suggestion: "Relax shoulders evenly"
    };
  }

  if (metrics.spine_angle > 15) {
    return {
      message: "Slouch detected",
      severity: metrics.score < 60 ? "bad" : "warning",
      suggestion: "Sit upright"
    };
  }

  if (metrics.score > 85) {
    return {
      message: "Great posture",
      severity: "good",
      suggestion: "Keep this alignment"
    };
  }

  if (metrics.score >= 60) {
    return {
      message: "Minor correction needed",
      severity: "warning",
      suggestion: "Sit upright"
    };
  }

  return {
    message: "Poor posture",
    severity: "bad",
    suggestion: "Straighten your neck and spine"
  };
}
