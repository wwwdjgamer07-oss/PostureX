export type GemWallet = {
  blue: number;
  purple: number;
  gold: number;
};

export type ThemeId =
  | "neon-core"
  | "sunset-flux"
  | "cyber-blue"
  | "midnight-glass"
  | "px-dark-pro"
  | "holographic"
  | "retro-grid"
  | "aurora-pulse"
  | "minimal-light"
  | "obsidian-elite"
  | "obsidian_skull";

export type UiSkinId =
  | "glass-ui"
  | "neon-outline"
  | "rounded-pro"
  | "holo-panels"
  | "frosted-blur"
  | "minimal-flat"
  | "cyber-frame"
  | "px-elite";

export type AiStyleId =
  | "coach"
  | "friendly"
  | "professional"
  | "playful"
  | "motivator"
  | "sci-fi-ai"
  | "minimal"
  | "therapist-calm";

export type StoreCategory = "theme" | "uiSkin" | "aiStyle" | "avatar" | "frame" | "effect" | "particle";
export type CurrencyType = "coins" | "blue_gem" | "purple_gem" | "gold_gem";

export interface StoreItem {
  id: string;
  label: string;
  category: StoreCategory;
  cost: number;
  currency: CurrencyType;
  altCost?: number;
  altCurrency?: CurrencyType;
  rarity: "common" | "rare" | "epic";
  preview?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface PxThemeDefinition {
  id: ThemeId;
  label: string;
  background: string;
  surface: string;
  surfaceSoft: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  cardRadius: string;
  glow: string;
  particleHue: string;
  gridOpacity: number;
}

export interface CustomThemeDraft {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  glowIntensity: number;
  backgroundGradient: string;
  cardOpacity: number;
  borderRadius: number;
  neonLevel: number;
  fontStyle: string;
  gridPattern: string;
  particleEffect: string;
  createdAt: string;
}

export interface DashboardLayoutConfig {
  compact: boolean;
  headerStyle: "default" | "minimal" | "arcade";
  widgetOrder: string[];
  hiddenWidgets: string[];
  widgetSizes: Record<string, "sm" | "md" | "lg">;
}

export interface PersonalizationProfile {
  coins: number;
  gems: GemWallet;
  inventory: string[];
  equippedItems: {
    theme: string;
    uiSkin: string;
    aiStyle: string;
    avatar: string;
    frame: string;
  };
  themeId: string;
  uiSkin: string;
  aiStyle: string;
  avatar: string;
  frame: string;
  customThemes: CustomThemeDraft[];
  dashboardLayout: DashboardLayoutConfig;
}
