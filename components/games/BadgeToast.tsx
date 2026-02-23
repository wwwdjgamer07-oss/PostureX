"use client";

import { Award } from "lucide-react";
import { BADGE_DEFINITIONS, type BadgeId } from "@/lib/games/badges";

interface BadgeToastProps {
  badgeId: BadgeId;
}

export function BadgeToast({ badgeId }: BadgeToastProps) {
  const badge = BADGE_DEFINITIONS[badgeId];

  return (
    <div className="rounded-xl border border-cyan-300/35 bg-cyan-400/10 p-3 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
        <Award className="h-4 w-4" />
        Badge Unlocked
      </p>
      <p className="mt-1 text-sm font-semibold">{badge.title}</p>
      <p className="mt-1 text-xs text-cyan-200/90">{badge.description}</p>
    </div>
  );
}
