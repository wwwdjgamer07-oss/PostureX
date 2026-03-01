"use client";

import { useState } from "react";
import { GameShell, TOUCH_ACTION_BTN } from "@/components/pxplay/games/shared";

type Mark = "X" | "O";
type Result = Mark | "draw" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
] as const;

function checkWinner(candidate: Array<Mark | null>): Result {
  for (const [a, b, c] of LINES) {
    if (candidate[a] && candidate[a] === candidate[b] && candidate[a] === candidate[c]) {
      return candidate[a] as Mark;
    }
  }
  if (candidate.every(Boolean)) return "draw";
  return null;
}

function randomMove(candidate: Array<Mark | null>) {
  const empty = candidate
    .map((v, i) => (v === null ? i : null))
    .filter((v): v is number => v !== null);
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)] ?? null;
}

function heuristicScore(candidate: Array<Mark | null>) {
  let score = 0;
  for (const [a, b, c] of LINES) {
    const line = [candidate[a], candidate[b], candidate[c]];
    const ai = line.filter((cell) => cell === "O").length;
    const human = line.filter((cell) => cell === "X").length;
    if (ai > 0 && human === 0) score += ai;
    if (human > 0 && ai === 0) score -= human;
  }
  return score;
}

function minimax(candidate: Array<Mark | null>, depth: number, isMax: boolean, maxDepth: number): number {
  const result = checkWinner(candidate);
  if (result === "O") return 10 - depth;
  if (result === "X") return depth - 10;
  if (result === "draw") return 0;
  if (depth >= maxDepth) return heuristicScore(candidate);

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      candidate[i] = "O";
      best = Math.max(best, minimax(candidate, depth + 1, false, maxDepth));
      candidate[i] = null;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i] !== null) continue;
    candidate[i] = "X";
    best = Math.min(best, minimax(candidate, depth + 1, true, maxDepth));
    candidate[i] = null;
  }
  return best;
}

function minimaxMove(candidate: Array<Mark | null>, maxDepth: number) {
  let bestScore = -Infinity;
  let move: number | null = null;
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i] !== null) continue;
    candidate[i] = "O";
    const score = minimax(candidate, 0, false, maxDepth);
    candidate[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

function aiMove(candidate: Array<Mark | null>, level: 1 | 2 | 3) {
  if (level === 1) return randomMove(candidate);
  if (level === 2) return minimaxMove(candidate, 2);
  return minimaxMove(candidate, Number.POSITIVE_INFINITY);
}

export function XOGame({ onExit }: { onExit: () => void }) {
  const [board, setBoard] = useState<Array<Mark | null>>(Array(9).fill(null));
  const [winner, setWinner] = useState<Result>(null);
  const [tttLevel, setTttLevel] = useState<1 | 2 | 3>(1);

  const levelName = tttLevel === 1 ? "Easy" : tttLevel === 2 ? "Medium" : "Hard";

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
  };

  const onPlayerWin = () => {
    setTttLevel((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
    resetBoard();
  };

  const restart = () => {
    resetBoard();
  };

  const play = (i: number) => {
    if (winner || board[i]) return;

    const next = [...board];
    next[i] = "X";

    const first = checkWinner(next);
    if (first === "X") {
      onPlayerWin();
      return;
    }
    if (first) {
      setBoard(next);
      setWinner(first);
      return;
    }

    const aiIndex = aiMove(next, tttLevel);
    if (aiIndex === null) {
      setBoard(next);
      setWinner("draw");
      return;
    }

    next[aiIndex] = "O";
    const second = checkWinner(next);
    setBoard(next);
    if (second) setWinner(second);
  };

  return (
    <GameShell
      title="Tic-Tac-Toe"
      subtitle="You are X"
      headerMeta={
        <div className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/90">
          Level {tttLevel} - {levelName}
        </div>
      }
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">
              {winner === "draw" ? "Draw" : winner ? `${winner} wins` : "Your move"}
            </p>
            <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
          </div>
        </div>
      }
    >
      <div className="grid h-full w-full place-items-center bg-[#020617] p-4">
        <div className="grid w-full max-w-[420px] grid-cols-3 gap-3">
          {board.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => play(idx)}
              className="board-cell aspect-square rounded-2xl border border-cyan-300/35 bg-slate-900/75 text-4xl"
            >
              {cell}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
