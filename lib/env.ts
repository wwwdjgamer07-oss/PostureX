const DEFAULT_APP_NAME = "PostureX";

function normalizeUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

function resolveVercelUrl() {
  const vercelUrl = String(process.env.VERCEL_URL ?? "").trim();
  if (!vercelUrl) return "";
  if (vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")) {
    return normalizeUrl(vercelUrl);
  }
  return `https://${normalizeUrl(vercelUrl)}`;
}

export function getAppUrl() {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (appUrl) return normalizeUrl(appUrl);

  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (siteUrl) return normalizeUrl(siteUrl);

  const vercelUrl = resolveVercelUrl();
  if (vercelUrl) return vercelUrl;

  return "http://localhost:3000";
}

export function getAppName() {
  const appName = String(process.env.NEXT_PUBLIC_APP_NAME ?? "").trim();
  if (appName) return appName;

  const siteName = String(process.env.NEXT_PUBLIC_SITE_NAME ?? "").trim();
  if (siteName) return siteName;

  return DEFAULT_APP_NAME;
}

export function getCronSecret() {
  return String(process.env.CRON_SECRET ?? "").trim();
}

export function getResendFromEmail() {
  return (
    String(process.env.RESEND_FROM_EMAIL ?? "").trim() ||
    String(process.env.EMAIL_FROM ?? "").trim() ||
    `${getAppName()} <no-reply@posturex.in>`
  );
}
