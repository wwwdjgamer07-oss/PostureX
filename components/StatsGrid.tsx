type StatsItem = {
  label: string;
  value: string;
};

interface LegacyStats {
  postureScore?: number;
  sessions?: number;
  avgSessionTime?: number;
  weeklyImprovement?: number;
  streak?: number;
}

interface StatsGridProps {
  stats: StatsItem[] | LegacyStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const items: StatsItem[] = Array.isArray(stats)
    ? stats
    : [
        { label: "Posture Score", value: `${Math.round(stats.postureScore ?? 0)}%` },
        { label: "Sessions", value: String(stats.sessions ?? 0) },
        { label: "Avg Session (min)", value: String(stats.avgSessionTime ?? 0) },
        { label: "Streak", value: String(stats.streak ?? 0) }
      ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/20 bg-white/40 p-4 shadow-xl backdrop-blur dark:bg-slate-900/40"
        >
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;
