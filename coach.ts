import { RiskLevel } from "./types";

export function generateCoachMessage(risk: RiskLevel, metrics: any) {
  const messages = {
    LOW: {
      title: "Excellent Form",
      body: "Your posture is currently within optimal clinical ranges. Keep maintaining this alignment.",
      action: "Maintain current position."
    },
    MODERATE: {
      title: "Minor Deviation",
      body: "We've detected a slight tilt in your shoulder alignment. Try to level your shoulders.",
      action: "Level your shoulders."
    },
    HIGH: {
      title: "Posture Alert",
      body: "Significant forward head lean detected. This increases cervical spine pressure.",
      action: "Pull your chin back slightly."
    },
    SEVERE: {
      title: "Critical Strain",
      body: "High fatigue and poor alignment detected. Your risk of musculoskeletal strain is elevated.",
      action: "Stand up and stretch for 2 minutes."
    },
    CRITICAL: {
      title: "Immediate Break Required",
      body: "Posture metrics have reached critical thresholds. Continued work in this state may lead to injury.",
      action: "Take a 5-minute break immediately."
    }
  };

  return messages[risk];
}