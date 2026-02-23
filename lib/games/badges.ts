export type BadgeId =
  | "straight-spine-starter"
  | "shoulder-master"
  | "anti-slouch-hero"
  | "balance-pro"
  | "reflex-elite";

export interface RewardMetrics {
  alignmentPercent: number;
  stabilityTime: number;
  reactionSpeed: number;
  correctionAccuracy: number;
  postureScore: number;
  shoulderStability?: number;
  slouchCorrections?: number;
}

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  "straight-spine-starter": {
    id: "straight-spine-starter",
    title: "Straight Spine Starter",
    description: "Alignment reached at least 80%."
  },
  "shoulder-master": {
    id: "shoulder-master",
    title: "Shoulder Master",
    description: "Shoulder stability reached 90%."
  },
  "anti-slouch-hero": {
    id: "anti-slouch-hero",
    title: "Anti-Slouch Hero",
    description: "Completed at least 30 slouch corrections."
  },
  "balance-pro": {
    id: "balance-pro",
    title: "Balance Pro",
    description: "Held stable posture for 60 seconds."
  },
  "reflex-elite": {
    id: "reflex-elite",
    title: "Reflex Elite",
    description: "Maintained reaction speed of 0.7 seconds or faster."
  }
};

export function evaluateBadges(metrics: RewardMetrics, ownedBadges: BadgeId[]) {
  const unlocked: BadgeId[] = [];
  const owned = new Set<BadgeId>(ownedBadges);

  if (metrics.alignmentPercent >= 80 && !owned.has("straight-spine-starter")) {
    unlocked.push("straight-spine-starter");
  }

  if ((metrics.shoulderStability ?? metrics.correctionAccuracy) >= 90 && !owned.has("shoulder-master")) {
    unlocked.push("shoulder-master");
  }

  if ((metrics.slouchCorrections ?? 0) >= 30 && !owned.has("anti-slouch-hero")) {
    unlocked.push("anti-slouch-hero");
  }

  if (metrics.stabilityTime >= 60 && !owned.has("balance-pro")) {
    unlocked.push("balance-pro");
  }

  if (metrics.reactionSpeed <= 0.7 && !owned.has("reflex-elite")) {
    unlocked.push("reflex-elite");
  }

  return unlocked;
}
