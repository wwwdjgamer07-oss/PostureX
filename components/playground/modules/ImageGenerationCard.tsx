"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import type { ImageGenerateInput } from "@/components/playground/types";

interface Props {
  disabled: boolean;
  imageUrl: string;
  onGenerate: (input: ImageGenerateInput) => Promise<void>;
}

const models = ["gpt-image-1.5", "gpt-image-1-mini", "gpt-image-1", "dall-e-3"];

export default function ImageGenerationCard({ disabled, imageUrl, onGenerate }: Props) {
  const [prompt, setPrompt] = useState("Create a posture correction exercise illustration in clean educational style.");
  const [model, setModel] = useState(models[0]);

  return (
    <article className="px-panel p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <ImageIcon className="h-4 w-4 text-cyan-300" />
        Image Generation
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create posture diagrams, setup visuals, and ergonomic graphics.</p>

      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100"
      />
      <select value={model} onChange={(event) => setModel(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
        {models.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button type="button" disabled={disabled} onClick={() => void onGenerate({ prompt, model })} className="px-button mt-3 w-full disabled:opacity-70">
        Generate Image
      </button>

      <div className="mt-3 grid min-h-[180px] place-items-center rounded-2xl border border-slate-500/30 bg-slate-950/45 p-3 text-xs text-slate-400">
        {imageUrl ? <img src={imageUrl} alt="Generated posture visual" className="max-h-[340px] w-auto rounded-2xl border border-slate-500/30" /> : "Generated image will appear here."}
      </div>
    </article>
  );
}
