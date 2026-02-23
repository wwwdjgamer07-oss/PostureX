import type { EmotionSignal } from "@/lib/ai/emotionEngine";
import type { UserMemoryRecord } from "@/lib/ai/memoryEngine";
import type { PostureAIMetrics, PostureAIMessage } from "@/lib/postureAI";
import type { CoachPersona } from "@/lib/ai/coachPersona";

interface PageContext {
  path?: string;
  pageType?: string;
}

interface ResponseInput {
  userMessage: string;
  metrics: PostureAIMetrics;
  emotion: EmotionSignal;
  memory: UserMemoryRecord | null;
  history: PostureAIMessage[];
  persona?: CoachPersona;
  pageContext?: PageContext;
}

type Intent =
  | "greeting"
  | "help"
  | "pain"
  | "fatigue"
  | "progress"
  | "pricing"
  | "posture"
  | "product"
  | "idle"
  | "unknown";

function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function trendDelta(metrics: PostureAIMetrics) {
  if (metrics.weekly_trend.length < 2) return 0;
  const first = metrics.weekly_trend[0]?.avg_score ?? 0;
  const last = metrics.weekly_trend[metrics.weekly_trend.length - 1]?.avg_score ?? first;
  return Math.round(last - first);
}

function detectIntent(userText: string): Intent {
  const text = userText.toLowerCase().trim();
  const compact = text.replace(/[^\w\s]/g, " ");

  if (!compact) return "idle";
  if (/^(hi|hii|hello|hey|good morning|good afternoon|good evening)\b/.test(compact)) return "greeting";
  if (/\b(help|assist|guide)\b/.test(compact)) return "help";
  if (/\b(pain|hurt|ache|tight|stiff|sore|discomfort)\b/.test(compact)) return "pain";
  if (/\b(tired|fatigue|exhausted|drained|long day)\b/.test(compact)) return "fatigue";
  if (/\b(improving|progress|better|am i improving|trend)\b/.test(compact)) return "progress";
  if (/\b(plan|pricing|price|buy|basic|pro|weekly|subscription)\b/.test(compact)) return "pricing";
  if (/\b(posture|sit|slouch|neck|shoulder|alignment|spine)\b/.test(compact)) return "posture";
  if (/\b(what is posturex|how does posturex|features)\b/.test(compact)) return "product";
  return "unknown";
}

function continuityLine(memory: UserMemoryRecord | null) {
  if (!memory) return "";
  if (memory.pain_points[0]) return `You mentioned ${memory.pain_points[0]} before. How is it now?`;
  if (memory.user_name) return `${memory.user_name}, I am right here with you.`;
  return "";
}

function postureObservation(metrics: PostureAIMetrics) {
  if (typeof metrics.neck_angle === "number" && metrics.neck_angle > 18) {
    return "Your head is drifting forward a bit.";
  }
  if (typeof metrics.shoulder_tilt === "number" && Math.abs(metrics.shoulder_tilt) > 8) {
    return "One shoulder is sitting slightly higher.";
  }
  if (metrics.fatigue_level >= 70) {
    return "You have been holding still a while.";
  }
  if (metrics.risk_level === "HIGH" || metrics.risk_level === "SEVERE") {
    return "I am seeing a small posture drift.";
  }
  return "Posture looks mostly steady.";
}

function correctionCue(metrics: PostureAIMetrics) {
  if (metrics.fatigue_level >= 70) {
    return "Take one deep breath and lift gently through your spine.";
  }
  if (metrics.risk_level === "HIGH" || metrics.risk_level === "SEVERE") {
    return "Let us reset now. Feet grounded. Shoulders soft. Head over shoulders.";
  }
  return "Roll your shoulders back slightly and stack your head over your chest.";
}

function reinforcementLine(metrics: PostureAIMetrics) {
  if (metrics.alignment_score >= 80) return pickOne(["Nice alignment.", "Good steady posture.", "That is balanced."]);
  if (metrics.alignment_score >= 65) return pickOne(["That is better already.", "Nice correction.", "Good awareness there."]);
  return pickOne(["Good reset.", "That is a stronger position.", "Keep that gentle hold."]);
}

function toneLead(emotion: EmotionSignal) {
  if (emotion.coachingTone === "gentle") return "Let us keep this gentle today.";
  if (emotion.coachingTone === "reassuring") return "Totally okay. Posture shifts happen.";
  if (emotion.coachingTone === "firm") return "Let us correct this early.";
  if (emotion.coachingTone === "upbeat") return "Nice focus right now.";
  return "";
}

function pageContextLine(pageType: string) {
  if (pageType === "pricing") return "Want help choosing between Basic, Pro monthly, and Pro weekly?";
  if (pageType === "dashboard") return "Session posture is in view. We can tune it in real time.";
  if (pageType === "alerts") return "We can calm these alerts with small resets.";
  return "";
}

function cleanSpeech(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?])/g, "$1")
    .trim();
}

export function generateCoachResponse(input: ResponseInput) {
  const userText = input.userMessage;
  const intent = detectIntent(userText);
  const pageType = input.pageContext?.pageType ?? "general";
  const lead = toneLead(input.emotion);
  const continuity = continuityLine(input.memory);
  const personaId = input.persona?.id ?? "precision_analyst";
  const personaLead =
    personaId === "supportive_guide"
      ? "You are safe here. We will make this easy."
      : personaId === "performance_coach"
        ? "Let us lock in a strong rep right now."
        : "Let us run a precise posture correction.";

  if (intent === "greeting") {
    return cleanSpeech(
      [pickOne(["Hey. Good to see you. How is your posture feeling right now?", "Hey. I am here with you. How is your posture feeling?", "Hi. Let us do a quick posture check."]), continuity, pageContextLine(pageType)]
        .concat(personaId === "performance_coach" ? ["We can turn this into a quick win."] : [])
        .filter(Boolean)
        .join(" ")
    );
  }

  if (intent === "help") {
    return cleanSpeech("Of course. What feels off right now?");
  }

  if (intent === "pain") {
    return cleanSpeech(
      [personaLead, lead, "Where are you noticing it?", postureObservation(input.metrics), correctionCue(input.metrics), reinforcementLine(input.metrics)]
        .filter(Boolean)
        .join(" ")
    );
  }

  if (intent === "fatigue") {
    return cleanSpeech(
      [personaLead, lead, "You have been sitting a while.", "Let us refresh your posture for a second.", correctionCue(input.metrics), "Good reset."]
        .filter(Boolean)
        .join(" ")
    );
  }

  if (intent === "progress") {
    const delta = trendDelta(input.metrics);
    const trendLine =
      delta > 0
        ? "Your posture stability has improved."
        : delta < 0
          ? "There is a small dip, but we can recover it."
          : "You are holding steady.";
    return cleanSpeech([trendLine, reinforcementLine(input.metrics)].join(" "));
  }

  if (intent === "pricing") {
    return cleanSpeech(
      "If you want core tracking, Basic is usually enough. If you want deeper coaching, choose Pro monthly. If you need short-term access, Pro weekly is a flexible option."
    );
  }

  if (intent === "product") {
    return cleanSpeech("PostureX stays with you during real work, gives gentle corrections, and helps you build stronger daily posture habits.");
  }

  if (intent === "posture") {
    return cleanSpeech([postureObservation(input.metrics), correctionCue(input.metrics), reinforcementLine(input.metrics)].join(" "));
  }

  if (intent === "idle") {
    return cleanSpeech(pickOne(["Posture check. Still aligned.", "I am here if you need a reset.", "Still with me. Let us realign once more."]));
  }

  return cleanSpeech(
    [
      personaLead,
      lead,
      postureObservation(input.metrics),
      correctionCue(input.metrics),
      reinforcementLine(input.metrics),
      pageContextLine(pageType)
    ]
      .filter(Boolean)
      .join(" ")
  );
}
