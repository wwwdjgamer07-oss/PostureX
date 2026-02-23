export type AvatarStage = "Slouched" | "Neutral" | "Athletic" | "Elite";
export type CoachPersonality = "Friendly Guide" | "Zen Coach" | "Athletic Trainer" | "Military Coach" | "Biohacker";

export interface XPProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
  avatarStage: AvatarStage;
  unlockedThemes: string[];
  unlockedCoachPersonalities: CoachPersonality[];
}

function xpForLevel(level: number) {
  return level * 120;
}

export function resolveLevel(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));

  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: xpForLevel(level)
  };
}

export function resolveAvatarStage(level: number): AvatarStage {
  if (level >= 20) return "Elite";
  if (level >= 10) return "Athletic";
  if (level >= 5) return "Neutral";
  return "Slouched";
}

export function resolveUnlockedThemes(level: number) {
  const unlocked: string[] = ["Cyan Core"];
  if (level >= 3) unlocked.push("Neon Flux");
  if (level >= 7) unlocked.push("Aurora Frame");
  if (level >= 12) unlocked.push("Skeleton Prism");
  if (level >= 18) unlocked.push("Elite Pulse");
  return unlocked;
}

export function resolveCoachPersonalities(level: number): CoachPersonality[] {
  const unlocked: CoachPersonality[] = ["Friendly Guide"];
  if (level >= 4) unlocked.push("Zen Coach");
  if (level >= 8) unlocked.push("Athletic Trainer");
  if (level >= 13) unlocked.push("Military Coach");
  if (level >= 17) unlocked.push("Biohacker");
  return unlocked;
}

export function buildXPProgress(totalXp: number): XPProgress {
  const levelState = resolveLevel(totalXp);
  const progressPct = Math.round((levelState.currentLevelXp / levelState.nextLevelXp) * 100);
  const avatarStage = resolveAvatarStage(levelState.level);

  return {
    level: levelState.level,
    currentLevelXp: levelState.currentLevelXp,
    nextLevelXp: levelState.nextLevelXp,
    progressPct,
    avatarStage,
    unlockedThemes: resolveUnlockedThemes(levelState.level),
    unlockedCoachPersonalities: resolveCoachPersonalities(levelState.level)
  };
}
