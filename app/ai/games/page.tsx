"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";

const BalanceGame = dynamic(() => import("@/components/games/BalanceGame"), { ssr: false });
const SlouchGame = dynamic(() => import("@/components/games/SlouchGame"), { ssr: false });
const ReflexGame = dynamic(() => import("@/components/games/ReflexGame"), { ssr: false });

type GameKey = "balance" | "slouch" | "reflex";

const GAME_META: Record<
  GameKey,
  { label: string; short: string; image: string }
> = {
  balance: {
    label: "Balance Beam",
    short: "Hold posture steady and improve body control.",
    image: "/games/balance-banner.svg"
  },
  slouch: {
    label: "Anti-Slouch",
    short: "Correct slouch quickly and build upright habits.",
    image: "/games/slouch-banner.svg"
  },
  reflex: {
    label: "Reflex",
    short: "Train fast posture reactions under time pressure.",
    image: "/games/reflex-banner.svg"
  }
};

export default function AIGamesPage() {
  const [activeGame, setActiveGame] = useState<GameKey>("balance");

  return (
    <div className="px-shell space-y-5 pb-12">
      <section className="flex items-center justify-between rounded-2xl border border-cyan-300/30 bg-slate-900/55 px-5 py-4 backdrop-blur-xl">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          <Gamepad2 className="h-4 w-4" />
          PX Posture Arena
        </p>
        <div className="inline-flex rounded-xl border border-slate-500/30 bg-slate-900/55 p-1">
          {([
            ["balance", "Balance Beam"],
            ["slouch", "Anti-Slouch"],
            ["reflex", "Reflex"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveGame(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                activeGame === key ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(Object.keys(GAME_META) as GameKey[]).map((key) => {
          const game = GAME_META[key];
          const selected = activeGame === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveGame(key)}
              className={`overflow-hidden rounded-2xl border bg-slate-900/55 text-left transition hover:border-cyan-300/45 ${
                selected ? "border-cyan-300/60 shadow-[0_0_30px_rgba(34,211,238,0.18)]" : "border-slate-500/30"
              }`}
            >
              <div className="relative aspect-[16/9] w-full">
                <Image src={game.image} alt={game.label} fill className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-cyan-100">{game.label}</p>
                <p className="mt-1 text-xs text-slate-300">{game.short}</p>
              </div>
            </button>
          );
        })}
      </section>

      {activeGame === "balance" ? <BalanceGame /> : null}
      {activeGame === "slouch" ? <SlouchGame /> : null}
      {activeGame === "reflex" ? <ReflexGame /> : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/ai-playground" className="px-button-ghost inline-flex">
          Back to AI Playground
        </Link>
      </div>
    </div>
  );
}
