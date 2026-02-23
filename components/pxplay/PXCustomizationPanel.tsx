"use client";

import { useMemo, useState } from "react";
import { Gem, Coins, Sparkles, Palette } from "lucide-react";
import { SkullCoinIcon, SkullCrystalIcon, SkullGemIcon } from "@/components/icons/SkullIcons";
import { setPersonalizationProfileFromMutation, usePersonalizationProfile } from "@/lib/personalization/profileClient";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import type { CustomThemeDraft, PersonalizationProfile } from "@/lib/personalization/types";

interface Props {
  onProfileChange?: (profile: PersonalizationProfile) => void;
}

const defaultThemeDraft = {
  name: "My Neon",
  primaryColor: "#22d3ee",
  accentColor: "#3b82f6",
  glowIntensity: 45,
  backgroundGradient: "linear-gradient(160deg,#0b0f14 0%,#0f172a 45%,#0b0f14 100%)",
  cardOpacity: 0.62,
  borderRadius: 24,
  neonLevel: 60,
  fontStyle: "space-grotesk",
  gridPattern: "default",
  particleEffect: "soft"
};

export function PXCustomizationPanel({ onProfileChange }: Props) {
  const { profile, store } = usePersonalizationProfile();
  const [activeTab, setActiveTab] = useState<"store" | "inventory" | "creator">("store");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(defaultThemeDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isObsidianSkull = useIsObsidianSkullTheme();

  const grouped = useMemo(() => {
    return {
      theme: store.filter((item) => item.category === "theme"),
      uiSkin: store.filter((item) => item.category === "uiSkin"),
      aiStyle: store.filter((item) => item.category === "aiStyle"),
      profile: store.filter((item) => item.category === "avatar" || item.category === "frame")
    };
  }, [store]);

  async function purchase(itemId: string, autoEquip = false, currency?: "coins" | "blue_gem" | "purple_gem" | "gold_gem") {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/personalization/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, autoEquip, currency })
    });
    const payload = (await response.json()) as { error?: string; profile?: PersonalizationProfile };
    if (!response.ok || !payload.profile) {
      setError(payload.error || "Purchase failed.");
      return;
    }
    setPersonalizationProfileFromMutation(payload.profile);
    onProfileChange?.(payload.profile);
    setMessage("Item unlocked.");
  }

  async function equip(itemId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/personalization/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId })
    });
    const payload = (await response.json()) as { error?: string; profile?: PersonalizationProfile };
    if (!response.ok || !payload.profile) {
      setError(payload.error || "Equip failed.");
      return;
    }
    setPersonalizationProfileFromMutation(payload.profile);
    onProfileChange?.(payload.profile);
    setMessage("Equipped.");
  }

  async function createTheme() {
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/personalization/custom-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: {
            ...draft,
            id: `custom-${Date.now()}`
          }
        })
      });
      const payload = (await response.json()) as { error?: string; profile?: PersonalizationProfile };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Failed to create theme.");
      }
      setPersonalizationProfileFromMutation(payload.profile);
      onProfileChange?.(payload.profile);
      setMessage("Custom theme created and equipped.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create theme.");
    } finally {
      setCreating(false);
    }
  }

  const inventorySet = new Set(profile?.inventory ?? []);

  return (
    <section className="px-panel space-y-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">PX Customization</p>
          <h3 className="text-lg font-semibold text-white">Inventory + Cosmetics Store</h3>
        </div>
        {profile ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-amber-100">
              {isObsidianSkull ? <SkullCoinIcon className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />} {profile.coins} PX Coins
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              {isObsidianSkull ? <SkullCrystalIcon className="h-3.5 w-3.5" /> : <Gem className="h-3.5 w-3.5" />} {profile.gems.blue}B/{profile.gems.purple}P/{profile.gems.gold}G
            </span>
          </div>
        ) : null}
      </header>

      <div className="inline-flex rounded-xl border border-slate-500/30 bg-slate-900/50 p-1">
        {(["store", "inventory", "creator"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              activeTab === tab ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "store" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {[
            { title: "Themes", items: grouped.theme },
            { title: "UI Skins", items: grouped.uiSkin },
            { title: "AI Styles", items: grouped.aiStyle },
            { title: "Avatar + Frames", items: grouped.profile }
          ].map((section) => (
            <div key={section.title} className="rounded-xl border border-slate-500/30 bg-slate-900/55 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{section.title}</p>
              <div className="mt-2 space-y-2">
                {section.items.map((item) => {
                  const owned = inventorySet.has(item.id);
                  const equipped =
                    item.id === `theme:${profile?.themeId}` ||
                    item.id === `ui:${profile?.uiSkin}` ||
                    item.id === `ai:${profile?.aiStyle}` ||
                    item.id === `avatar:${profile?.avatar}` ||
                    item.id === `frame:${profile?.frame}`;
                  const priceLabel =
                    item.currency === "coins"
                      ? `${item.cost} PX Coins`
                      : item.currency === "blue_gem"
                        ? `${item.cost} blue gem`
                        : item.currency === "purple_gem"
                          ? `${item.cost} purple gem`
                          : `${item.cost} gold gem`;
                  const altPriceLabel =
                    item.id === "theme:obsidian_skull"
                      ? "3 gems"
                      : item.altCurrency && typeof item.altCost === "number"
                        ? item.altCurrency === "coins"
                          ? `${item.altCost} PX Coins`
                          : item.altCurrency === "blue_gem"
                            ? `${item.altCost} blue gem`
                            : item.altCurrency === "purple_gem"
                              ? `${item.altCost} purple gem`
                              : `${item.altCost} gold gem`
                        : null;
                  return (
                    <div key={item.id} className={`px-store-item flex items-center justify-between gap-2 rounded-lg border border-slate-500/25 bg-slate-950/45 px-3 py-2 ${item.id === "theme:obsidian_skull" ? "px-store-obsidian-card" : ""}`}>
                      <div>
                        <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
                          {item.id === "theme:obsidian_skull" ? <SkullGemIcon className="h-4 w-4 text-violet-300" /> : null}
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400">
                          {priceLabel}
                          {altPriceLabel ? ` or ${altPriceLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!owned ? (
                          <>
                            <button type="button" onClick={() => void purchase(item.id, true, item.currency)} className={`px-button text-xs ${item.id === "theme:obsidian_skull" ? "obsidian-unlock-button" : ""}`}>
                              Unlock
                            </button>
                            {item.altCurrency && typeof item.altCost === "number" ? (
                              <button type="button" onClick={() => void purchase(item.id, true, item.altCurrency)} className="px-button-ghost text-xs">
                                Unlock Alt
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <button type="button" onClick={() => void equip(item.id)} className="px-button-ghost text-xs">
                            {equipped ? "Equipped" : "Equip"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "inventory" ? (
        <div className="rounded-xl border border-slate-500/30 bg-slate-900/55 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Owned Items</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile?.inventory ?? []).map((itemId) => (
              <span key={itemId} className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                {itemId}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-500/30 bg-slate-950/40 p-3 text-xs text-slate-300">
            <p>Equipped Theme: {profile?.themeId}</p>
            <p>UI Skin: {profile?.uiSkin}</p>
            <p>AI Style: {profile?.aiStyle}</p>
            <p>Avatar: {profile?.avatar}</p>
            <p>Frame: {profile?.frame}</p>
          </div>
        </div>
      ) : null}

      {activeTab === "creator" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-500/30 bg-slate-900/55 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Palette className="h-4 w-4" />
              Theme Creator (200 PX Coins)
            </p>
            <div className="mt-3 grid gap-2">
              <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="rounded-lg border border-slate-500/40 bg-slate-950/70 px-3 py-2 text-sm text-white" placeholder="Theme name" />
              <label className="text-xs text-slate-400">
                Primary color
                <input type="color" value={draft.primaryColor} onChange={(e) => setDraft((prev) => ({ ...prev, primaryColor: e.target.value }))} className="mt-1 h-9 w-full rounded" />
              </label>
              <label className="text-xs text-slate-400">
                Accent color
                <input type="color" value={draft.accentColor} onChange={(e) => setDraft((prev) => ({ ...prev, accentColor: e.target.value }))} className="mt-1 h-9 w-full rounded" />
              </label>
              <label className="text-xs text-slate-400">
                Glow intensity
                <input type="range" min={10} max={100} value={draft.glowIntensity} onChange={(e) => setDraft((prev) => ({ ...prev, glowIntensity: Number(e.target.value) }))} className="mt-1 w-full" />
              </label>
              <label className="text-xs text-slate-400">
                Card opacity
                <input type="range" min={0.25} max={1} step={0.01} value={draft.cardOpacity} onChange={(e) => setDraft((prev) => ({ ...prev, cardOpacity: Number(e.target.value) }))} className="mt-1 w-full" />
              </label>
              <button type="button" onClick={() => void createTheme()} disabled={creating} className="px-button mt-2">
                <Sparkles className="h-4 w-4" />
                {creating ? "Creating..." : "Create & Equip"}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Custom Themes</p>
            <div className="mt-2 space-y-2">
              {(profile?.customThemes ?? []).map((theme: CustomThemeDraft) => (
                <div key={theme.id} className="flex items-center justify-between rounded-lg border border-slate-500/30 bg-slate-900/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{theme.name}</p>
                    <p className="text-xs text-slate-400">{theme.id}</p>
                  </div>
                  <button type="button" onClick={() => void equip(`theme:custom:${theme.id}`)} className="px-button-ghost text-xs">
                    Equip
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </section>
  );
}
