import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { applyGodModeProfile, isGodModeUser } from "@/lib/personalization/godMode";
import { addCustomTheme, normalizePersonalizationRow } from "@/lib/personalization/service";
import type { CustomThemeDraft } from "@/lib/personalization/types";

export const runtime = "nodejs";

function sanitizeDraft(input: Record<string, unknown>): CustomThemeDraft {
  const now = new Date().toISOString();
  const base = Math.random().toString(36).slice(2, 10);
  return {
    id: String(input.id ?? `theme-${base}`),
    name: String(input.name ?? "My Theme").slice(0, 40),
    primaryColor: String(input.primaryColor ?? "#22d3ee"),
    accentColor: String(input.accentColor ?? "#3b82f6"),
    glowIntensity: Number(input.glowIntensity ?? 45),
    backgroundGradient: String(
      input.backgroundGradient ?? "linear-gradient(160deg,#0b0f14 0%,#0f172a 45%,#0b0f14 100%)"
    ),
    cardOpacity: Number(input.cardOpacity ?? 0.62),
    borderRadius: Number(input.borderRadius ?? 24),
    neonLevel: Number(input.neonLevel ?? 60),
    fontStyle: String(input.fontStyle ?? "space-grotesk"),
    gridPattern: String(input.gridPattern ?? "default"),
    particleEffect: String(input.particleEffect ?? "soft"),
    createdAt: String(input.createdAt ?? now)
  };
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: { theme?: Record<string, unknown> };
  try {
    payload = (await request.json()) as { theme?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload.theme || typeof payload.theme !== "object") {
    return NextResponse.json({ error: "theme payload is required." }, { status: 400 });
  }

  const { data, error: fetchError } = await supabase
    .from("users")
    .select(
      "px_coins,px_gems,px_inventory,px_equipped_items,px_theme_id,px_ui_skin,px_ai_style,px_avatar,px_frame,px_custom_themes,px_dashboard_layout"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  try {
    const baseProfile = normalizePersonalizationRow((data as Record<string, unknown> | null) ?? {});
    const current = isGodModeUser(user.email) ? applyGodModeProfile(baseProfile) : baseProfile;
    const draft = sanitizeDraft(payload.theme);
    let next = addCustomTheme(current, draft);
    if (isGodModeUser(user.email)) {
      next = applyGodModeProfile(next);
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        px_coins: next.coins,
        px_inventory: next.inventory,
        px_custom_themes: next.customThemes,
        px_theme_id: next.themeId,
        px_equipped_items: next.equippedItems
      })
      .eq("id", user.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, profile: next, createdTheme: draft });
  } catch (themeError) {
    const message = themeError instanceof Error ? themeError.message : "Failed to create custom theme.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
