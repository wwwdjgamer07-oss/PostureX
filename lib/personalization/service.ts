import { DEFAULT_AI_STYLE, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_THEME_ID, DEFAULT_UI_SKIN, PX_STORE_ITEMS, PX_THEMES, getStoreItemById } from "@/lib/personalization/catalog";
import type { CustomThemeDraft, DashboardLayoutConfig, GemWallet, PersonalizationProfile, StoreItem } from "@/lib/personalization/types";

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseGemWallet(value: unknown): GemWallet {
  const map = asRecord(value);
  return {
    blue: Math.max(0, Math.floor(toNumber(map.blue, 0))),
    purple: Math.max(0, Math.floor(toNumber(map.purple, 0))),
    gold: Math.max(0, Math.floor(toNumber(map.gold, 0)))
  };
}

function parseCustomThemes(value: unknown): CustomThemeDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => Boolean(entry.id && entry.name))
    .map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
      primaryColor: String(entry.primaryColor ?? "#22d3ee"),
      accentColor: String(entry.accentColor ?? "#3b82f6"),
      glowIntensity: Math.max(0, Math.min(100, toNumber(entry.glowIntensity, 35))),
      backgroundGradient: String(entry.backgroundGradient ?? "linear-gradient(160deg,#0b0f14 0%,#0f172a 45%,#0b0f14 100%)"),
      cardOpacity: Math.max(0.25, Math.min(1, toNumber(entry.cardOpacity, 0.62))),
      borderRadius: Math.max(8, Math.min(36, toNumber(entry.borderRadius, 24))),
      neonLevel: Math.max(0, Math.min(100, toNumber(entry.neonLevel, 60))),
      fontStyle: String(entry.fontStyle ?? "space-grotesk"),
      gridPattern: String(entry.gridPattern ?? "default"),
      particleEffect: String(entry.particleEffect ?? "soft"),
      createdAt: String(entry.createdAt ?? new Date().toISOString())
    }));
}

function parseDashboardLayout(value: unknown): DashboardLayoutConfig {
  const raw = asRecord(value);
  return {
    compact: Boolean(raw.compact ?? DEFAULT_DASHBOARD_LAYOUT.compact),
    headerStyle:
      raw.headerStyle === "minimal" || raw.headerStyle === "arcade"
        ? (raw.headerStyle as "minimal" | "arcade")
        : "default",
    widgetOrder: asStringArray(raw.widgetOrder).length > 0 ? asStringArray(raw.widgetOrder) : DEFAULT_DASHBOARD_LAYOUT.widgetOrder,
    hiddenWidgets: asStringArray(raw.hiddenWidgets),
    widgetSizes: asRecord(raw.widgetSizes) as Record<string, "sm" | "md" | "lg">
  };
}

function defaultInventory(): string[] {
  return ["theme:neon-core", "ui:glass-ui", "ai:coach", "avatar:px-cadet", "frame:none"];
}

function totalGems(gems: GemWallet) {
  return Math.max(0, gems.blue) + Math.max(0, gems.purple) + Math.max(0, gems.gold);
}

function spendFromGemPool(gems: GemWallet, amount: number): GemWallet {
  let remaining = Math.max(0, Math.floor(amount));
  const next = { ...gems };
  const pull = (key: keyof GemWallet) => {
    if (remaining <= 0) return;
    const take = Math.min(next[key], remaining);
    next[key] = Math.max(0, next[key] - take);
    remaining -= take;
  };
  // Prefer consuming purple first for premium-theme spending.
  pull("purple");
  pull("blue");
  pull("gold");
  return next;
}

export function normalizePersonalizationRow(row: Record<string, unknown> | null | undefined): PersonalizationProfile {
  const record = row ?? {};
  const gems = parseGemWallet(record.px_gems);
  const inventory = asStringArray(record.px_inventory);
  const safeInventory = inventory.length > 0 ? Array.from(new Set(inventory)) : defaultInventory();
  const equippedMap = asRecord(record.px_equipped_items);

  const themeId = String(record.px_theme_id ?? equippedMap.theme ?? DEFAULT_THEME_ID);
  const uiSkin = String(record.px_ui_skin ?? equippedMap.uiSkin ?? DEFAULT_UI_SKIN);
  const aiStyle = String(record.px_ai_style ?? equippedMap.aiStyle ?? DEFAULT_AI_STYLE);
  const avatar = String(record.px_avatar ?? equippedMap.avatar ?? "px-cadet");
  const frame = String(record.px_frame ?? equippedMap.frame ?? "none");

  return {
    coins: Math.max(0, Math.floor(toNumber(record.px_coins, 0))),
    gems,
    inventory: safeInventory,
    equippedItems: {
      theme: themeId,
      uiSkin,
      aiStyle,
      avatar,
      frame
    },
    themeId,
    uiSkin,
    aiStyle,
    avatar,
    frame,
    customThemes: parseCustomThemes(record.px_custom_themes),
    dashboardLayout: parseDashboardLayout(record.px_dashboard_layout)
  };
}

export function canAfford(item: StoreItem, profile: PersonalizationProfile) {
  if (item.id === "theme:obsidian_skull") {
    if (profile.coins >= item.cost) return true;
    return totalGems(profile.gems) >= 3;
  }
  const affordPrimary =
    item.currency === "coins"
      ? profile.coins >= item.cost
      : item.currency === "blue_gem"
        ? profile.gems.blue >= item.cost
        : item.currency === "purple_gem"
          ? profile.gems.purple >= item.cost
          : profile.gems.gold >= item.cost;
  if (affordPrimary) return true;
  if (!item.altCurrency || typeof item.altCost !== "number") return false;
  if (item.altCurrency === "coins") return profile.coins >= item.altCost;
  if (item.altCurrency === "blue_gem") return profile.gems.blue >= item.altCost;
  if (item.altCurrency === "purple_gem") return profile.gems.purple >= item.altCost;
  return profile.gems.gold >= item.altCost;
}

export function applyPurchase(
  item: StoreItem,
  profile: PersonalizationProfile,
  currencyOverride?: "coins" | "blue_gem" | "purple_gem" | "gold_gem"
): PersonalizationProfile {
  if (profile.inventory.includes(item.id)) return profile;

  if (item.id === "theme:obsidian_skull") {
    const wantsCoins = currencyOverride === "coins";
    const wantsGemSpend = currencyOverride && currencyOverride !== "coins";
    const canCoins = profile.coins >= item.cost;
    const canAnyGems = totalGems(profile.gems) >= 3;

    if (wantsCoins && !canCoins) throw new Error("Insufficient balance.");
    if (wantsGemSpend && !canAnyGems) throw new Error("Insufficient balance.");
    if (!wantsCoins && !wantsGemSpend && !canCoins && !canAnyGems) throw new Error("Insufficient balance.");

    const next: PersonalizationProfile = {
      ...profile,
      inventory: Array.from(new Set([...profile.inventory, item.id])),
      gems: { ...profile.gems }
    };

    if (wantsCoins || (!wantsGemSpend && canCoins)) {
      next.coins = Math.max(0, profile.coins - item.cost);
      return next;
    }

    next.gems = spendFromGemPool(profile.gems, 3);
    return next;
  }

  const spendOptions = [
    { currency: item.currency, cost: item.cost },
    ...(item.altCurrency && typeof item.altCost === "number" ? [{ currency: item.altCurrency, cost: item.altCost }] : [])
  ];
  const selected = currencyOverride
    ? spendOptions.find((option) => option.currency === currencyOverride)
    : spendOptions.find((option) => {
        if (option.currency === "coins") return profile.coins >= option.cost;
        if (option.currency === "blue_gem") return profile.gems.blue >= option.cost;
        if (option.currency === "purple_gem") return profile.gems.purple >= option.cost;
        return profile.gems.gold >= option.cost;
      });

  if (!selected) {
    throw new Error("Insufficient balance.");
  }
  if (currencyOverride && selected.currency !== currencyOverride) {
    throw new Error("Selected currency is not available for this item.");
  }
  if (selected.currency === "coins" && profile.coins < selected.cost) throw new Error("Insufficient balance.");
  if (selected.currency === "blue_gem" && profile.gems.blue < selected.cost) throw new Error("Insufficient balance.");
  if (selected.currency === "purple_gem" && profile.gems.purple < selected.cost) throw new Error("Insufficient balance.");
  if (selected.currency === "gold_gem" && profile.gems.gold < selected.cost) throw new Error("Insufficient balance.");

  const next: PersonalizationProfile = {
    ...profile,
    inventory: Array.from(new Set([...profile.inventory, item.id])),
    gems: { ...profile.gems }
  };

  if (selected.currency === "coins") next.coins = Math.max(0, profile.coins - selected.cost);
  if (selected.currency === "blue_gem") next.gems.blue = Math.max(0, profile.gems.blue - selected.cost);
  if (selected.currency === "purple_gem") next.gems.purple = Math.max(0, profile.gems.purple - selected.cost);
  if (selected.currency === "gold_gem") next.gems.gold = Math.max(0, profile.gems.gold - selected.cost);

  return next;
}

export function equipItem(itemId: string, profile: PersonalizationProfile): PersonalizationProfile {
  if (!profile.inventory.includes(itemId)) {
    throw new Error("Item is not owned.");
  }
  const item = getStoreItemById(itemId);
  if (!item) throw new Error("Item not found.");

  const next: PersonalizationProfile = {
    ...profile,
    equippedItems: { ...profile.equippedItems }
  };

  if (item.category === "theme") {
    const themeId = itemId.replace("theme:", "");
    next.themeId = themeId;
    next.equippedItems.theme = themeId;
  }
  if (item.category === "uiSkin") {
    const uiSkin = itemId.replace("ui:", "");
    next.uiSkin = uiSkin;
    next.equippedItems.uiSkin = uiSkin;
  }
  if (item.category === "aiStyle") {
    const aiStyle = itemId.replace("ai:", "");
    next.aiStyle = aiStyle;
    next.equippedItems.aiStyle = aiStyle;
  }
  if (item.category === "avatar") {
    const avatar = itemId.replace("avatar:", "");
    next.avatar = avatar;
    next.equippedItems.avatar = avatar;
  }
  if (item.category === "frame") {
    const frame = itemId.replace("frame:", "");
    next.frame = frame;
    next.equippedItems.frame = frame;
  }

  return next;
}

export function addCustomTheme(profile: PersonalizationProfile, draft: CustomThemeDraft): PersonalizationProfile {
  const createCost = 200;
  if (profile.coins < createCost) {
    throw new Error("Need 200 PX Coins to create a custom theme.");
  }

  const customThemeId = `custom:${draft.id}`;
  const nextInventory = profile.inventory.includes(`theme:${customThemeId}`)
    ? profile.inventory
    : [...profile.inventory, `theme:${customThemeId}`];
  const nextThemes = [...profile.customThemes, draft];

  return {
    ...profile,
    coins: Math.max(0, profile.coins - createCost),
    inventory: nextInventory,
    customThemes: nextThemes,
    themeId: customThemeId,
    equippedItems: { ...profile.equippedItems, theme: customThemeId }
  };
}

export function applyEarnings(
  profile: PersonalizationProfile,
  coins: number,
  gems: Partial<GemWallet>,
  source: string
): PersonalizationProfile {
  const next = {
    ...profile,
    gems: { ...profile.gems },
    coins: Math.max(0, profile.coins + Math.max(0, Math.floor(coins)))
  };

  next.gems.blue = Math.max(0, next.gems.blue + Math.max(0, Math.floor(toNumber(gems.blue, 0))));
  next.gems.purple = Math.max(0, next.gems.purple + Math.max(0, Math.floor(toNumber(gems.purple, 0))));
  next.gems.gold = Math.max(0, next.gems.gold + Math.max(0, Math.floor(toNumber(gems.gold, 0))));

  if (source === "milestone" && !next.inventory.includes("frame:gold-frame")) {
    next.inventory = [...next.inventory, "frame:gold-frame"];
  }
  return next;
}

export function composeThemeVariables(themeId: string, customThemes: CustomThemeDraft[]) {
  if (themeId.startsWith("custom:")) {
    const customId = themeId.replace("custom:", "");
    const custom = customThemes.find((theme) => theme.id === customId);
    if (custom) {
      return {
        "--px-bg": custom.backgroundGradient,
        "--px-surface": `rgba(15,23,42,${Math.max(0.2, Math.min(1, custom.cardOpacity)).toFixed(2)})`,
        "--px-surface-soft": `rgba(15,23,42,${Math.max(0.1, Math.min(0.8, custom.cardOpacity - 0.12)).toFixed(2)})`,
        "--px-border": `${custom.accentColor}33`,
        "--px-text": "#f8fafc",
        "--px-muted": "#cbd5e1",
        "--px-accent": custom.primaryColor,
        "--px-accent-strong": custom.accentColor,
        "--px-card-radius": `${Math.max(8, Math.min(36, custom.borderRadius))}px`,
        "--px-glow": `0 0 ${Math.max(20, custom.glowIntensity)}px ${custom.primaryColor}55`,
        "--px-grid-opacity": String(Math.max(0.03, Math.min(0.2, custom.neonLevel / 500))),
        "--px-particle-hue": custom.primaryColor
      };
    }
  }

  const theme = PX_THEMES[(themeId as keyof typeof PX_THEMES) ?? DEFAULT_THEME_ID] ?? PX_THEMES[DEFAULT_THEME_ID];
  return {
    "--px-bg": theme.background,
    "--px-surface": theme.surface,
    "--px-surface-soft": theme.surfaceSoft,
    "--px-border": theme.border,
    "--px-text": theme.text,
    "--px-muted": theme.muted,
    "--px-accent": theme.accent,
    "--px-accent-strong": theme.accentStrong,
    "--px-card-radius": theme.cardRadius,
    "--px-glow": theme.glow,
    "--px-grid-opacity": String(theme.gridOpacity),
    "--px-particle-hue": theme.particleHue
  };
}

export const PERSONALIZATION_STORE = PX_STORE_ITEMS;
