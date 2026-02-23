"use client";

import { Check } from "lucide-react";
import { PlanTier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  tier: PlanTier;
  monthly: number;
  yearly: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  onSelect: (billingCycle: "monthly" | "yearly") => void;
}

export function PricingCard({
  tier,
  monthly,
  yearly,
  description,
  features,
  highlighted = false,
  onSelect
}: Props) {
  return (
    <div
      className={cn(
        "glass-card flex h-full flex-col p-6",
        highlighted ? "border-blue-300/45 shadow-glow" : "border-blue-300/20"
      )}
    >
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-200">{tier}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{formatCurrency(monthly)}</h3>
        <p className="text-xs text-slate-400">/month or {formatCurrency(yearly)} yearly</p>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </div>

      <ul className="mb-6 space-y-2 text-sm text-slate-200">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSelect("monthly")} className="btn-primary py-2 text-xs">
          Monthly
        </button>
        <button type="button" onClick={() => onSelect("yearly")} className="btn-secondary py-2 text-xs">
          Yearly
        </button>
      </div>
    </div>
  );
}
