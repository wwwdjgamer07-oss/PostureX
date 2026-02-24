"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { applyPersonalizationToDocument } from "@/lib/personalization/client";
import type { PersonalizationProfile, StoreItem } from "@/lib/personalization/types";
import { useWallet } from "@/lib/stores/walletStore";

const STORAGE_KEY = "px.personalization.cache.v1";
const THROTTLE_MS = 5000;

type PersonalizationState = {
  profile: PersonalizationProfile | null;
  store: StoreItem[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: number;
  userId: string | null;
};

type ProfilePayload = { profile?: PersonalizationProfile; store?: StoreItem[]; error?: string };

const state: PersonalizationState = {
  profile: null,
  store: [],
  loading: false,
  loaded: false,
  error: null,
  lastFetchedAt: 0,
  userId: null
};

const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
let initialized = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function readCachedProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersonalizationProfile;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: PersonalizationProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function applyProfile(profile: PersonalizationProfile) {
  state.profile = profile;
  state.loaded = true;
  state.error = null;
  state.lastFetchedAt = Date.now();
  applyPersonalizationToDocument(profile);
  useWallet.getState().setWallet({
    coins: profile.walletCoins ?? profile.coins,
    gems: profile.walletGems ?? (profile.gems.blue + profile.gems.purple + profile.gems.gold),
    xp: profile.walletXP ?? 0
  });
  writeCachedProfile(profile);
}

function invalidateProfileForUser(nextUserId: string | null) {
  state.userId = nextUserId;
  state.profile = null;
  state.store = [];
  state.loading = false;
  state.loaded = false;
  state.error = null;
  state.lastFetchedAt = 0;
  emit();
}

export function setPersonalizationProfileFromMutation(profile: PersonalizationProfile) {
  applyProfile(profile);
  emit();
}

export function setPersonalizationWalletFromMutation(wallet: {
  coins: number;
  gems: { blue: number; purple: number; gold: number };
  xp?: number;
}) {
  if (!state.profile) return;
  const totalGems = Number(wallet.gems.blue ?? 0) + Number(wallet.gems.purple ?? 0) + Number(wallet.gems.gold ?? 0);
  applyProfile({
    ...state.profile,
    coins: wallet.coins,
    gems: wallet.gems,
    walletCoins: wallet.coins,
    walletGems: Math.max(0, Math.floor(totalGems)),
    walletXP: Math.max(0, Math.floor(Number(wallet.xp ?? state.profile.walletXP ?? 0)))
  });
  emit();
}

export async function fetchPersonalizationProfile(options?: { force?: boolean }) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (inFlight) return inFlight;
  if (!force && state.loaded && now - state.lastFetchedAt < THROTTLE_MS) return;

  state.loading = true;
  emit();

  inFlight = (async () => {
    try {
      const response = await fetch("/api/personalization/profile", { cache: "no-store" });
      const payload = (await response.json()) as ProfilePayload;
      if (!response.ok || !payload.profile) {
        state.error = payload.error || "Failed to load personalization.";
        return;
      }
      applyProfile(payload.profile);
      state.store = payload.store ?? state.store;
    } catch {
      state.error = "Failed to load personalization.";
    } finally {
      state.loading = false;
      inFlight = null;
      emit();
    }
  })();

  return inFlight;
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const cached = readCachedProfile();
  if (cached) {
    applyProfile(cached);
  }

  const supabase = createBrowserSupabaseClient();
  void supabase.auth.getUser().then(({ data }) => {
    const nextUserId = data.user?.id ?? null;
    if (state.userId !== nextUserId) {
      invalidateProfileForUser(nextUserId);
    }
    if (nextUserId) {
      void fetchPersonalizationProfile({ force: true });
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const nextUserId = session?.user?.id ?? null;
    if (state.userId !== nextUserId) {
      invalidateProfileForUser(nextUserId);
      if (nextUserId) {
        void fetchPersonalizationProfile({ force: true });
      }
    }
  });

  window.addEventListener("px-personalization-updated", () => {
    void fetchPersonalizationProfile({ force: true });
  });

  void fetchPersonalizationProfile();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function usePersonalizationProfile() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    ensureInitialized();
  }, []);

  return {
    profile: snapshot.profile,
    store: snapshot.store,
    loading: snapshot.loading,
    loaded: snapshot.loaded,
    error: snapshot.error,
    refreshProfile: (force = true) => fetchPersonalizationProfile({ force })
  };
}
