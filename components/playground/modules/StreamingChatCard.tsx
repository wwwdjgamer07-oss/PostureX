"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import type { StreamInput } from "@/components/playground/types";

interface Props {
  disabled: boolean;
  output: string;
  onStream: (input: StreamInput) => Promise<void>;
}

const models = ["gpt-5-nano", "gpt-5-mini", "gpt-5"];

export default function StreamingChatCard({ disabled, output, onStream }: Props) {
  const [prompt, setPrompt] = useState("Give me a practical 5-step desk posture reset for long coding sessions.");
  const [model, setModel] = useState(models[0]);

  return (
    <article className="px-panel p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <MessageSquareText className="h-4 w-4 text-cyan-300" />
        Streaming AI Chat
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Live posture Q&A and ergonomics discussions.</p>

      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none" />
      <select value={model} onChange={(event) => setModel(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-500/35 bg-slate-950/50 p-2 text-sm text-slate-100">
        {models.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button type="button" disabled={disabled} onClick={() => void onStream({ prompt, model })} className="px-button mt-3 w-full disabled:opacity-70">
        Start Stream
      </button>

      <pre className="mt-3 min-h-[140px] whitespace-pre-wrap rounded-2xl border border-slate-500/30 bg-slate-950/45 p-4 text-xs text-slate-100">
        {output || "Streaming output will appear here."}
      </pre>
    </article>
  );
}
