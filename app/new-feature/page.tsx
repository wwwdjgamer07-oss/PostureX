"use client";

import Link from "next/link";
import Script from "next/script";
import { useMemo, useRef, useState } from "react";
import { AudioLines, Bot, ImageIcon, Search, Sparkles } from "lucide-react";

type ChatOptions = {
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: Array<{ type: string }>;
};

type StreamPart = {
  text?: string;
  reasoning?: string;
};

type PuterApi = {
  chat: (...args: unknown[]) => Promise<unknown>;
  txt2img: (prompt: string, options?: { model?: string }) => Promise<HTMLElement>;
  txt2speech: (text: string, options?: { provider?: string; model?: string }) => Promise<HTMLAudioElement>;
};

type PuterWindow = Window & {
  puter?: {
    ai?: PuterApi;
  };
};

const textModels = ["gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-5.2", "gpt-5.2-chat"];
const imageModels = ["gpt-image-1.5", "gpt-image-1-mini", "gpt-image-1", "dall-e-3"];

function toText(result: unknown) {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "text" in result) {
    const maybe = (result as { text?: unknown }).text;
    if (typeof maybe === "string") return maybe;
  }
  if (result && typeof result === "object" && "choices" in result) {
    const choices = (result as { choices?: unknown }).choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0] as { message?: { content?: unknown } };
      const content = first?.message?.content;
      if (typeof content === "string") return content;
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
  }
  if (result && typeof result === "object" && "message" in result) {
    const message = (result as { message?: { content?: unknown } }).message;
    const content = message?.content;
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

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

    const maybeError = (err as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim()) return maybeError;

    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return "Request failed with a non-serializable error object.";
    }
  }
  return "Request failed.";
}

function isUnsupportedTemperatureError(err: unknown) {
  const message = getErrorMessage(err).toLowerCase();
  return message.includes("unsupported value: 'temperature'") || message.includes("only the default (1) value is supported");
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

export default function NewFeaturePage() {
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [chatPrompt, setChatPrompt] = useState("What are the benefits of exercise?");
  const [chatModel, setChatModel] = useState(textModels[0]);
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("180");
  const [chatOutput, setChatOutput] = useState("");

  const [imgPrompt, setImgPrompt] = useState("A futuristic cityscape at night");
  const [imgModel, setImgModel] = useState(imageModels[0]);
  const [imageStatus, setImageStatus] = useState("No image generated yet.");
  const imageMountRef = useRef<HTMLDivElement>(null);

  const [analysisPrompt, setAnalysisPrompt] = useState("What do you see in this image?");
  const [analysisUrl, setAnalysisUrl] = useState("https://assets.puter.site/doge.jpeg");
  const [analysisOutput, setAnalysisOutput] = useState("");

  const [streamPrompt, setStreamPrompt] = useState("Explain the theory of relativity in simple terms.");
  const [streamOutput, setStreamOutput] = useState("");

  const [ttsText, setTtsText] = useState("Hello world! This is OpenAI text-to-speech.");
  const [ttsStatus, setTtsStatus] = useState("No audio generated yet.");
  const audioMountRef = useRef<HTMLDivElement>(null);

  const helperText = useMemo(() => {
    if (sdkReady) return "Puter SDK loaded. You can run features now.";
    return "Loading Puter SDK...";
  }, [sdkReady]);

  const getPuter = () => {
    const api = (window as PuterWindow).puter?.ai;
    if (!api) {
      throw new Error("Puter SDK is not ready. Wait a moment and try again.");
    }
    return api;
  };

  const withAction = async (name: string, run: () => Promise<void>) => {
    setError("");
    setBusy(name);
    try {
      await run();
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`[new-feature:${name}]`, err);
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  const runChat = () =>
    withAction("chat", async () => {
      const temp = Number(temperature);
      const tokens = Number(maxTokens);
      if (!Number.isFinite(temp) || temp < 0 || temp > 2) {
        throw new Error("Temperature must be a number between 0 and 2.");
      }
      if (!Number.isFinite(tokens) || tokens < 1) {
        throw new Error("Max tokens must be a positive number.");
      }

      const api = getPuter();
      const baseOptions: ChatOptions = {
        model: chatModel,
        max_tokens: Math.floor(tokens)
      };

      let result: unknown;
      try {
        result = await api.chat(chatPrompt, {
          ...baseOptions,
          temperature: temp
        });
      } catch (err) {
        if (!isUnsupportedTemperatureError(err)) {
          throw err;
        }
        result = await api.chat(chatPrompt, baseOptions);
      }

      if (isEmptyLengthResult(result)) {
        result = await api.chat(chatPrompt, { model: chatModel });
      }

      setChatOutput(toText(result));
    });

  const runImage = () =>
    withAction("image", async () => {
      const api = getPuter();
      const imageEl = await api.txt2img(imgPrompt, { model: imgModel });
      const mount = imageMountRef.current;
      if (!mount) return;
      mount.innerHTML = "";
      imageEl.classList.add("max-w-full", "rounded-2xl", "border", "border-slate-500/30");
      mount.appendChild(imageEl);
      setImageStatus("Image generated.");
    });

  const runAnalysis = () =>
    withAction("analyze", async () => {
      const api = getPuter();
      const result = await api.chat(analysisPrompt, analysisUrl, { model: "gpt-5-nano" });
      setAnalysisOutput(toText(result));
    });

  const runStream = () =>
    withAction("stream", async () => {
      const api = getPuter();
      setStreamOutput("");
      const stream = (await api.chat(streamPrompt, { model: "gpt-5-nano", stream: true })) as AsyncIterable<StreamPart>;
      for await (const part of stream) {
        setStreamOutput((prev) => `${prev}${part?.reasoning ?? ""}${part?.text ?? ""}`);
      }
    });

  const runTts = () =>
    withAction("tts", async () => {
      const api = getPuter();
      const audio = await api.txt2speech(ttsText, { provider: "openai" });
      audio.setAttribute("controls", "");
      audio.classList.add("w-full");
      const mount = audioMountRef.current;
      if (!mount) return;
      mount.innerHTML = "";
      mount.appendChild(audio);
      setTtsStatus("Audio generated.");
    });

  return (
    <>
      <Script src="https://js.puter.com/v2/" strategy="afterInteractive" onLoad={() => setSdkReady(true)} />

      <div className="px-shell space-y-6 pb-12">
        <section className="px-panel p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles className="h-4 w-4" />
            New Feature
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">Puter AI Playground</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This page is now a real feature. Users can run text generation, image generation, image analysis, streaming, and text-to-speech directly.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{helperText}</p>
          {error ? <p className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="px-panel space-y-4 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Bot className="h-4 w-4 text-cyan-300" />
              Text Generation
            </p>
            <textarea value={chatPrompt} onChange={(e) => setChatPrompt(e.target.value)} className="min-h-[110px] w-full rounded-2xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none" />
            <div className="grid gap-3 sm:grid-cols-3">
              <select value={chatModel} onChange={(e) => setChatModel(e.target.value)} className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
                {textModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="temperature" className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100" />
              <input value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} placeholder="max tokens" className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100" />
            </div>
            <button type="button" onClick={runChat} disabled={!sdkReady || busy !== null} className="px-button w-full disabled:opacity-70">
              {busy === "chat" ? "Generating..." : "Generate Text"}
            </button>
            <pre className="min-h-[140px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">{chatOutput || "Output will appear here."}</pre>
          </article>

          <article className="px-panel space-y-4 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ImageIcon className="h-4 w-4 text-cyan-300" />
              Image Generation
            </p>
            <input value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
            <select value={imgModel} onChange={(e) => setImgModel(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
              {imageModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button type="button" onClick={runImage} disabled={!sdkReady || busy !== null} className="px-button w-full disabled:opacity-70">
              {busy === "image" ? "Generating image..." : "Generate Image"}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">{imageStatus}</p>
            <div ref={imageMountRef} className="grid min-h-[180px] place-items-center rounded-2xl border border-slate-500/30 bg-slate-950/45 p-3 text-xs text-slate-400">
              Generated image will appear here.
            </div>
          </article>

          <article className="px-panel space-y-4 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Search className="h-4 w-4 text-cyan-300" />
              Image Analysis
            </p>
            <input value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
            <input value={analysisUrl} onChange={(e) => setAnalysisUrl(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
            <button type="button" onClick={runAnalysis} disabled={!sdkReady || busy !== null} className="px-button w-full disabled:opacity-70">
              {busy === "analyze" ? "Analyzing..." : "Analyze Image"}
            </button>
            <pre className="min-h-[140px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">{analysisOutput || "Analysis result will appear here."}</pre>
          </article>

          <article className="px-panel space-y-4 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Bot className="h-4 w-4 text-cyan-300" />
              Streaming + Text To Speech
            </p>
            <input value={streamPrompt} onChange={(e) => setStreamPrompt(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
            <button type="button" onClick={runStream} disabled={!sdkReady || busy !== null} className="px-button w-full disabled:opacity-70">
              {busy === "stream" ? "Streaming..." : "Start Stream"}
            </button>
            <pre className="min-h-[110px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">{streamOutput || "Streaming output will appear here."}</pre>

            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <AudioLines className="h-4 w-4 text-cyan-300" />
              Text To Speech
            </p>
            <input value={ttsText} onChange={(e) => setTtsText(e.target.value)} className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
            <button type="button" onClick={runTts} disabled={!sdkReady || busy !== null} className="px-button w-full disabled:opacity-70">
              {busy === "tts" ? "Generating audio..." : "Generate Audio"}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">{ttsStatus}</p>
            <div ref={audioMountRef} className="rounded-2xl border border-slate-500/30 bg-slate-950/45 p-3 text-xs text-slate-400">
              Audio player will appear here.
            </div>
          </article>
        </section>

        <div>
          <Link href="/" className="px-button-ghost inline-flex">Back to Home</Link>
        </div>
      </div>
    </>
  );
}
