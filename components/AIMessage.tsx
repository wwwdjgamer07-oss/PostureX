import { AiCoachMessage } from "@/lib/types";

export function AIMessage({ message }: { message: AiCoachMessage }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">AI Coach</p>
      <h3 className="mt-2 text-base font-semibold text-white">{message.title}</h3>
      <p className="mt-2 text-sm text-slate-300">{message.body}</p>
      <div className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
        Action: {message.action}
      </div>
    </div>
  );
}
