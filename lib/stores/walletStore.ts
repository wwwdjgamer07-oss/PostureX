import { create } from "zustand";

type WalletState = {
  coins: number;
  gems: number;
  xp: number;
  setWallet: (wallet: Partial<Pick<WalletState, "coins" | "gems" | "xp">>) => void;
  addCoins: (n: number) => void;
  addGems: (n: number) => void;
  addXP: (n: number) => void;
  spendCoins: (n: number) => void;
  spendGems: (n: number) => void;
};

const clamp = (value: number) => Math.max(0, Math.floor(Number(value) || 0));

export const useWallet = create<WalletState>((set) => ({
  coins: 0,
  gems: 0,
  xp: 0,
  setWallet: (wallet) =>
    set((state) => ({
      coins: clamp(wallet.coins ?? state.coins),
      gems: clamp(wallet.gems ?? state.gems),
      xp: clamp(wallet.xp ?? state.xp)
    })),
  addCoins: (n) =>
    set((s) => ({ coins: clamp(s.coins + clamp(n)) })),
  addGems: (n) =>
    set((s) => ({ gems: clamp(s.gems + clamp(n)) })),
  addXP: (n) =>
    set((s) => ({ xp: clamp(s.xp + clamp(n)) })),
  spendCoins: (n) =>
    set((s) => ({ coins: Math.max(0, s.coins - clamp(n)) })),
  spendGems: (n) =>
    set((s) => ({ gems: Math.max(0, s.gems - clamp(n)) }))
}));
