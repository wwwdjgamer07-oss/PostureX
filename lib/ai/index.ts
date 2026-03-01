import { puterChat, puterStream } from "@/lib/ai/puter";

export type AIProvider = "openai" | "gemini" | "puter";

type ProviderHandlers = {
  chat: (prompt: string) => Promise<string>;
  stream: (prompt: string) => AsyncIterable<string>;
};

const notConfigured = (provider: Exclude<AIProvider, "puter">) => async (_prompt: string): Promise<string> => {
  throw new Error(`${provider} provider is not configured in this client build.`);
};

const notConfiguredStream = (provider: Exclude<AIProvider, "puter">) => async function* (_prompt: string): AsyncGenerator<string> {
  throw new Error(`${provider} streaming is not configured in this client build.`);
};

const handlers: Record<AIProvider, ProviderHandlers> = {
  openai: {
    chat: notConfigured("openai"),
    stream: notConfiguredStream("openai")
  },
  gemini: {
    chat: notConfigured("gemini"),
    stream: notConfiguredStream("gemini")
  },
  puter: {
    chat: puterChat,
    stream: puterStream
  }
};

export function registerAIProvider(provider: Exclude<AIProvider, "puter">, nextHandlers: Partial<ProviderHandlers>) {
  handlers[provider] = {
    ...handlers[provider],
    ...nextHandlers
  };
}

export function getAIProviders(): AIProvider[] {
  return ["openai", "gemini", "puter"];
}

export async function aiChat(prompt: string, provider: AIProvider): Promise<string> {
  return handlers[provider].chat(prompt);
}

export function aiStream(prompt: string, provider: AIProvider): AsyncIterable<string> {
  return handlers[provider].stream(prompt);
}

