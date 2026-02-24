import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { applyGodModeProfile, isGodModeUser } from "@/lib/personalization/godMode";
import { applyPurchase, equipItem, normalizePersonalizationRow } from "@/lib/personalization/service";
import { getStoreItemById } from "@/lib/personalization/catalog";
import type { PersonalizationProfile } from "@/lib/personalization/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: { itemId?: unknown; autoEquip?: unknown; currency?: unknown };
  try {
    payload = (await request.json()) as { itemId?: unknown; autoEquip?: unknown; currency?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const itemId = String(payload.itemId ?? "");
  if (!itemId) return NextResponse.json({ error: "itemId is required." }, { status: 400 });

  const item = getStoreItemById(itemId);
  if (!item) return NextResponse.json({ error: "Store item not found." }, { status: 404 });

  const { data, error: fetchError } = await supabase
    .from("users")
    .select(
      "\"walletCoins\",\"walletGems\",\"walletXP\",px_coins,px_gems,px_inventory,px_equipped_items,px_theme_id,px_ui_skin,px_ai_style,px_avatar,px_frame,px_custom_themes,px_dashboard_layout"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  try {
    const baseProfile = normalizePersonalizationRow((data as Record<string, unknown> | null) ?? {});
    const isGod = isGodModeUser(user.email);
    const current = isGod ? applyGodModeProfile(baseProfile) : baseProfile;
    const currency =
      payload.currency === "coins" || payload.currency === "blue_gem" || payload.currency === "purple_gem" || payload.currency === "gold_gem"
        ? payload.currency
        : undefined;
    let next: PersonalizationProfile;
    if (isGod) {
      // God mode: never block unlocks due to affordability, always unlock + optionally equip.
      next = {
        ...current,
        inventory: Array.from(new Set([...current.inventory, item.id]))
      };
      if (Boolean(payload.autoEquip)) {
        next = equipItem(itemId, next);
      }
      next = applyGodModeProfile(next);
    } else {
      next = applyPurchase(item, current, currency);
      if (Boolean(payload.autoEquip)) {
        next = equipItem(itemId, next);
      }
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        walletCoins: next.walletCoins,
        walletGems: next.walletGems,
        walletXP: next.walletXP,
        px_coins: next.coins,
        px_gems: next.gems,
        px_inventory: next.inventory,
        px_theme_id: next.themeId,
        px_ui_skin: next.uiSkin,
        px_ai_style: next.aiStyle,
        px_avatar: next.avatar,
        px_frame: next.frame,
        px_equipped_items: next.equippedItems
      })
      .eq("id", user.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, profile: next, purchased: item });
  } catch (purchaseError) {
    const message = purchaseError instanceof Error ? purchaseError.message : "Purchase failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
