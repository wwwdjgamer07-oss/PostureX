import { Award, Flame, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  icon: string;
}

interface AchievementBadgesProps {
  achievements: Achievement[];
}

const iconMap = {
  award: Award,
  flame: Flame,
  shield: ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy
};

export function AchievementBadges({ achievements }: AchievementBadgesProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Achievements</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {achievements.length === 0 ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">No achievements yet.</p>
        ) : (
          achievements.map((achievement) => {
            const iconKey = achievement.icon.toLowerCase() as keyof typeof iconMap;
            const Icon = iconMap[iconKey] ?? Award;
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
              >
                <Icon className="h-4 w-4 text-sky-300" />
                {achievement.title}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AchievementBadges;
