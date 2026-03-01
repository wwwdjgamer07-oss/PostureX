"use client";

import { useCallback, useEffect, useState } from "react";
import { GameShell, TOUCH_ACTION_BTN } from "@/components/pxplay/games/shared";

const MEMORY_SYMBOLS = ["PX", "AI", "UX", "RX", "GO", "VR"] as const;

export function MemoryGame({ onExit }: { onExit: () => void }) {
  type Card = { id: number; value: string; open: boolean; matched: boolean };

  const buildCards = useCallback((): Card[] => {
    return [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]
      .sort(() => Math.random() - 0.5)
      .map((value, id) => ({ id, value, open: false, matched: false }));
  }, []);

  const [cards, setCards] = useState<Card[]>(() => buildCards());
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const matchedCount = cards.filter((c) => c.matched).length;
  const won = matchedCount === cards.length;

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const cardA = cards[a];
    const cardB = cards[b];
    if (!cardA || !cardB) return;

    if (cardA.value === cardB.value) {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
      setOpen([]);
      return;
    }

    const t = window.setTimeout(() => {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, open: false } : c)));
      setOpen([]);
    }, 520);
    return () => window.clearTimeout(t);
  }, [cards, open]);

  const flip = (idx: number) => {
    if (open.length >= 2) return;
    const card = cards[idx];
    if (!card || card.open || card.matched) return;
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, open: true } : c)));
    setOpen((prev) => [...prev, idx]);
    setMoves((m) => m + 1);
  };

  const restart = () => {
    setCards(buildCards());
    setOpen([]);
    setMoves(0);
  };

  return (
    <GameShell
      title="Memory Match"
      subtitle="Find all pairs"
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">Moves: {moves} {won ? "- Complete" : ""}</p>
            <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
          </div>
        </div>
      }
    >
      <div className="grid h-full w-full place-items-center bg-[#020617] p-4">
        <div className="grid w-full max-w-[520px] grid-cols-4 gap-3">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(idx)}
              className={`aspect-square rounded-xl border text-lg font-semibold transition ${
                card.open || card.matched
                  ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                  : "border-slate-500/30 bg-slate-900/70 text-slate-300"
              }`}
            >
              {card.open || card.matched ? card.value : "?"}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
