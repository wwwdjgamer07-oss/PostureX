interface DailyStreakRow {
  date: string;
  sessions_count: number;
}

function toUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseDay(date: string) {
  return toUtcDay(new Date(`${date}T00:00:00.000Z`));
}

function dayDiff(from: Date, to: Date) {
  const ms = toUtcDay(from).getTime() - toUtcDay(to).getTime();
  return Math.floor(ms / 86400000);
}

export function calculateCurrentStreak(rows: DailyStreakRow[]) {
  const active = rows
    .filter((row) => row.sessions_count > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (active.length === 0) return 0;

  const today = toUtcDay(new Date());
  const latest = parseDay(active[0].date);
  const latestGap = dayDiff(today, latest);
  if (latestGap > 1) return 0;

  let streak = 1;
  for (let i = 1; i < active.length; i += 1) {
    const prev = parseDay(active[i - 1].date);
    const current = parseDay(active[i].date);
    if (dayDiff(prev, current) === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
