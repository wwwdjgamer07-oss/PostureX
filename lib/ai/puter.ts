type PuterStreamPart = {
  text?: string;
  reasoning?: string;
};

type PuterApi = {
  chat: (...args: unknown[]) => Promise<unknown>;
  txt2img?: (prompt: string, options?: { model?: string }) => Promise<HTMLElement>;
  txt2speech?: (text: string, options?: { provider?: string; model?: string }) => Promise<HTMLAudioElement>;
};

type PuterWindow = Window & {
  puter?: {
    ai?: PuterApi;
  };
};

const PUTER_MODEL = "gpt-5-nano";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Puter request failed.";
}

function getPuterApi() {
  if (typeof window === "undefined") {
    throw new Error("Puter is browser-only and unavailable during SSR.");
  }

  const api = (window as PuterWindow).puter?.ai;
  if (!api?.chat) {
    throw new Error("Puter SDK is not loaded. Please wait and retry.");
  }

  return api;
}

function parsePuterText(result: unknown): string {
  if (typeof result === "string") return result.trim();

  if (result && typeof result === "object" && "text" in result) {
    const text = (result as { text?: unknown }).text;
    if (typeof text === "string") return text.trim();
  }

  if (result && typeof result === "object" && "message" in result) {
    const content = (result as { message?: { content?: unknown } }).message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .join("")
        .trim();
      if (joined) return joined;
    }
  }

  if (result && typeof result === "object" && "choices" in result) {
    const choices = (result as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .join("")
        .trim();
      if (joined) return joined;
    }
  }

  return "";
}

export async function puterChat(prompt: string): Promise<string> {
  try {
    const api = getPuterApi();
    const result = await api.chat(prompt, { model: PUTER_MODEL });
    return parsePuterText(result);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function* puterStream(prompt: string): AsyncGenerator<string, void, void> {
  let stream: AsyncIterable<PuterStreamPart>;

  try {
    const api = getPuterApi();
    stream = (await api.chat(prompt, { model: PUTER_MODEL, stream: true })) as AsyncIterable<PuterStreamPart>;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  for await (const part of stream) {
    const chunk = `${part?.reasoning ?? ""}${part?.text ?? ""}`;
    if (!chunk) continue;
    yield chunk;
  }
}
