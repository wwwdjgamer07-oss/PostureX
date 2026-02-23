export type CoachEvent = "good_posture" | "streak" | "slouch" | "fatigue" | "break";

type PostureTrend = "improving" | "stable" | "declining";

interface CoachContext {
  fatigueLevel?: "none" | "low" | "medium" | "high";
  sessionSeconds?: number;
  trend?: PostureTrend;
  riskLevel?: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  hourOfDay?: number;
}

function randomFrom(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function pickWithoutRepeat(messages: string[], lastMessage?: string | null) {
  if (messages.length === 1) return messages[0];
  const filtered = lastMessage ? messages.filter((entry) => entry !== lastMessage) : messages;
  return randomFrom(filtered.length > 0 ? filtered : messages);
}

function getTimePhrase(hourOfDay?: number) {
  if (hourOfDay === undefined) return "this session";
  if (hourOfDay < 12) return "this morning";
  if (hourOfDay < 18) return "earlier today";
  return "this evening";
}

function buildMessages(event: CoachEvent, context: CoachContext) {
  const timePhrase = getTimePhrase(context.hourOfDay);

  if (event === "good_posture") {
    const improving = context.trend === "improving";
    return improving
      ? [
          "That reset helped. You're more aligned than a few minutes ago.",
          `Nice correction. You look steadier than ${timePhrase}.`
        ]
      : [
          "Nice alignment. Keep that easy, relaxed posture.",
          "You're steady right now. Good control through your shoulders."
        ];
  }

  if (event === "streak") {
    return [
      "You've held this well for a while. Keep the same calm setup.",
      "Consistency looks strong right now. Keep breathing and stay relaxed."
    ];
  }

  if (event === "slouch") {
    const deepFocus = (context.sessionSeconds ?? 0) >= 40 * 60;
    return deepFocus
      ? [
          "Your head is drifting forward again. Looks like deep focus mode.",
          "You're leaning in a bit now. Ease back into the chair slightly."
        ]
      : [
          "A little forward drift is showing. Try a small chest lift.",
          "Shoulders are rounding a touch. Relax and stack back up."
        ];
  }

  if (event === "fatigue") {
    if (context.fatigueLevel === "high") {
      return [
        "You're running on tension now. A short reset will help you finish stronger.",
        "You usually fade around this point. Take two minutes and come back fresh."
      ];
    }

    if (context.fatigueLevel === "medium") {
      return [
        "Tension is building in your upper body. Soften your shoulders.",
        "You're starting to tire. Unclench your jaw and settle back a little."
      ];
    }

    return [
      "Small fatigue signs are showing. Tiny posture reset now will go a long way.",
      "Energy is dipping a little. Keep your neck long and shoulders easy."
    ];
  }

  const urgentBreak = context.fatigueLevel === "high" || context.riskLevel === "SEVERE";
  return urgentBreak
    ? [
        "Let's pause for a short break. Your body will thank you.",
        "Quick reset time. Stand, breathe, and loosen your shoulders."
      ]
    : [
        "Good point for a brief break. Come back with fresh posture.",
        "Take a short walk and return. You'll feel sharper."
      ];
}

export function generate_coach_message(event: CoachEvent, lastMessage?: string | null, context: CoachContext = {}): string {
  const messages = buildMessages(event, context);
  return pickWithoutRepeat(messages, lastMessage);
}
