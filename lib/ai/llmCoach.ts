import type { EmotionSignal } from "@/lib/ai/emotionEngine";
import type { UserMemoryRecord } from "@/lib/ai/memoryEngine";
import type { PostureAIMetrics, PostureAIMessage } from "@/lib/postureAI";
import type { CoachPersona } from "@/lib/ai/coachPersona";
import { PX_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";

interface PageContext {
  path?: string;
  pageType?: string;
}

interface LLMCoachInput {
  userMessage: string;
  metrics: PostureAIMetrics;
  emotion: EmotionSignal;
  persona?: CoachPersona;
  memory: UserMemoryRecord | null;
  history: PostureAIMessage[];
  pageContext?: PageContext;
}

interface LLMResult {
  provider: "gemini" | "none";
  text: string | null;
  reason?: string;
}

interface GeminiGenerateContentResponse {
  error?: {
    message?: string;
  };
  promptFeedback?: {
    blockReason?: string;
  };
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function compactJson(value: unknown) {
  return JSON.stringify(value);
}

function sanitizeSpeech(text: string) {
  return text
    .replace(/[*_`#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveGeminiApiKey() {
  return String(process.env.GOOGLE_AI_API_KEY ?? "").trim();
}

function resolveGeminiModel() {
  const configured = String(process.env.GOOGLE_AI_MODEL ?? "").trim();
  return configured || "gemini-1.5-flash";
}

function normalizeModelPath(model: string) {
  if (model.startsWith("models/")) return model;
  return `models/${model}`;
}

function extractGeminiText(data: GeminiGenerateContentResponse) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates.flatMap((candidate) => candidate.content?.parts ?? []);
  const text = parts
    .map((part) => String(part.text ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || null;
}

export async function generateLLMCoachResponse(input: LLMCoachInput): Promise<LLMResult> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { provider: "none", text: null, reason: "gemini_key_missing" };
  }
  const modelPath = normalizeModelPath(resolveGeminiModel());

  const userPayload = [
    "User message:",
    input.userMessage,
    "",
    "Context:",
    compactJson({
      page: input.pageContext ?? null,
      metrics: input.metrics,
      emotion: {
        primary: input.emotion.primaryEmotion,
        tone: input.emotion.coachingTone,
        intensity: input.emotion.intensity
      },
      persona: input.persona ?? null,
      memory: input.memory
    }),
    "",
    "Respond as PX in plain text only."
  ].join("\n");

  const historyContents = input.history.slice(-12).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  const payload = {
    contents: [
      ...historyContents,
      {
        role: "user",
        parts: [{ text: userPayload }]
      }
    ],
    systemInstruction: {
      parts: [{ text: PX_SYSTEM_PROMPT }]
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 180,
      candidateCount: 1
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      return { provider: "none", text: null, reason: `gemini_http_${response.status}` };
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const text = extractGeminiText(data);

    if (text) {
      return { provider: "gemini", text: sanitizeSpeech(text) };
    }

    if (data.promptFeedback?.blockReason) {
      return { provider: "none", text: null, reason: `gemini_blocked_${data.promptFeedback.blockReason.toLowerCase()}` };
    }

    return { provider: "none", text: null, reason: "gemini_empty_response" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { provider: "none", text: null, reason: "gemini_timeout" };
    }
    return { provider: "none", text: null, reason: "gemini_exception" };
  } finally {
    clearTimeout(timeout);
  }
}
