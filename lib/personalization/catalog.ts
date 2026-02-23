import type { PxThemeDefinition, StoreItem, DashboardLayoutConfig, ThemeId, UiSkinId, AiStyleId } from "@/lib/personalization/types";

export const DEFAULT_THEME_ID: ThemeId = "neon-core";
export const DEFAULT_UI_SKIN: UiSkinId = "glass-ui";
export const DEFAULT_AI_STYLE: AiStyleId = "coach";

export const OBSIDIAN_SKULL_THEME_OBJECT = {
  id: "obsidian_skull",
  name: "Obsidian Skull",
  rarity: "epic",
  colors: {
    primary: "#7A00FF",
    accent: "#B026FF",
    background: "#0A0A0F",
    panel: "#11111A",
    border: "#2A0A3A",
    glow: "#C77DFF"
  },
  gradients: {
    bg: "linear-gradient(135deg, #0A0A0F 0%, #240046 40%, #0A0A0F 100%)",
    card: "linear-gradient(145deg, #11111A, #1A0B2E)",
    button: "linear-gradient(135deg, #7A00FF, #B026FF)"
  },
  effects: {
    glow: true,
    particles: "purple_embers",
    watermark: "skull"
  }
} as const;

export const PX_THEMES: Record<ThemeId, PxThemeDefinition> = {
  "neon-core": {
    id: "neon-core",
    label: "Neon Core",
    background: "radial-gradient(90rem 50rem at 15% -8%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(160deg,#0b0f14 0%,#0f172a 45%,#0b0f14 100%)",
    surface: "rgba(15,23,42,0.62)",
    surfaceSoft: "rgba(15,23,42,0.48)",
    border: "rgba(148,163,184,0.2)",
    text: "#f8fafc",
    muted: "#94a3b8",
    accent: "#22d3ee",
    accentStrong: "#3b82f6",
    cardRadius: "1.5rem",
    glow: "0 0 40px rgba(34,211,238,0.16)",
    particleHue: "190deg",
    gridOpacity: 0.08
  },
  "sunset-flux": {
    id: "sunset-flux",
    label: "Sunset Flux",
    background: "radial-gradient(80rem 44rem at 85% -10%, rgba(251,146,60,0.24), transparent 62%), linear-gradient(155deg,#1f1020 0%,#311529 45%,#1f1020 100%)",
    surface: "rgba(39,18,37,0.6)",
    surfaceSoft: "rgba(52,22,39,0.48)",
    border: "rgba(253,186,116,0.24)",
    text: "#fff7ed",
    muted: "#fdba74",
    accent: "#fb923c",
    accentStrong: "#f43f5e",
    cardRadius: "1.5rem",
    glow: "0 0 46px rgba(251,146,60,0.2)",
    particleHue: "24deg",
    gridOpacity: 0.1
  },
  "cyber-blue": {
    id: "cyber-blue",
    label: "Cyber Blue",
    background: "radial-gradient(90rem 50rem at 10% 0%, rgba(56,189,248,0.18), transparent 65%), linear-gradient(160deg,#020617 0%,#082f49 45%,#020617 100%)",
    surface: "rgba(2,44,71,0.56)",
    surfaceSoft: "rgba(8,47,73,0.44)",
    border: "rgba(125,211,252,0.25)",
    text: "#e0f2fe",
    muted: "#7dd3fc",
    accent: "#38bdf8",
    accentStrong: "#0ea5e9",
    cardRadius: "1.5rem",
    glow: "0 0 40px rgba(14,165,233,0.22)",
    particleHue: "198deg",
    gridOpacity: 0.09
  },
  "midnight-glass": {
    id: "midnight-glass",
    label: "Midnight Glass",
    background: "linear-gradient(160deg,#030712 0%,#111827 52%,#030712 100%)",
    surface: "rgba(17,24,39,0.64)",
    surfaceSoft: "rgba(15,23,42,0.5)",
    border: "rgba(156,163,175,0.2)",
    text: "#e5e7eb",
    muted: "#9ca3af",
    accent: "#67e8f9",
    accentStrong: "#60a5fa",
    cardRadius: "1.35rem",
    glow: "0 0 30px rgba(96,165,250,0.14)",
    particleHue: "205deg",
    gridOpacity: 0.06
  },
  "px-dark-pro": {
    id: "px-dark-pro",
    label: "PX Dark Pro",
    background: "linear-gradient(170deg,#05070d 0%,#0f172a 48%,#05070d 100%)",
    surface: "rgba(15,23,42,0.72)",
    surfaceSoft: "rgba(15,23,42,0.56)",
    border: "rgba(100,116,139,0.24)",
    text: "#f1f5f9",
    muted: "#94a3b8",
    accent: "#22d3ee",
    accentStrong: "#1d4ed8",
    cardRadius: "1.4rem",
    glow: "0 0 44px rgba(29,78,216,0.15)",
    particleHue: "212deg",
    gridOpacity: 0.07
  },
  holographic: {
    id: "holographic",
    label: "Holographic",
    background: "linear-gradient(130deg,#140a1f 0%,#1a3b57 34%,#0f5132 65%,#1f2937 100%)",
    surface: "rgba(17,24,39,0.56)",
    surfaceSoft: "rgba(30,41,59,0.42)",
    border: "rgba(125,211,252,0.3)",
    text: "#ecfeff",
    muted: "#a5f3fc",
    accent: "#67e8f9",
    accentStrong: "#c084fc",
    cardRadius: "1.6rem",
    glow: "0 0 56px rgba(168,85,247,0.22)",
    particleHue: "280deg",
    gridOpacity: 0.11
  },
  "retro-grid": {
    id: "retro-grid",
    label: "Retro Grid",
    background: "linear-gradient(180deg,#10011a 0%,#1f1148 50%,#12061f 100%)",
    surface: "rgba(31,17,72,0.58)",
    surfaceSoft: "rgba(46,16,101,0.43)",
    border: "rgba(244,114,182,0.35)",
    text: "#fdf2f8",
    muted: "#f9a8d4",
    accent: "#f472b6",
    accentStrong: "#22d3ee",
    cardRadius: "1rem",
    glow: "0 0 52px rgba(244,114,182,0.2)",
    particleHue: "320deg",
    gridOpacity: 0.15
  },
  "aurora-pulse": {
    id: "aurora-pulse",
    label: "Aurora Pulse",
    background: "radial-gradient(80rem 45rem at 15% 0%, rgba(16,185,129,0.2), transparent 62%), radial-gradient(70rem 40rem at 85% -10%, rgba(34,211,238,0.2), transparent 62%), linear-gradient(160deg,#022c22 0%,#0f172a 52%,#022c22 100%)",
    surface: "rgba(6,78,59,0.52)",
    surfaceSoft: "rgba(15,118,110,0.38)",
    border: "rgba(94,234,212,0.28)",
    text: "#ecfeff",
    muted: "#5eead4",
    accent: "#2dd4bf",
    accentStrong: "#22d3ee",
    cardRadius: "1.4rem",
    glow: "0 0 48px rgba(45,212,191,0.2)",
    particleHue: "165deg",
    gridOpacity: 0.1
  },
  "minimal-light": {
    id: "minimal-light",
    label: "Minimal Light",
    background: "linear-gradient(160deg,#eff6ff 0%,#e2e8f0 55%,#dbeafe 100%)",
    surface: "rgba(255,255,255,0.78)",
    surfaceSoft: "rgba(248,250,252,0.7)",
    border: "rgba(59,130,246,0.2)",
    text: "#0f172a",
    muted: "#475569",
    accent: "#0284c7",
    accentStrong: "#2563eb",
    cardRadius: "1.25rem",
    glow: "0 0 28px rgba(2,132,199,0.18)",
    particleHue: "200deg",
    gridOpacity: 0.06
  },
  "obsidian-elite": {
    id: "obsidian-elite",
    label: "Obsidian Elite",
    background: "linear-gradient(165deg,#020617 0%,#111827 38%,#000 100%)",
    surface: "rgba(2,6,23,0.82)",
    surfaceSoft: "rgba(15,23,42,0.62)",
    border: "rgba(250,204,21,0.24)",
    text: "#fefce8",
    muted: "#facc15",
    accent: "#facc15",
    accentStrong: "#22d3ee",
    cardRadius: "1.75rem",
    glow: "0 0 56px rgba(250,204,21,0.16)",
    particleHue: "52deg",
    gridOpacity: 0.12
  },
  obsidian_skull: {
    id: "obsidian_skull",
    label: "Obsidian Skull",
    background: "linear-gradient(135deg, #0A0A0F 0%, #240046 40%, #0A0A0F 100%)",
    surface: "#11111Acc",
    surfaceSoft: "#1A0B2Ecc",
    border: "#2A0A3A",
    text: "#f5ebff",
    muted: "#c8a8e8",
    accent: "#B026FF",
    accentStrong: "#7A00FF",
    cardRadius: "1.5rem",
    glow: "0 0 36px rgba(199,125,255,0.26)",
    particleHue: "278deg",
    gridOpacity: 0.03
  }
};

export const PX_STORE_ITEMS: StoreItem[] = [
  { id: "theme:neon-core", label: "Neon Core", category: "theme", cost: 0, currency: "coins", rarity: "common" },
  { id: "theme:sunset-flux", label: "Sunset Flux", category: "theme", cost: 260, currency: "coins", rarity: "common" },
  { id: "theme:cyber-blue", label: "Cyber Blue", category: "theme", cost: 240, currency: "coins", rarity: "common" },
  { id: "theme:midnight-glass", label: "Midnight Glass", category: "theme", cost: 280, currency: "coins", rarity: "common" },
  { id: "theme:px-dark-pro", label: "PX Dark Pro", category: "theme", cost: 340, currency: "coins", rarity: "rare" },
  { id: "theme:holographic", label: "Holographic", category: "theme", cost: 2, currency: "purple_gem", rarity: "rare" },
  { id: "theme:retro-grid", label: "Retro Grid", category: "theme", cost: 320, currency: "coins", rarity: "rare" },
  { id: "theme:aurora-pulse", label: "Aurora Pulse", category: "theme", cost: 380, currency: "coins", rarity: "rare" },
  { id: "theme:minimal-light", label: "Minimal Light", category: "theme", cost: 220, currency: "coins", rarity: "common" },
  { id: "theme:obsidian-elite", label: "Obsidian Elite", category: "theme", cost: 3, currency: "gold_gem", rarity: "epic" },
  {
    id: "theme:obsidian_skull",
    label: "Obsidian Skull",
    category: "theme",
    cost: 250,
    currency: "coins",
    altCost: 3,
    altCurrency: "purple_gem",
    rarity: "epic",
    preview: "obsidian-skull",
    meta: { style: "futuristic_gothic", particles: "purple_embers", watermark: "skull" }
  },

  { id: "ui:glass-ui", label: "Glass UI", category: "uiSkin", cost: 0, currency: "coins", rarity: "common" },
  { id: "ui:neon-outline", label: "Neon Outline", category: "uiSkin", cost: 150, currency: "coins", rarity: "common" },
  { id: "ui:rounded-pro", label: "Rounded Pro", category: "uiSkin", cost: 170, currency: "coins", rarity: "common" },
  { id: "ui:holo-panels", label: "Holo Panels", category: "uiSkin", cost: 1, currency: "blue_gem", rarity: "rare" },
  { id: "ui:frosted-blur", label: "Frosted Blur", category: "uiSkin", cost: 220, currency: "coins", rarity: "rare" },
  { id: "ui:minimal-flat", label: "Minimal Flat", category: "uiSkin", cost: 160, currency: "coins", rarity: "common" },
  { id: "ui:cyber-frame", label: "Cyber Frame", category: "uiSkin", cost: 1, currency: "purple_gem", rarity: "rare" },
  { id: "ui:px-elite", label: "PX Elite", category: "uiSkin", cost: 2, currency: "gold_gem", rarity: "epic" },

  { id: "ai:coach", label: "Coach", category: "aiStyle", cost: 0, currency: "coins", rarity: "common" },
  { id: "ai:friendly", label: "Friendly", category: "aiStyle", cost: 120, currency: "coins", rarity: "common" },
  { id: "ai:professional", label: "Professional", category: "aiStyle", cost: 140, currency: "coins", rarity: "common" },
  { id: "ai:playful", label: "Playful", category: "aiStyle", cost: 100, currency: "coins", rarity: "common" },
  { id: "ai:motivator", label: "Motivator", category: "aiStyle", cost: 220, currency: "coins", rarity: "rare" },
  { id: "ai:sci-fi-ai", label: "Sci-Fi AI", category: "aiStyle", cost: 1, currency: "blue_gem", rarity: "rare" },
  { id: "ai:minimal", label: "Minimal", category: "aiStyle", cost: 130, currency: "coins", rarity: "common" },
  { id: "ai:therapist-calm", label: "Therapist Calm", category: "aiStyle", cost: 1, currency: "purple_gem", rarity: "rare" },

  { id: "avatar:px-cadet", label: "PX Cadet", category: "avatar", cost: 0, currency: "coins", rarity: "common" },
  { id: "avatar:cyber-crown", label: "Cyber Crown", category: "avatar", cost: 260, currency: "coins", rarity: "rare" },
  { id: "frame:none", label: "No Frame", category: "frame", cost: 0, currency: "coins", rarity: "common" },
  { id: "frame:gold-frame", label: "Gold Frame", category: "frame", cost: 1, currency: "blue_gem", rarity: "rare" },
  { id: "frame:neon-ring", label: "Neon Ring", category: "frame", cost: 180, currency: "coins", rarity: "common" }
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutConfig = {
  compact: false,
  headerStyle: "default",
  widgetOrder: ["dailyScore", "sessions", "risk", "streak", "alerts", "scoreChart", "systemStatus", "weeklyTrend", "recentSessions"],
  hiddenWidgets: [],
  widgetSizes: {}
};

export function getStoreItemById(itemId: string) {
  return PX_STORE_ITEMS.find((item) => item.id === itemId) ?? null;
}
