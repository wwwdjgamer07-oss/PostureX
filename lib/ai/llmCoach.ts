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
  model?: string;
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
  return configured || "gemini-1.5-pro";
}

function buildGeminiModelCandidates() {
  const primaryRaw = resolveGeminiModel();
  const primary = primaryRaw.toLowerCase();
  const proPool = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-pro-latest"];
  const flashPool = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

  const ordered =
    primary.includes("flash")
      ? [primaryRaw, ...flashPool, ...proPool]
      : primary.includes("pro") || primary === "pro" || primary === "gemini-pro"
        ? [primaryRaw, ...proPool, ...flashPool]
        : [primaryRaw, ...proPool, ...flashPool];

  return Array.from(new Set(ordered.map((item) => item.trim()).filter(Boolean))).map(normalizeModelPath);
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
  const modelCandidates = buildGeminiModelCandidates();

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

  async function callGeminiOnce(modelPath: string, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    let lastReason = "gemini_empty_response";

    for (const modelPath of modelCandidates) {
      let response = await callGeminiOnce(modelPath, 15000);
      if (!response.ok && response.status >= 500) {
        response = await callGeminiOnce(modelPath, 15000);
      }

      if (!response.ok) {
        const canTryNextModel = (response.status === 400 || response.status === 404) && modelPath !== modelCandidates[modelCandidates.length - 1];
        lastReason = `gemini_http_${response.status}`;
        if (canTryNextModel) continue;
        return { provider: "none", text: null, reason: lastReason };
      }

      const data = (await response.json()) as GeminiGenerateContentResponse;
      const text = extractGeminiText(data);

      if (text) {
        return { provider: "gemini", text: sanitizeSpeech(text), model: modelPath.replace(/^models\//, "") };
      }

      if (data.promptFeedback?.blockReason) {
        return { provider: "none", text: null, reason: `gemini_blocked_${data.promptFeedback.blockReason.toLowerCase()}` };
      }

      lastReason = "gemini_empty_response";
    }

    return { provider: "none", text: null, reason: lastReason };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      try {
        const retry = await callGeminiOnce(modelCandidates[0], 15000);
        if (!retry.ok) {
          return { provider: "none", text: null, reason: `gemini_http_${retry.status}` };
        }
        const retryData = (await retry.json()) as GeminiGenerateContentResponse;
        const retryText = extractGeminiText(retryData);
        if (retryText) {
          return { provider: "gemini", text: sanitizeSpeech(retryText), model: modelCandidates[0].replace(/^models\//, "") };
        }
      } catch {
        // Fall through to timeout reason.
      }
      return { provider: "none", text: null, reason: "gemini_timeout" };
    }
    return { provider: "none", text: null, reason: "gemini_exception" };
  }
}
