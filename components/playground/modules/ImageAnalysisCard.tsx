"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ImageAnalyzeInput } from "@/components/playground/types";

interface Props {
  disabled: boolean;
  output: string;
  onAnalyze: (input: ImageAnalyzeInput) => Promise<void>;
}

const models = ["gpt-5-nano", "gpt-5-mini", "gpt-4.1-mini"];

export default function ImageAnalysisCard({ disabled, output, onAnalyze }: Props) {
  const [prompt, setPrompt] = useState("Analyze this posture image and identify ergonomic risks with practical fixes.");
  const [imageUrl, setImageUrl] = useState("https://assets.puter.site/doge.jpeg");
  const [model, setModel] = useState(models[0]);

  return (
    <article className="px-panel p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Search className="h-4 w-4 text-cyan-300" />
        Image Analysis
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review posture photos and desk setup risks without touching tracking data.</p>

      <input value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
      <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100" />
      <select value={model} onChange={(event) => setModel(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
        {models.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button type="button" disabled={disabled} onClick={() => void onAnalyze({ prompt, imageUrl, model })} className="px-button mt-3 w-full disabled:opacity-70">
        Analyze Image
      </button>

      <pre className="mt-3 min-h-[140px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">
        {output || "Analysis output will appear here."}
      </pre>
    </article>
  );
}
