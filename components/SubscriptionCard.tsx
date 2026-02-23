import { Crown } from "lucide-react";

interface SubscriptionCardProps {
  planTier?: string;
  plan?: string;
}

export function SubscriptionCard({ planTier, plan }: SubscriptionCardProps) {
  const resolvedPlan = planTier ?? plan ?? "FREE";
  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
        <Crown className="h-4 w-4" />
        <h2 className="text-lg font-semibold">Subscription</h2>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
        Current Plan: <span className="font-semibold">{resolvedPlan}</span>
      </p>
      <button
        type="button"
        className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
      >
        Manage Plan
      </button>
    </div>
  );
}

export default SubscriptionCard;
