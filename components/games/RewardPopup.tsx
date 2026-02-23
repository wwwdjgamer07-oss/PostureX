"use client";

import { Sparkles, Trophy } from "lucide-react";
import { XPBar } from "@/components/games/XPBar";
import { BadgeToast } from "@/components/games/BadgeToast";
import type { RewardComputationResult } from "@/lib/games/rewards";
import { resolveLevel } from "@/lib/games/xpSystem";

interface RewardPopupProps {
  alignmentPercent: number;
  reward: RewardComputationResult;
}

export function RewardPopup({ alignmentPercent, reward }: RewardPopupProps) {
  const levelState = resolveLevel(reward.progress.xp);

  return (
    <article className="px-panel p-5">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
        <Trophy className="h-4 w-4" />
        Victory
      </p>
      <p className="mt-2 text-sm text-slate-300">Alignment {alignmentPercent}%</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <p className="px-kpi text-sm text-slate-200">+{reward.coins} PX Coins</p>
        <p className="px-kpi text-sm text-slate-200">+{reward.xp} XP</p>
        <p className="px-kpi text-sm text-slate-200">Level {reward.level}</p>
        <p className="px-kpi text-sm text-slate-200">Avatar: {reward.avatarStage}</p>
      </div>

      <div className="mt-4">
        <XPBar current={levelState.currentLevelXp} total={levelState.nextLevelXp} label="Progress to next level" />
      </div>

      {reward.levelUp ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          <Sparkles className="h-4 w-4" />
          Level Up! New level: {reward.level}
        </p>
      ) : null}

      {reward.badgesUnlocked.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {reward.badgesUnlocked.map((badgeId) => (
            <BadgeToast key={badgeId} badgeId={badgeId} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
