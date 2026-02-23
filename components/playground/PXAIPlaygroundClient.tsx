"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Script from "next/script";
import { useMemo, useState } from "react";
import { Cpu, Gamepad2, Sparkles } from "lucide-react";
import type {
  ImageAnalyzeInput,
  ImageGenerateInput,
  PlaygroundHistoryItem,
  PlaygroundOutputs,
  PlaygroundState,
  StreamInput,
  TextGenerateInput,
  TtsInput
} from "@/components/playground/types";

type ChatOptions = {
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
};

type StreamPart = {
  text?: string;
  reasoning?: string;
};

type PuterApi = {
  chat: (...args: unknown[]) => Promise<unknown>;
  txt2img: (prompt: string, options?: { model?: string }) => Promise<HTMLElement>;
  txt2speech: (text: string, options?: { provider?: string }) => Promise<HTMLAudioElement>;
};

const TextGenerationCard = dynamic(() => import("@/components/playground/modules/TextGenerationCard"), {
  ssr: false,
  loading: () => <LoadingCard title="Text Generation" />
});
const ImageGenerationCard = dynamic(() => import("@/components/playground/modules/ImageGenerationCard"), {
  ssr: false,
  loading: () => <LoadingCard title="Image Generation" />
});
const ImageAnalysisCard = dynamic(() => import("@/components/playground/modules/ImageAnalysisCard"), {
  ssr: false,
  loading: () => <LoadingCard title="Image Analysis" />
});
const StreamingChatCard = dynamic(() => import("@/components/playground/modules/StreamingChatCard"), {
  ssr: false,
  loading: () => <LoadingCard title="Streaming AI Chat" />
});
const TextToSpeechCard = dynamic(() => import("@/components/playground/modules/TextToSpeechCard"), {
  ssr: false,
  loading: () => <LoadingCard title="Text-to-Speech" />
});

function LoadingCard({ title }: { title: string }) {
  return (
    <article className="px-panel animate-skeleton-pulse p-6">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <div className="mt-3 h-28 rounded-2xl bg-slate-800/45" />
    </article>
  );
}

function appendPXContext(prompt: string) {
  return [
    "Platform: PostureX",
    "Domain: posture, ergonomics, human alignment",
    "Audience: desk workers, students, professionals",
    "Tone: supportive, clear, practical",
    "",
    `User request: ${prompt.trim()}`
  ].join("\n");
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return "Request failed.";
  }
}

function parseTextResult(result: unknown) {
  if (typeof result === "string" && result.trim()) return result;

  if (result && typeof result === "object" && "output_text" in result) {
    const maybeOutputText = (result as { output_text?: unknown }).output_text;
    if (typeof maybeOutputText === "string" && maybeOutputText.trim()) return maybeOutputText;
  }

  if (result && typeof result === "object" && "text" in result) {
    const maybeText = (result as { text?: unknown }).text;
    if (typeof maybeText === "string" && maybeText.trim()) return maybeText;
  }

  if (result && typeof result === "object" && "message" in result) {
    const messageContent = (result as { message?: { content?: unknown } }).message?.content;
    if (typeof messageContent === "string" && messageContent.trim()) return messageContent;
    if (Array.isArray(messageContent)) {
      const joined = messageContent
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .join("");
      if (joined.trim()) return joined;
    }
  }

  if (result && typeof result === "object" && "choices" in result) {
    const choices = (result as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
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
        .join("");
      if (joined.trim()) return joined;
    }
  }

  return JSON.stringify(result, null, 2);
}

function isUnsupportedTemperatureError(err: unknown) {
  const message = getErrorMessage(err).toLowerCase();
  return message.includes("unsupported value: 'temperature'") || message.includes("default (1) value is supported");
}

function isEmptyLengthResult(result: unknown) {
  if (!result || typeof result !== "object") return false;

  if ("choices" in result) {
    const choices = (result as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) return false;
    const first = choices[0] as { finish_reason?: unknown; message?: { content?: unknown } };
    const finishReason = typeof first?.finish_reason === "string" ? first.finish_reason.toLowerCase() : "";
    const content = first?.message?.content;
    const contentEmpty =
      content === "" ||
      content == null ||
      (Array.isArray(content) && content.every((part) => !(part && typeof part === "object" && "text" in part)));
    return finishReason === "length" && contentEmpty;
  }

  if ("message" in result || "finish_reason" in result) {
    const single = result as { finish_reason?: unknown; message?: { content?: unknown } };
    const finishReason = typeof single.finish_reason === "string" ? single.finish_reason.toLowerCase() : "";
    const content = single.message?.content;
    const contentEmpty =
      content === "" ||
      content == null ||
      (Array.isArray(content) && content.every((part) => !(part && typeof part === "object" && "text" in part)));
    return finishReason === "length" && contentEmpty;
  }

  return false;
}

export function PXAIPlaygroundClient() {
  const [playgroundState, setPlaygroundState] = useState<PlaygroundState>({
    sdkReady: false,
    busyModule: null,
    error: ""
  });
  const [playgroundHistory, setPlaygroundHistory] = useState<PlaygroundHistoryItem[]>([]);
  const [playgroundOutputs, setPlaygroundOutputs] = useState<PlaygroundOutputs>({
    text: "",
    imageUrl: "",
    analysis: "",
    stream: "",
    ttsAudioUrl: ""
  });

  const helperText = useMemo(() => {
    return playgroundState.sdkReady ? "Puter SDK loaded." : "Loading Puter SDK...";
  }, [playgroundState.sdkReady]);

  const getPuter = () => {
    const api = (window as Window & { puter?: { ai?: PuterApi } }).puter?.ai;
    if (!api) {
      throw new Error("Puter SDK is not ready. Please wait and retry.");
    }
    return api;
  };

  const pushHistory = (item: Omit<PlaygroundHistoryItem, "createdAt">) => {
    setPlaygroundHistory((prev) => [{ ...item, createdAt: new Date().toISOString() }, ...prev].slice(0, 12));
  };

  const runWithModule = async (module: PlaygroundHistoryItem["module"], prompt: string, run: () => Promise<void>) => {
    setPlaygroundState((prev) => ({ ...prev, busyModule: module, error: "" }));
    try {
      await run();
      pushHistory({ module, prompt, status: "success" });
    } catch (error) {
      const message = getErrorMessage(error);
      setPlaygroundState((prev) => ({ ...prev, error: message }));
      pushHistory({ module, prompt, status: "error" });
    } finally {
      setPlaygroundState((prev) => ({ ...prev, busyModule: null }));
    }
  };

  const handleTextGenerate = async (input: TextGenerateInput) => {
    await runWithModule("text", input.prompt, async () => {
      if (!Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2) {
        throw new Error("Temperature must be between 0 and 2.");
      }
      if (!Number.isFinite(input.maxTokens) || input.maxTokens < 1) {
        throw new Error("Max tokens must be a positive number.");
      }

      const api = getPuter();
      const prompt = appendPXContext(input.prompt);
      const options: ChatOptions = {
        model: input.model,
        max_tokens: Math.floor(input.maxTokens)
      };

      let result: unknown;
      try {
        result = await api.chat(prompt, { ...options, temperature: input.temperature });
      } catch (error) {
        if (!isUnsupportedTemperatureError(error)) throw error;
        result = await api.chat(prompt, options);
      }

      if (isEmptyLengthResult(result)) {
        // Retry without max_tokens/temperature so providers with strict defaults can return actual content.
        result = await api.chat(prompt, { model: input.model });
      }

      setPlaygroundOutputs((prev) => ({ ...prev, text: parseTextResult(result) }));
    });
  };

  const handleImageGenerate = async (input: ImageGenerateInput) => {
    await runWithModule("image", input.prompt, async () => {
      const api = getPuter();
      const prompt = appendPXContext(input.prompt);
      const imageElement = await api.txt2img(prompt, { model: input.model });
      const imageSrc = imageElement.getAttribute("src") ?? (imageElement as HTMLImageElement).src;
      if (!imageSrc) {
        throw new Error("Image generation succeeded but no src was returned.");
      }
      setPlaygroundOutputs((prev) => ({ ...prev, imageUrl: imageSrc }));
    });
  };

  const handleImageAnalyze = async (input: ImageAnalyzeInput) => {
    await runWithModule("analysis", input.prompt, async () => {
      const api = getPuter();
      const prompt = appendPXContext(input.prompt);
      const result = await api.chat(prompt, input.imageUrl, { model: input.model });
      setPlaygroundOutputs((prev) => ({ ...prev, analysis: parseTextResult(result) }));
    });
  };

  const handleStream = async (input: StreamInput) => {
    await runWithModule("stream", input.prompt, async () => {
      const api = getPuter();
      const prompt = appendPXContext(input.prompt);
      setPlaygroundOutputs((prev) => ({ ...prev, stream: "" }));

      const stream = (await api.chat(prompt, { model: input.model, stream: true })) as AsyncIterable<StreamPart>;
      for await (const part of stream) {
        const delta = `${part?.reasoning ?? ""}${part?.text ?? ""}`;
        if (!delta) continue;
        setPlaygroundOutputs((prev) => ({ ...prev, stream: `${prev.stream}${delta}` }));
      }
    });
  };

  const handleTts = async (input: TtsInput) => {
    await runWithModule("tts", input.text, async () => {
      const api = getPuter();
      const prompt = appendPXContext(input.text);
      const audioElement = await api.txt2speech(prompt, { provider: "openai" });
      const audioSrc = audioElement.getAttribute("src") ?? audioElement.src;
      if (!audioSrc) {
        throw new Error("Text-to-speech succeeded but no audio src was returned.");
      }
      setPlaygroundOutputs((prev) => ({ ...prev, ttsAudioUrl: audioSrc }));
    });
  };

  return (
    <>
      <Script src="https://js.puter.com/v2/" strategy="afterInteractive" onLoad={() => setPlaygroundState((prev) => ({ ...prev, sdkReady: true }))} />

      <div className="px-shell space-y-6 pb-12">
        <section className="px-panel p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
            <Cpu className="h-4 w-4" />
            PX AI Playground
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">PX AI Playground</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-600 dark:text-slate-300">
            PX AI Playground helps you explore posture knowledge, generate visuals, and get AI insights while your core posture tracking remains active.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5" />
            {helperText}
          </p>
          {playgroundState.error ? (
            <p className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/10 p-3 text-sm text-rose-200">{playgroundState.error}</p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="px-panel p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              Posture Games
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Train posture through interactive challenges.</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Balance Trainer, Anti-Slouch Challenge, and Reflex Correction Game powered by live PX posture telemetry.
            </p>
            <Link href="/ai/games" className="px-button mt-4 inline-flex">
              Open Posture Games
            </Link>
          </article>

          <article className="px-panel p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              PX Play Arcade
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Classic neon mini-games with optional posture-enhanced bonuses.</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Snake, Lunar Lander, XO, Pong, Breakout, and Memory in a recognizable arcade flow.
            </p>
            <Link href="/px-play" className="px-button mt-4 inline-flex">
              Open PX Play
            </Link>
          </article>

          <TextGenerationCard
            disabled={!playgroundState.sdkReady || playgroundState.busyModule !== null}
            isBusy={playgroundState.busyModule === "text"}
            output={playgroundOutputs.text}
            onGenerate={handleTextGenerate}
          />
          <ImageGenerationCard
            disabled={!playgroundState.sdkReady || playgroundState.busyModule !== null}
            imageUrl={playgroundOutputs.imageUrl}
            onGenerate={handleImageGenerate}
          />
          <ImageAnalysisCard
            disabled={!playgroundState.sdkReady || playgroundState.busyModule !== null}
            output={playgroundOutputs.analysis}
            onAnalyze={handleImageAnalyze}
          />
          <StreamingChatCard
            disabled={!playgroundState.sdkReady || playgroundState.busyModule !== null}
            output={playgroundOutputs.stream}
            onStream={handleStream}
          />
          <TextToSpeechCard
            disabled={!playgroundState.sdkReady || playgroundState.busyModule !== null}
            audioUrl={playgroundOutputs.ttsAudioUrl}
            onGenerate={handleTts}
          />

          <article className="px-panel p-6">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Playground Activity</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sandboxed history isolated from posture metrics and sessions.</p>
            <div className="mt-3 space-y-2">
              {playgroundHistory.length === 0 ? (
                <p className="rounded-xl border border-slate-500/30 bg-slate-900/45 px-3 py-2 text-xs text-slate-400">No Playground actions yet.</p>
              ) : (
                playgroundHistory.map((item, index) => (
                  <p key={`${item.createdAt}-${index}`} className="rounded-xl border border-slate-500/30 bg-slate-900/45 px-3 py-2 text-xs text-slate-300">
                    {item.module.toUpperCase()} - {item.status.toUpperCase()} - {new Date(item.createdAt).toLocaleTimeString()}
                  </p>
                ))
              )}
            </div>
          </article>
        </section>

        <div>
          <Link href="/dashboard" className="px-button-ghost inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
