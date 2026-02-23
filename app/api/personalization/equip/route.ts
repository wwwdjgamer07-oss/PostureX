import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { applyGodModeProfile, isGodModeUser } from "@/lib/personalization/godMode";
import { equipItem, normalizePersonalizationRow } from "@/lib/personalization/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: { itemId?: unknown };
  try {
    payload = (await request.json()) as { itemId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const itemId = String(payload.itemId ?? "");
  if (!itemId) return NextResponse.json({ error: "itemId is required." }, { status: 400 });

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
    let next = equipItem(itemId, current);
    if (isGodModeUser(user.email)) {
      next = applyGodModeProfile(next);
    }
    const { error: updateError } = await supabase
      .from("users")
      .update({
        px_theme_id: next.themeId,
        px_ui_skin: next.uiSkin,
        px_ai_style: next.aiStyle,
        px_avatar: next.avatar,
        px_frame: next.frame,
        px_equipped_items: next.equippedItems
      })
      .eq("id", user.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, profile: next });
  } catch (equipError) {
    const message = equipError instanceof Error ? equipError.message : "Equip failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
