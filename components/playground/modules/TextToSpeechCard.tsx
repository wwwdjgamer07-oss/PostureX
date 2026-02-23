"use client";

import { useState } from "react";
import { AudioLines } from "lucide-react";
import type { TtsInput } from "@/components/playground/types";

interface Props {
  disabled: boolean;
  audioUrl: string;
  onGenerate: (input: TtsInput) => Promise<void>;
}

export default function TextToSpeechCard({ disabled, audioUrl, onGenerate }: Props) {
  const [text, setText] = useState("Sit tall, relax your shoulders, and keep your head stacked over your chest.");

  return (
    <article className="px-panel p-6">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <AudioLines className="h-4 w-4 text-cyan-300" />
        Text-to-Speech
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Generate spoken posture guidance for accessibility and coaching.</p>

      <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-500/35 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none" />

      <button type="button" disabled={disabled} onClick={() => void onGenerate({ text })} className="px-button mt-3 w-full disabled:opacity-70">
        Generate Audio
      </button>

      <div className="mt-3 rounded-2xl border border-slate-500/30 bg-slate-950/45 p-3">
        {audioUrl ? <audio src={audioUrl} controls className="w-full" /> : <p className="text-xs text-slate-400">Audio output will appear here.</p>}
      </div>
    </article>
  );
}
