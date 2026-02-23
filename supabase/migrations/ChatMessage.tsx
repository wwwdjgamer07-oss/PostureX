import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAi = role === "ai";

  return (
    <div className={`flex w-full gap-3 ${isAi ? "justify-start" : "justify-end"}`}>
      {isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm backdrop-blur-md ${
          isAi
            ? "rounded-tl-none border border-slate-200/10 bg-slate-900/60 text-slate-100 dark:border-slate-700/50 dark:bg-slate-800/60"
            : "rounded-tr-none bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(6,182,212,0.25)]"
        }`}
      >
        <p className="leading-relaxed">{content}</p>
        {timestamp && (
          <p className={`mt-1 text-[10px] opacity-70 ${isAi ? "text-slate-400" : "text-cyan-100"}`}>
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      {!isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}