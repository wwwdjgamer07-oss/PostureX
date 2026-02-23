interface AIHealthSummaryProps {
  avgAlignment?: number;
  avgStability?: number;
  avgSymmetry?: number;
  postureScore?: number;
  improvement?: number;
  lastScore?: number;
  weeklyImprovement?: number;
}

function round(value: number) {
  return Math.round(value);
}

export function AIHealthSummary({
  avgAlignment,
  avgStability,
  avgSymmetry,
  postureScore,
  improvement,
  lastScore,
  weeklyImprovement
}: AIHealthSummaryProps) {
  const resolvedAlignment = avgAlignment ?? postureScore ?? lastScore ?? 0;
  const resolvedStability = avgStability ?? Math.max(0, Math.min(100, (postureScore ?? 0) - 5));
  const resolvedSymmetry = avgSymmetry ?? Math.max(0, Math.min(100, (postureScore ?? 0) - 3));
  const resolvedImprovement = improvement ?? weeklyImprovement ?? 0;

  const narrative =
    resolvedAlignment >= 75 && resolvedStability >= 70 && resolvedSymmetry >= 70
      ? "Posture trend is healthy. Continue your current workstation routine."
      : "Posture drift is visible in your history. Focus on shoulder stacking and regular breaks.";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Health Summary</h2>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
        <p>Average Alignment: {round(resolvedAlignment)}%</p>
        <p>Average Stability: {round(resolvedStability)}%</p>
        <p>Average Symmetry: {round(resolvedSymmetry)}%</p>
        <p>Weekly Improvement: {round(resolvedImprovement)}%</p>
      </div>
      <p className="mt-4 text-sm text-slate-800 dark:text-slate-200">{narrative}</p>
    </div>
  );
}

export default AIHealthSummary;
