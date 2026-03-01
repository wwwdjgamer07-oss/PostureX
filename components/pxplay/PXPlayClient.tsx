"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Brain, Brackets, CircleDot, Gamepad2, Grid3X3, Layers, Rocket } from "lucide-react";
import { SnakeGame } from "@/components/pxplay/games/SnakeGame";
import { LanderGame } from "@/components/pxplay/games/LanderGame";
import { PongGame } from "@/components/pxplay/games/PongGame";
import { BreakoutGame } from "@/components/pxplay/games/BreakoutGame";
import { XOGame } from "@/components/pxplay/games/XOGame";
import { MemoryGame } from "@/components/pxplay/games/MemoryGame";

type GameId = "snake" | "lander" | "xo" | "pong" | "breakout" | "memory";

type Tile = {
  id: GameId;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TILES: Tile[] = [
  { id: "snake", name: "Snake", subtitle: "Swipe to survive", icon: Brain },
  { id: "lander", name: "Lander", subtitle: "Thrust to land", icon: Rocket },
  { id: "xo", name: "XO", subtitle: "Beat the AI", icon: Grid3X3 },
  { id: "pong", name: "Pong", subtitle: "Reflex duel", icon: CircleDot },
  { id: "breakout", name: "Breakout", subtitle: "Clear all bricks", icon: Brackets },
  { id: "memory", name: "Memory", subtitle: "Match all pairs", icon: Layers }
];

export function PXPlayClient() {
  const [active, setActive] = useState<GameId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const isGameActive = active !== null;
    document.body.classList.toggle("px-game-active", isGameActive);
    document.documentElement.classList.toggle("px-game-active", isGameActive);
    window.dispatchEvent(new CustomEvent("posturex-game-active", { detail: { active: isGameActive, game: active } }));

    return () => {
      document.body.classList.remove("px-game-active");
      document.documentElement.classList.remove("px-game-active");
      window.dispatchEvent(new CustomEvent("posturex-game-active", { detail: { active: false, game: null } }));
    };
  }, [active]);

  const view = useMemo(() => {
    if (active === "snake") return <SnakeGame onExit={() => setActive(null)} />;
    if (active === "lander") return <LanderGame onExit={() => setActive(null)} />;
    if (active === "pong") return <PongGame onExit={() => setActive(null)} />;
    if (active === "breakout") return <BreakoutGame onExit={() => setActive(null)} />;
    if (active === "xo") return <XOGame onExit={() => setActive(null)} />;
    if (active === "memory") return <MemoryGame onExit={() => setActive(null)} />;
    return null;
  }, [active]);

  return (
    <div className="px-shell space-y-6 pb-12">
      <section className="px-panel p-4 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300"><Gamepad2 className="h-4 w-4" />PX Play Arcade</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">PX Play</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">All arcade games rebuilt from scratch with clean rendering and mobile-first controls.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const selected = active === tile.id;
          return (
            <article key={tile.id} className="px-panel px-hover-lift relative overflow-hidden p-5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-blue-500/10 to-transparent opacity-60" />
              <Icon className="relative h-5 w-5 text-cyan-300" />
              <h2 className="relative mt-3 text-lg font-semibold text-slate-900 dark:text-white">{tile.name}</h2>
              <p className="relative mt-1 text-sm text-slate-600 dark:text-slate-300">{tile.subtitle}</p>
              <button type="button" onClick={() => setActive(tile.id)} className="px-button relative mt-4 w-full">
                {selected ? "Playing" : "Play"}
              </button>
            </article>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/ai-playground" className="px-button-ghost inline-flex">Back to AI Playground</Link>
        <Link href="/dashboard" className="px-button-ghost inline-flex">Back to Dashboard</Link>
      </div>

      {view}
    </div>
  );
}
