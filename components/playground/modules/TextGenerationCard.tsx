"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import type { TextGenerateInput } from "@/components/playground/types";

interface Props {
  disabled: boolean;
  isBusy?: boolean;
  output: string;
  onGenerate: (input: TextGenerateInput) => Promise<void>;
}

const models = ["gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-5.2", "gpt-5.2-chat"];

export default function TextGenerationCard({ disabled, isBusy = false, output, onGenerate }: Props) {
  const [prompt, setPrompt] = useState("What are the benefits of exercise?");
  const [model, setModel] = useState(models[0]);
  const [temperature, setTemperature] = useState("1");
  const [maxTokens, setMaxTokens] = useState("220");

  return (
    <article className="px-panel p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Bot className="h-4 w-4 text-cyan-300" />
        Text Generation
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Posture education, ergonomics tips, and coaching content.</p>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <select value={model} onChange={(event) => setModel(event.target.value)} className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
          {models.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={temperature}
          onChange={(event) => setTemperature(event.target.value)}
          placeholder="temperature"
          className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100"
        />
        <input
          value={maxTokens}
          onChange={(event) => setMaxTokens(event.target.value)}
          placeholder="max tokens"
          className="rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100"
        />
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-pressed={isBusy}
        onClick={() =>
          void onGenerate({
            prompt,
            model,
            temperature: Number(temperature),
            maxTokens: Number(maxTokens)
          })
        }
        className="px-button mt-3 w-full disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isBusy ? "Generating..." : "Generate Text"}
      </button>

      <pre className="mt-3 min-h-[140px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">
        {output || "Generated content appears here."}
      </pre>
    </article>
  );
}
