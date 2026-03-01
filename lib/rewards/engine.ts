"use client";

export const LEVEL_UP_EVENT = "level_up";

const TOTAL_XP_KEY = "px_rewards_total_xp";
const LEVEL_KEY = "px_rewards_level";
const COINS_KEY = "px_rewards_coins";
const GEMS_KEY = "px_rewards_gems";

export interface RewardSnapshot {
  totalXP: number;
  level: number;
  coins: number;
  gems: number;
}

export interface LevelUpPayload {
  level: number;
  xpGained: number;
  coinsEarned: number;
  gemsEarned: number;
  totalXP: number;
  source?: "posture_session" | "sensor_streak" | "daily_login" | "game_completion";
}

function isBrowser() {
  return typeof window !== "undefined";
}

function parseStoredInt(value: string | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

export function levelFromXP(totalXP: number) {
  return Math.floor(Math.sqrt(Math.max(0, totalXP) / 100)) + 1;
}

function rewardsForLevel(level: number) {
  return {
    coins: level * 10,
    gems: Math.max(1, Math.floor(level / 3))
  };
}

export function getRewardSnapshot(): RewardSnapshot {
  if (!isBrowser()) {
    return {
      totalXP: 0,
      level: 1,
      coins: 0,
      gems: 0
    };
  }

  const totalXP = parseStoredInt(window.localStorage.getItem(TOTAL_XP_KEY), 0);
  const fallbackLevel = levelFromXP(totalXP);
  const level = parseStoredInt(window.localStorage.getItem(LEVEL_KEY), fallbackLevel);
  const coins = parseStoredInt(window.localStorage.getItem(COINS_KEY), 0);
  const gems = parseStoredInt(window.localStorage.getItem(GEMS_KEY), 0);

  return {
    totalXP,
    level: Math.max(1, level),
    coins,
    gems
  };
}

export function addXP(
  amount: number,
  source?: "posture_session" | "sensor_streak" | "daily_login" | "game_completion"
): RewardSnapshot {
  if (!isBrowser()) {
    return getRewardSnapshot();
  }

  const xpToAdd = Math.max(0, Math.floor(Number(amount) || 0));
  if (xpToAdd <= 0) return getRewardSnapshot();

  const current = getRewardSnapshot();
  const nextTotalXP = current.totalXP + xpToAdd;
  const prevLevel = levelFromXP(current.totalXP);
  const nextLevel = levelFromXP(nextTotalXP);

  let levelCoins = 0;
  let levelGems = 0;
  for (let level = prevLevel + 1; level <= nextLevel; level += 1) {
    const reward = rewardsForLevel(level);
    levelCoins += reward.coins;
    levelGems += reward.gems;
  }

  const nextCoins = current.coins + levelCoins;
  const nextGems = current.gems + levelGems;

  window.localStorage.setItem(TOTAL_XP_KEY, String(nextTotalXP));
  window.localStorage.setItem(LEVEL_KEY, String(nextLevel));
  window.localStorage.setItem(COINS_KEY, String(nextCoins));
  window.localStorage.setItem(GEMS_KEY, String(nextGems));

  if (nextLevel > prevLevel) {
    const payload: LevelUpPayload = {
      level: nextLevel,
      xpGained: xpToAdd,
      coinsEarned: levelCoins,
      gemsEarned: levelGems,
      totalXP: nextTotalXP,
      source
    };
    window.dispatchEvent(new CustomEvent<LevelUpPayload>(LEVEL_UP_EVENT, { detail: payload }));
  }

  return {
    totalXP: nextTotalXP,
    level: nextLevel,
    coins: nextCoins,
    gems: nextGems
  };
}

