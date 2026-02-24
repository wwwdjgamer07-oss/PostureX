import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { applyGodModeProfile, isGodModeUser } from "@/lib/personalization/godMode";
import { applyEarnings, normalizePersonalizationRow } from "@/lib/personalization/service";
import type { GemWallet } from "@/lib/personalization/types";
import { sendNotification } from "@/lib/pushServer";

export const runtime = "nodejs";

const SOURCE_CAPS: Record<string, { coins: number; blue: number; purple: number; gold: number }> = {
  games: { coins: 400, blue: 5, purple: 3, gold: 2 },
  streak: { coins: 250, blue: 2, purple: 2, gold: 1 },
  daily_login: { coins: 120, blue: 1, purple: 1, gold: 0 },
  ai_usage: { coins: 80, blue: 1, purple: 0, gold: 0 },
  challenge: { coins: 300, blue: 3, purple: 2, gold: 1 },
  milestone: { coins: 500, blue: 3, purple: 3, gold: 2 }
};

function clampEarn(source: string, coins: number, gems: Partial<GemWallet>) {
  const cap = SOURCE_CAPS[source] ?? SOURCE_CAPS.games;
  return {
    coins: Math.max(0, Math.min(cap.coins, Math.floor(Number(coins || 0)))),
    gems: {
      blue: Math.max(0, Math.min(cap.blue, Math.floor(Number(gems.blue || 0)))),
      purple: Math.max(0, Math.min(cap.purple, Math.floor(Number(gems.purple || 0)))),
      gold: Math.max(0, Math.min(cap.gold, Math.floor(Number(gems.gold || 0))))
    }
  };
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: { source?: unknown; coins?: unknown; gems?: Partial<GemWallet> };
  try {
    payload = (await request.json()) as { source?: unknown; coins?: unknown; gems?: Partial<GemWallet> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const source = String(payload.source ?? "games");
  const requestedCoins = Number(payload.coins ?? 0);
  const requestedGems = payload.gems ?? {};
  const earned = clampEarn(source, requestedCoins, requestedGems);

  const { data, error: fetchError } = await supabase
    .from("users")
    .select(
      "px_coins,px_gems,px_inventory,px_equipped_items,px_theme_id,px_ui_skin,px_ai_style,px_avatar,px_frame,px_custom_themes,px_dashboard_layout"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const baseProfile = normalizePersonalizationRow((data as Record<string, unknown> | null) ?? {});
  const current = isGodModeUser(user.email) ? applyGodModeProfile(baseProfile) : baseProfile;
  let next = applyEarnings(current, earned.coins, earned.gems, source);
  if (isGodModeUser(user.email)) {
    next = applyGodModeProfile(next);
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      px_coins: next.coins,
      px_gems: next.gems,
      px_inventory: next.inventory
    })
    .eq("id", user.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (earned.coins > 0 || earned.gems.blue > 0 || earned.gems.purple > 0 || earned.gems.gold > 0) {
    await sendNotification(
      user.id,
      "Reward unlocked",
      `+${earned.coins} PX Coins and gems added to your wallet.`,
      "/icon.svg",
      "/dashboard"
    );
  }

  return NextResponse.json({ ok: true, earned, profile: next });
}
