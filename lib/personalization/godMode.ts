import { PX_STORE_ITEMS } from "@/lib/personalization/catalog";
import type { PersonalizationProfile } from "@/lib/personalization/types";

const GOD_MODE_EMAILS = new Set(["deepthan07@gmail.com"]);
const GOD_MODE_LOCAL_PARTS = new Set(["deepthan07"]);
const MAX_BALANCE = 999_999_999;

export function isGodModeUser(email: string | null | undefined) {
  if (process.env.PX_GOD_MODE_ALL === "1") return true;
  const normalized = (email ?? "").trim().toLowerCase();
  if (GOD_MODE_EMAILS.has(normalized)) return true;
  const localPart = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  return GOD_MODE_LOCAL_PARTS.has(localPart);
}

export function applyGodModeProfile(profile: PersonalizationProfile): PersonalizationProfile {
  const fullInventory = Array.from(new Set([...profile.inventory, ...PX_STORE_ITEMS.map((item) => item.id)]));
  return {
    ...profile,
    coins: MAX_BALANCE,
    gems: {
      blue: MAX_BALANCE,
      purple: MAX_BALANCE,
      gold: MAX_BALANCE
    },
    inventory: fullInventory
  };
}
