import { BADGE_DEFINITIONS, evaluateBadges, type BadgeId, type RewardMetrics } from "@/lib/games/badges";
import { buildXPProgress, type AvatarStage, type CoachPersonality } from "@/lib/games/xpSystem";

export interface RewardProgressState {
  coins: number;
  xp: number;
  badges: BadgeId[];
  level: number;
  avatarStage: AvatarStage;
  unlockedThemes: string[];
  unlockedCoachPersonalities: CoachPersonality[];
}

export interface RewardComputationResult {
  coins: number;
  xp: number;
  badgesUnlocked: BadgeId[];
  levelUp: boolean;
  level: number;
  avatarStage: AvatarStage;
  unlockedThemes: string[];
  unlockedCoachPersonalities: CoachPersonality[];
  progress: RewardProgressState;
}

export const REWARDS_STORAGE_KEY = "px_posture_rewards_v1";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createDefaultRewardProgress(): RewardProgressState {
  const xpProgress = buildXPProgress(0);
  return {
    coins: 0,
    xp: 0,
    badges: [],
    level: xpProgress.level,
    avatarStage: xpProgress.avatarStage,
    unlockedThemes: xpProgress.unlockedThemes,
    unlockedCoachPersonalities: xpProgress.unlockedCoachPersonalities
  };
}

export function normalizeRewardProgress(value: unknown): RewardProgressState {
  const fallback = createDefaultRewardProgress();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<RewardProgressState>;
  const xp = Number(raw.xp ?? 0);
  const xpProgress = buildXPProgress(xp);

  return {
    coins: Math.max(0, Math.floor(Number(raw.coins ?? 0))),
    xp: Math.max(0, Math.floor(xp)),
    badges: Array.isArray(raw.badges) ? (raw.badges.filter((item): item is BadgeId => typeof item === "string" && item in BADGE_DEFINITIONS) as BadgeId[]) : [],
    level: xpProgress.level,
    avatarStage: xpProgress.avatarStage,
    unlockedThemes: xpProgress.unlockedThemes,
    unlockedCoachPersonalities: xpProgress.unlockedCoachPersonalities
  };
}

export function readRewardProgress(): RewardProgressState {
  if (typeof window === "undefined") return createDefaultRewardProgress();

  try {
    const stored = window.localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!stored) return createDefaultRewardProgress();
    return normalizeRewardProgress(JSON.parse(stored));
  } catch {
    return createDefaultRewardProgress();
  }
}

export function saveRewardProgress(progress: RewardProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(progress));
}

export function calculateRewards(metrics: RewardMetrics, currentProgress: RewardProgressState): RewardComputationResult {
  const alignment = clamp(metrics.alignmentPercent, 0, 100);
  const stability = Math.max(0, metrics.stabilityTime);

  const coins = Math.max(0, Math.round(alignment * 0.4 + stability * 0.6));
  const xp = Math.max(0, Math.round(alignment * 0.8 + stability * 1.2));

  const badgesUnlocked = evaluateBadges(metrics, currentProgress.badges);

  const totalXp = currentProgress.xp + xp;
  const xpProgress = buildXPProgress(totalXp);
  const levelUp = xpProgress.level > currentProgress.level;

  const next: RewardProgressState = {
    coins: currentProgress.coins + coins,
    xp: totalXp,
    badges: [...new Set([...currentProgress.badges, ...badgesUnlocked])],
    level: xpProgress.level,
    avatarStage: xpProgress.avatarStage,
    unlockedThemes: xpProgress.unlockedThemes,
    unlockedCoachPersonalities: xpProgress.unlockedCoachPersonalities
  };

  return {
    coins,
    xp,
    badgesUnlocked,
    levelUp,
    level: xpProgress.level,
    avatarStage: xpProgress.avatarStage,
    unlockedThemes: xpProgress.unlockedThemes,
    unlockedCoachPersonalities: xpProgress.unlockedCoachPersonalities,
    progress: next
  };
}
