import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { DEFAULT_DASHBOARD_LAYOUT, DEFAULT_THEME_ID, DEFAULT_UI_SKIN, PX_STORE_ITEMS } from "@/lib/personalization/catalog";
import { applyGodModeProfile, isGodModeUser } from "@/lib/personalization/godMode";
import { normalizePersonalizationRow } from "@/lib/personalization/service";
import { sanitizeText } from "@/lib/api/request";

export const runtime = "nodejs";

export async function GET() {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const { data, error: dbError } = await supabase
    .from("users")
    .select(
      "\"walletCoins\",\"walletGems\",\"walletXP\",px_coins,px_gems,px_inventory,px_equipped_items,px_theme_id,px_ui_skin,px_ai_style,px_avatar,px_frame,px_custom_themes,px_dashboard_layout"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const baseProfile = normalizePersonalizationRow((data as Record<string, unknown> | null) ?? {});
  const profile = isGodModeUser(user.email) ? applyGodModeProfile(baseProfile) : baseProfile;
  return NextResponse.json({
    profile,
    store: PX_STORE_ITEMS,
    defaults: {
      themeId: DEFAULT_THEME_ID,
      uiSkin: DEFAULT_UI_SKIN,
      dashboardLayout: DEFAULT_DASHBOARD_LAYOUT
    }
  });
}

export async function PATCH(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: {
    themeId?: unknown;
    uiSkin?: unknown;
    aiStyle?: unknown;
    avatar?: unknown;
    frame?: unknown;
    dashboardLayout?: unknown;
  };
  try {
    payload = (await request.json()) as {
      themeId?: unknown;
      uiSkin?: unknown;
      aiStyle?: unknown;
      avatar?: unknown;
      frame?: unknown;
      dashboardLayout?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.themeId === "string") updates.px_theme_id = sanitizeText(payload.themeId, 64);
  if (typeof payload.uiSkin === "string") updates.px_ui_skin = sanitizeText(payload.uiSkin, 64);
  if (typeof payload.aiStyle === "string") updates.px_ai_style = sanitizeText(payload.aiStyle, 64);
  if (typeof payload.avatar === "string") updates.px_avatar = sanitizeText(payload.avatar, 128);
  if (typeof payload.frame === "string") updates.px_frame = sanitizeText(payload.frame, 128);
  if (payload.dashboardLayout && typeof payload.dashboardLayout === "object") updates.px_dashboard_layout = payload.dashboardLayout;

  const current = await supabase
    .from("users")
    .select("px_equipped_items")
    .eq("id", user.id)
    .maybeSingle();
  const equipped = ((current.data as { px_equipped_items?: Record<string, unknown> } | null)?.px_equipped_items ?? {}) as Record<string, unknown>;
  if (typeof payload.themeId === "string") equipped.theme = sanitizeText(payload.themeId, 64);
  if (typeof payload.uiSkin === "string") equipped.uiSkin = sanitizeText(payload.uiSkin, 64);
  if (typeof payload.aiStyle === "string") equipped.aiStyle = sanitizeText(payload.aiStyle, 64);
  if (typeof payload.avatar === "string") equipped.avatar = sanitizeText(payload.avatar, 128);
  if (typeof payload.frame === "string") equipped.frame = sanitizeText(payload.frame, 128);
  updates.px_equipped_items = equipped;

  const { error: updateError } = await supabase.from("users").update(updates).eq("id", user.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
