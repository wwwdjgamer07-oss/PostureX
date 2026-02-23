export const PRIMARY_ADMIN_EMAIL = "deepthan07@gmail.com";
export const PRIMARY_ADMIN_EMAIL_ALIASES = [PRIMARY_ADMIN_EMAIL, "deepthan07@gmail"] as const;

export function isPrimaryAdminEmail(email: string | null | undefined) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (PRIMARY_ADMIN_EMAIL_ALIASES.some((item) => normalized === item.toLowerCase())) {
    return true;
  }

  // Tolerant fallback for auth providers/format variants.
  const localPart = normalized.split("@")[0] ?? "";
  return localPart === "deepthan07";
}
