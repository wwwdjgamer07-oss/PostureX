import type { ReportPeriod, ReportRange } from "@/lib/reports/types";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

export function resolveReportRange(period: ReportPeriod, now = new Date()): ReportRange {
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === "daily") {
    const target = shiftDays(todayUtc, -1);
    const key = toDateKey(target);
    return { start: key, end: key };
  }

  const end = shiftDays(todayUtc, -1);
  const start = shiftDays(end, -6);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export function resolvePreviousRange(range: ReportRange): ReportRange {
  const start = new Date(`${range.start}T00:00:00.000Z`);
  const end = new Date(`${range.end}T00:00:00.000Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const previousEnd = shiftDays(start, -1);
  const previousStart = shiftDays(previousEnd, -(days - 1));

  return {
    start: toDateKey(previousStart),
    end: toDateKey(previousEnd)
  };
}
