export function normalizeRisk(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;

  const map: Record<string, number> = {
    LOW: 0.2,
    MEDIUM: 0.5,
    HIGH: 0.9
  };

  return map[value ?? ""] ?? 0;
}
