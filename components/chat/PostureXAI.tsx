"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SkullBrainIcon } from "@/components/icons/SkullIcons";
import { GlobalChatbot } from "@/components/chat/GlobalChatbot";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";

export function PostureXAI() {
  const isObsidianSkull = useIsObsidianSkullTheme();
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      {!aiOpen ? (
        <div className="floating-ai fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40 group">
          <button
            type="button"
            className="relative grid h-14 w-14 place-items-center rounded-full border border-cyan-300/50 bg-slate-900/75 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.28)] backdrop-blur-xl transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(34,211,238,0.34)] focus:outline-none focus:ring-2 focus:ring-cyan-300/55"
            onClick={() => setAiOpen(true)}
            aria-label="Open PostureX AI"
          >
            <span className="absolute inset-0 rounded-full border border-cyan-300/35 animate-pulse" />
            <span className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-500/10" />
            {isObsidianSkull ? <SkullBrainIcon className="relative h-5 w-5" /> : <Sparkles className="relative h-5 w-5" />}
          </button>
          <span className="pointer-events-none absolute -top-10 right-0 rounded-lg border border-slate-500/35 bg-slate-900/85 px-2 py-1 text-xs text-cyan-100 opacity-0 backdrop-blur transition group-hover:opacity-100">
            PostureX AI
          </span>
        </div>
      ) : null}

      <GlobalChatbot
        open={aiOpen}
        onOpenChange={setAiOpen}
        showTrigger={false}
      />
    </>
  );
}
