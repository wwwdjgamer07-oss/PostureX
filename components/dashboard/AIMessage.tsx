"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostureAIMessage as PostureAIMessageType } from "@/lib/postureAI";

interface AIMessageProps {
  message: PostureAIMessageType;
  modelLabel?: string | null;
}

export function AIMessage({ message, modelLabel }: AIMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("px-chat-message flex w-full animate-fade-slide", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "px-chat-bubble px-ai-message max-w-[88%] rounded-2xl border px-3 py-2 text-sm",
          isUser
            ? "px-chat-bubble-user border-slate-500/30 bg-slate-900/70 text-slate-100"
            : "px-chat-bubble-ai border-cyan-300/35 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.14)]"
        )}
      >
        <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          {isUser ? <User className="h-3 w-3 text-slate-400" /> : <Bot className="h-3 w-3 text-cyan-300" />}
          {isUser ? "You" : "AI Coach"}
        </p>
        <p className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && modelLabel ? (
          <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-cyan-200/70">
            {modelLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
