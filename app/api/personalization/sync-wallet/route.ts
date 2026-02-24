import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: { coins?: unknown; gems?: { blue?: unknown; purple?: unknown; gold?: unknown } };
  try {
    payload = (await request.json()) as { coins?: unknown; gems?: { blue?: unknown; purple?: unknown; gold?: unknown } };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const currentRes = await supabase.from("users").select("\"walletCoins\",\"walletGems\",\"walletXP\",px_coins,px_gems").eq("id", user.id).maybeSingle();
  if (currentRes.error) {
    return NextResponse.json({ error: currentRes.error.message || "Failed to load wallet." }, { status: 500 });
  }

  const currentRow = (currentRes.data as {
    walletCoins?: number;
    walletGems?: number;
    walletXP?: number;
    px_coins?: number;
    px_gems?: { blue?: number; purple?: number; gold?: number };
  } | null) ?? null;
  const currentCoins = Math.max(0, Math.floor(asNumber(currentRow?.walletCoins ?? currentRow?.px_coins, 0)));
  const currentGems = {
    blue: Math.max(0, Math.floor(asNumber(currentRow?.px_gems?.blue, 0))),
    purple: Math.max(0, Math.floor(asNumber(currentRow?.px_gems?.purple, 0))),
    gold: Math.max(0, Math.floor(asNumber(currentRow?.px_gems?.gold, 0)))
  };
  const currentXP = Math.max(0, Math.floor(asNumber(currentRow?.walletXP, 0)));

  // One-time migration guard: only import if server wallet is still empty.
  const serverAlreadyInitialized =
    currentCoins > 0 || currentGems.blue > 0 || currentGems.purple > 0 || currentGems.gold > 0;
  if (serverAlreadyInitialized) {
    return NextResponse.json({
      ok: true,
      migrated: false,
      reason: "server_wallet_already_initialized",
      wallet: { coins: currentCoins, gems: currentGems, xp: currentXP }
    });
  }

  const requestedCoins = Math.max(0, Math.floor(asNumber(payload.coins, 0)));
  const requestedGems = {
    blue: Math.max(0, Math.floor(asNumber(payload.gems?.blue, 0))),
    purple: Math.max(0, Math.floor(asNumber(payload.gems?.purple, 0))),
    gold: Math.max(0, Math.floor(asNumber(payload.gems?.gold, 0)))
  };

  // Safety caps for migration import.
  const nextWallet = {
    coins: Math.min(requestedCoins, 5000),
    gems: {
      blue: Math.min(requestedGems.blue, 100),
      purple: Math.min(requestedGems.purple, 100),
      gold: Math.min(requestedGems.gold, 100)
    }
  };

  const updateRes = await supabase
    .from("users")
    .update({
      walletCoins: nextWallet.coins,
      walletGems: nextWallet.gems.blue + nextWallet.gems.purple + nextWallet.gems.gold,
      walletXP: currentXP,
      px_coins: nextWallet.coins,
      px_gems: nextWallet.gems
    })
    .eq("id", user.id);

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message || "Failed to migrate wallet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, migrated: true, wallet: { ...nextWallet, xp: currentXP } });
}
