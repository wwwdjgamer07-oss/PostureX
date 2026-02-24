"use client";

import { useEffect } from "react";

interface ThemeRow {
  mode: "dark" | "light";
  colors?: Record<string, string> | null;
  background_image?: string | null;
  card_image?: string | null;
  header_image?: string | null;
  accent_image?: string | null;
}

function applyTheme(theme: ThemeRow | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!theme) return;
  root.dataset.theme = theme.mode;
  const colors = theme.colors ?? {};
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--px-theme-${key}`, value);
  }
  root.style.setProperty("--px-theme-background-image", theme.background_image ? `url(${theme.background_image})` : "none");
  root.style.setProperty("--px-theme-card-image", theme.card_image ? `url(${theme.card_image})` : "none");
  root.style.setProperty("--px-theme-header-image", theme.header_image ? `url(${theme.header_image})` : "none");
  root.style.setProperty("--px-theme-accent-image", theme.accent_image ? `url(${theme.accent_image})` : "none");
}

export function ThemeLoader() {
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch("/api/themes", { cache: "no-store", credentials: "include" });
      if (!response.ok) return;
      const payload = (await response.json()) as { themes?: Array<ThemeRow & { is_active?: boolean }> };
      if (!active) return;
      const activeTheme = (payload.themes ?? []).find((theme) => theme.is_active);
      applyTheme(activeTheme ?? null);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
