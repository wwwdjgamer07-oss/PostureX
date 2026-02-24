"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Brain, Gamepad2, Rocket, Grid3X3, CircleDot, Brackets, Layers, Coins, Gem, Shield, Trophy } from "lucide-react";
import { SkullCoinIcon, SkullCrystalIcon, SkullJoystickIcon } from "@/components/icons/SkullIcons";
import { FullscreenGameLayout } from "@/components/games/FullscreenGameLayout";
import { PXCustomizationPanel } from "@/components/pxplay/PXCustomizationPanel";
import { useResizeCanvas } from "@/lib/games/useResizeCanvas";
import { setPersonalizationWalletFromMutation, usePersonalizationProfile } from "@/lib/personalization/profileClient";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { useWallet } from "@/lib/stores/walletStore";

type GameId = "snake" | "lander" | "xo" | "pong" | "breakout" | "memory";
type ArcadeTheme = "neon" | "toxic" | "sunset";

interface ArcadeStats {
  score: number;
  level: number;
  lives: number;
  over: boolean;
  won?: boolean;
}

interface GameTile {
  id: GameId;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const themeMeta: Record<ArcadeTheme, { label: string; frame: string }> = {
  neon: { label: "Neon Core", frame: "from-cyan-400/14 via-blue-500/10 to-transparent" },
  toxic: { label: "Toxic Pulse", frame: "from-lime-400/14 via-emerald-500/10 to-transparent" },
  sunset: { label: "Sunset Flux", frame: "from-orange-400/14 via-rose-500/10 to-transparent" }
};

const tiles: GameTile[] = [
  { id: "snake", name: "Snake", subtitle: "Classic arcade survival", icon: Brain },
  { id: "lander", name: "Lander", subtitle: "Precision landing challenge", icon: Rocket },
  { id: "xo", name: "XO", subtitle: "Strategy vs AI", icon: Grid3X3 },
  { id: "pong", name: "Pong", subtitle: "Reflex duel", icon: CircleDot },
  { id: "breakout", name: "Breakout", subtitle: "Brick smash arcade", icon: Brackets },
  { id: "memory", name: "Memory", subtitle: "Pattern recall", icon: Layers }
];

const STORAGE_KEY = "px_arcade_stats_v1";
const REWARDS_KEY = "px_arcade_rewards_v1";
const TUTORIAL_KEY = "px_arcade_tutorial_seen_v1";
const STRICT_MODE_KEY = "px_arcade_strict_mode_v1";
const LEVEL_COLORS = ["#ff2b2b", "#ff4b1f", "#ff9d00", "#ffd226", "#d4f62d", "#a6ef2e", "#5ed648"];

type Persisted = Record<GameId, { best: number; streak: number }>;
type TutorialSeen = Record<GameId, boolean>;

type SnakeSkin = "neon" | "ember" | "plasma";
type PongSkin = "classic" | "violet" | "gold";
type LanderStyle = "wire" | "cyan" | "sun";
type XOTheme = "holo" | "amber" | "grid";
type MemoryBack = "qmark" | "glyph" | "prism";
type Mark = "X" | "O";
type VariantId = "classic" | "wild" | "misere" | "notakto" | "grid4" | "grid5" | "orderChaos" | "randomTurn";

interface VariantConfig {
  id: VariantId;
  label: string;
  size: number;
  winLength: number;
  misere?: boolean;
  wild?: boolean;
  bothX?: boolean;
  orderChaos?: boolean;
  randomTurn?: boolean;
}

const XO_VARIANTS: VariantConfig[] = [
  { id: "classic", label: "Classic 3x3", size: 3, winLength: 3 },
  { id: "wild", label: "Wild 3x3", size: 3, winLength: 3, wild: true },
  { id: "misere", label: "Misere 3x3", size: 3, winLength: 3, misere: true },
  { id: "notakto", label: "Notakto 3x3", size: 3, winLength: 3, misere: true, bothX: true },
  { id: "grid4", label: "4x4 (4 in row)", size: 4, winLength: 4 },
  { id: "grid5", label: "5x5 (5 in row)", size: 5, winLength: 5 },
  { id: "orderChaos", label: "Order & Chaos", size: 6, winLength: 5, orderChaos: true, wild: true },
  { id: "randomTurn", label: "Random Turn 3x3", size: 3, winLength: 3, randomTurn: true }
];

interface ArcadeInventory {
  coins: number;
  gems: { blue: number; purple: number; gold: number };
  badges: string[];
  trophies: string[];
  titles: string[];
  themesUnlocked: ArcadeTheme[];
  avatarsUnlocked: string[];
  cosmeticsUnlocked: string[];
  equipped: {
    snake: SnakeSkin;
    pong: PongSkin;
    lander: LanderStyle;
    xo: XOTheme;
    memory: MemoryBack;
  };
  lastPlayedDate: string;
  totalWins: number;
  totalPlays: number;
}

interface RewardResult {
  coins: number;
  gems: { blue: number; purple: number; gold: number };
  badgesUnlocked: string[];
  trophiesUnlocked: string[];
  titlesUnlocked: string[];
  notes: string[];
}

function readPersisted(): Persisted {
  if (typeof window === "undefined") {
    return {
      snake: { best: 0, streak: 0 },
      lander: { best: 0, streak: 0 },
      xo: { best: 0, streak: 0 },
      pong: { best: 0, streak: 0 },
      breakout: { best: 0, streak: 0 },
      memory: { best: 0, streak: 0 }
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("missing");
    return JSON.parse(raw) as Persisted;
  } catch {
    return {
      snake: { best: 0, streak: 0 },
      lander: { best: 0, streak: 0 },
      xo: { best: 0, streak: 0 },
      pong: { best: 0, streak: 0 },
      breakout: { best: 0, streak: 0 },
      memory: { best: 0, streak: 0 }
    };
  }
}

function savePersisted(persisted: Persisted) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function defaultInventory(): ArcadeInventory {
  return {
    coins: 0,
    gems: { blue: 0, purple: 0, gold: 0 },
    badges: [],
    trophies: [],
    titles: ["Rookie Pilot"],
    themesUnlocked: ["neon"],
    avatarsUnlocked: ["PX Cadet"],
    cosmeticsUnlocked: [],
    equipped: {
      snake: "neon",
      pong: "classic",
      lander: "wire",
      xo: "holo",
      memory: "qmark"
    },
    lastPlayedDate: "",
    totalWins: 0,
    totalPlays: 0
  };
}

function readInventory(): ArcadeInventory {
  if (typeof window === "undefined") return defaultInventory();
  try {
    const raw = window.localStorage.getItem(REWARDS_KEY);
    if (!raw) throw new Error("missing");
    return { ...defaultInventory(), ...(JSON.parse(raw) as ArcadeInventory) };
  } catch {
    return defaultInventory();
  }
}

function saveInventory(inventory: ArcadeInventory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REWARDS_KEY, JSON.stringify(inventory));
}

function readTutorialSeen(): TutorialSeen {
  if (typeof window === "undefined") {
    return { snake: false, lander: false, xo: false, pong: false, breakout: false, memory: false };
  }
  try {
    const raw = window.localStorage.getItem(TUTORIAL_KEY);
    if (!raw) throw new Error("missing");
    return JSON.parse(raw) as TutorialSeen;
  } catch {
    return { snake: false, lander: false, xo: false, pong: false, breakout: false, memory: false };
  }
}

function saveTutorialSeen(seen: TutorialSeen) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TUTORIAL_KEY, JSON.stringify(seen));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStrictMode() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STRICT_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveStrictMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STRICT_MODE_KEY, enabled ? "1" : "0");
  } catch {
    // no-op
  }
}

function calcRewards(params: {
  game: GameId;
  score: number;
  won: boolean;
  isFirstWin: boolean;
  isHighScore: boolean;
  streak: number;
  stats: ArcadeStats | null;
  inventory: ArcadeInventory;
  strictMode?: boolean;
}): RewardResult {
  const { score, won, isFirstWin, isHighScore, streak, stats, inventory, strictMode = false } = params;
  const result: RewardResult = {
    coins: strictMode ? (won ? Math.max(6, Math.floor(score * 0.18) + 14) : 0) : Math.max(8, Math.floor(score * 0.25) + (won ? 28 : 6)),
    gems: { blue: won && (!strictMode || score >= 80) ? 1 : 0, purple: 0, gold: 0 },
    badgesUnlocked: [],
    trophiesUnlocked: [],
    titlesUnlocked: [],
    notes: []
  };

  if (isFirstWin) {
    result.coins += strictMode ? 30 : 50;
    if (!strictMode || score >= 100) result.gems.purple += 1;
    result.badgesUnlocked.push("First Win");
  }
  if (isHighScore && (!strictMode || score >= 120)) {
    result.coins += 30;
    if (!strictMode || score >= 180) result.gems.gold += 1;
    result.trophiesUnlocked.push("High Score Trophy");
    result.notes.push("High Score");
  }
  if (won && streak >= (strictMode ? 5 : 3)) {
    result.coins += 24;
    if (!strictMode || score >= 140) result.gems.purple += 1;
    result.badgesUnlocked.push(strictMode ? "Streak x5" : "Streak x3");
  }
  if (won && inventory.lastPlayedDate !== todayKey()) {
    result.coins += strictMode ? 12 : 18;
    if (!strictMode || score >= 90) result.gems.blue += 1;
    result.notes.push("Daily Play");
  }
  if (stats && won && stats.level >= (strictMode ? 4 : 3)) {
    result.coins += 16;
    result.badgesUnlocked.push("Level Clear");
  }
  if (stats && won && stats.lives >= 3) {
    result.coins += strictMode ? 14 : 20;
    if (!strictMode || score >= 160) result.gems.purple += 1;
    result.badgesUnlocked.push("Perfect Round");
  }
  if (stats && stats.score >= (strictMode ? 260 : 180)) {
    result.coins += 22;
    result.notes.push("Survival Milestone");
  }
  if (won && score >= (strictMode ? 320 : 220)) {
    result.titlesUnlocked.push("Arcade Ace");
  }
  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setIsTouch(media.matches || navigator.maxTouchPoints > 0);
    };
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isTouch;
}

function useViewportWidth() {
  const [width, setWidth] = useState(1280);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setWidth(window.innerWidth || 1280);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return width;
}

function useAnimationFrame(loop: (dt: number) => void, enabled: boolean) {
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const tick = (t: number) => {
      if (!prevRef.current) prevRef.current = t;
      const dt = Math.min(0.05, (t - prevRef.current) / 1000);
      prevRef.current = t;
      loop(dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      prevRef.current = 0;
    };
  }, [enabled, loop]);
}

function SnakeGame({
  onFinish,
  enabled,
  theme,
  snakeSkin
}: {
  onFinish: (score: number, won: boolean) => void;
  enabled: boolean;
  theme: ArcadeTheme;
  snakeSkin: SnakeSkin;
}) {
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 1, over: false });
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const snakeRef = useRef<Array<{ x: number; y: number }>>([
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 }
  ]);
  const foodRef = useRef({ x: 14, y: 8 });
  const tickRef = useRef(0);
  const foodPulseRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [eatPopup, setEatPopup] = useState<{ x: number; y: number; id: number } | null>(null);
  const hasMovedRef = useRef(false);
  const cell = 16;
  useResizeCanvas(containerRef, canvasRef);

  const setDirection = useCallback((x: number, y: number) => {
    const current = dirRef.current;
    if (current.x === -x && current.y === -y) return;
    nextDirRef.current = { x, y };
    hasMovedRef.current = true;
  }, []);

  const palette =
    snakeSkin === "ember"
      ? { bgA: "#f7b65a", bgB: "#ed9e3e", wall: "#7c2d12", head: "#fb923c", body: "#f97316", food: "#ef4444", eye: "#431407" }
      : snakeSkin === "plasma"
        ? { bgA: "#b8dd60", bgB: "#a5d24d", wall: "#365314", head: "#60a5fa", body: "#3b82f6", food: "#ef4444", eye: "#1e3a8a" }
        : theme === "toxic"
          ? { bgA: "#9ed34f", bgB: "#8ec742", wall: "#3f7d2f", head: "#a3e635", body: "#84cc16", food: "#ef4444", eye: "#1a2e05" }
          : theme === "sunset"
            ? { bgA: "#f0ca63", bgB: "#e8bd4f", wall: "#8a4a1f", head: "#fb7185", body: "#f97316", food: "#ef4444", eye: "#4a2213" }
            : { bgA: "#a6d756", bgB: "#9ccc4a", wall: "#3f7d2f", head: "#5b83f6", body: "#4b76ea", food: "#ef4444", eye: "#1e3a8a" };

  const reset = () => {
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    snakeRef.current = [
      { x: 7, y: 10 },
      { x: 6, y: 10 },
      { x: 5, y: 10 }
    ];
    foodRef.current = { x: 14, y: 8 };
    tickRef.current = 0;
    hasMovedRef.current = false;
    setStats({ score: 0, level: 1, lives: 1, over: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        setDirection(0, -1);
      }
      if (key === "arrowdown" || key === "s") {
        setDirection(0, 1);
      }
      if (key === "arrowleft" || key === "a") {
        setDirection(-1, 0);
      }
      if (key === "arrowright" || key === "d") {
        setDirection(1, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDirection]);

  useAnimationFrame(
    (dt) => {
      if (stats.over) return;
      tickRef.current += dt;
      const speed = Math.max(0.06, 0.14 - (stats.level - 1) * 0.01);
      if (tickRef.current < speed) return;
      tickRef.current = 0;

      const nd = nextDirRef.current;
      const cd = dirRef.current;
      if (!(nd.x === -cd.x && nd.y === -cd.y)) {
        dirRef.current = nd;
      }

      const head = snakeRef.current[0];
      const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
      if (newHead.x < 0 || newHead.y < 0 || newHead.x >= 24 || newHead.y >= 24) {
        setStats((s) => ({ ...s, over: true }));
        onFinish(stats.score, false);
        return;
      }

      if (snakeRef.current.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        setStats((s) => ({ ...s, over: true }));
        onFinish(stats.score, false);
        return;
      }

      snakeRef.current = [newHead, ...snakeRef.current];
      const ate = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
      if (!ate) {
        snakeRef.current.pop();
      } else {
        const score = stats.score + 10;
        const level = Math.min(9, 1 + Math.floor(score / 60));
        setStats((s) => ({ ...s, score, level }));
        setEatPopup({ x: foodRef.current.x * cell + 8, y: foodRef.current.y * cell + 8, id: Date.now() });
        window.setTimeout(() => setEatPopup(null), 420);
        foodRef.current = { x: Math.floor(Math.random() * 24), y: Math.floor(Math.random() * 24) };
      }
      foodPulseRef.current += dt * 4;
    },
    enabled
  );

  useAnimationFrame(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const boardW = 384;
      const boardH = 384;
      const scale = Math.min(canvas.width / boardW, canvas.height / boardH) || 1;
      const offsetX = (canvas.width - boardW * scale) / 2;
      const offsetY = (canvas.height - boardH * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx.fillStyle = palette.bgA;
      ctx.fillRect(0, 0, boardW, boardH);
      for (let y = 0; y < 24; y += 1) {
        for (let x = 0; x < 24; x += 1) {
          ctx.fillStyle = (x + y) % 2 === 0 ? palette.bgA : palette.bgB;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }

      ctx.fillStyle = palette.wall;
      ctx.fillRect(0, 0, 8, boardH);
      ctx.fillRect(boardW - 8, 0, 8, boardH);

      const radius = 6.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = snakeRef.current.length - 1; i >= 1; i -= 1) {
        const a = snakeRef.current[i];
        const b = snakeRef.current[i - 1];
        const ax = a.x * cell + 8;
        const ay = a.y * cell + 8;
        const bx = b.x * cell + 8;
        const by = b.y * cell + 8;
        ctx.strokeStyle = palette.body;
        ctx.lineWidth = radius * 2;
        ctx.shadowColor = "rgba(37,99,235,0.45)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      snakeRef.current.forEach((seg, idx) => {
        const cx = seg.x * cell + 8;
        const cy = seg.y * cell + 8;
        ctx.fillStyle = idx === 0 ? palette.head : palette.body;
        ctx.beginPath();
        ctx.arc(cx, cy, idx === 0 ? 7 : 6.3, 0, Math.PI * 2);
        ctx.fill();
      });

      const head = snakeRef.current[0];
      const hx = head.x * cell + 8;
      const hy = head.y * cell + 8;
      const dir = dirRef.current;
      const eyeShiftX = dir.x === 1 ? 2.5 : dir.x === -1 ? -2.5 : 0;
      const eyeShiftY = dir.y === 1 ? 2.5 : dir.y === -1 ? -2.5 : 0;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hx - 3 + eyeShiftX, hy - 3 + eyeShiftY, 3.2, 0, Math.PI * 2);
      ctx.arc(hx + 3 + eyeShiftX, hy - 3 + eyeShiftY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.eye;
      ctx.beginPath();
      ctx.arc(hx - 2.2 + eyeShiftX, hy - 2.6 + eyeShiftY, 1.4, 0, Math.PI * 2);
      ctx.arc(hx + 3.6 + eyeShiftX, hy - 2.6 + eyeShiftY, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.arc(hx - 1.7, hy + 0.6, 0.8, 0, Math.PI * 2);
      ctx.arc(hx + 1.7, hy + 0.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      const pulse = 1 + Math.sin(foodPulseRef.current) * 0.16;
      ctx.fillStyle = palette.food;
      ctx.beginPath();
      ctx.arc(foodRef.current.x * cell + 8, foodRef.current.y * cell + 8, 5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(foodRef.current.x * cell + 6.2, foodRef.current.y * cell + 6.4, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#365314";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(foodRef.current.x * cell + 8, foodRef.current.y * cell + 3);
      ctx.lineTo(foodRef.current.x * cell + 8, foodRef.current.y * cell + 0.8);
      ctx.stroke();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.ellipse(foodRef.current.x * cell + 10.6, foodRef.current.y * cell + 1.8, 2.6, 1.4, -0.4, 0, Math.PI * 2);
      ctx.fill();

      if (eatPopup) {
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.font = 'bold 13px "IBM Plex Mono", monospace';
        ctx.fillText("+10", eatPopup.x - 8, eatPopup.y - 12);
      }

      if (!hasMovedRef.current && !stats.over) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(136, 52, 112, 92);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = 'bold 12px "IBM Plex Mono", monospace';
        ctx.fillText("ARROWS", 163, 76);
        ctx.fillText("TO MOVE", 165, 92);
        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.fillText("WASD also works", 147, 117);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    enabled
  );

  return {
    stats,
    setStats,
    reset,
    canvas: (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="flex-1 relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            const start = touchStartRef.current;
            if (!touch || !start) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              setDirection(dx > 0 ? 1 : -1, 0);
            } else {
              setDirection(0, dy > 0 ? 1 : -1);
            }
          }}
        />
        </div>
        {isTouch ? (
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-2 bg-black/40 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:gap-3 sm:p-3">
            <span />
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100" onClick={() => setDirection(0, -1)}>Up</button>
            <span />
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100" onClick={() => setDirection(-1, 0)}>Left</button>
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100" onClick={() => setDirection(0, 1)}>Down</button>
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100" onClick={() => setDirection(1, 0)}>Right</button>
          </div>
        ) : null}
      </div>
    )
  };
}

function LanderGame({
  onFinish,
  enabled,
  timeScale,
  loopMode
}: {
  onFinish: (score: number, won: boolean) => void;
  enabled: boolean;
  timeScale: number;
  loopMode: boolean;
}) {
  const isTouch = useIsTouchDevice();
  const LANDER_RULES = {
    maxVerticalSpeed: 22,
    maxHorizontalSpeed: 14,
    maxTiltRad: 0.26
  };
  const width = isTouch ? 900 : 1400;
  const height = isTouch ? 1250 : 700;
  const worldWidth = width * 4;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 3, over: false });
  const shipRef = useRef({ x: 380, y: 170, vx: 0, vy: 0, angle: 0 });
  const keysRef = useRef({ left: false, right: false, up: false });
  const fuelRef = useRef(266);
  const elapsedRef = useRef(0);
  const cameraXRef = useRef(0);
  const thrustParticles = useRef<Array<{ x: number; y: number; vx: number; vy: number; ttl: number }>>([]);
  const crashRef = useRef<{ x: number; y: number; ttl: number } | null>(null);
  const starsRef = useRef<Array<{ x: number; y: number; a: number }>>(
    Array.from({ length: 36 }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * (height * 0.78),
      a: 0.32 + Math.random() * 0.6
    }))
  );
  const terrainRef = useRef<Array<{ x: number; y: number }>>([]);
  const padRef = useRef({ x: 740, w: 110, y: 620 });
  const spawnXRef = useRef(380);
  useResizeCanvas(containerRef, canvasRef);

  useEffect(() => {
    const chunk = [
      0.96, 0.96, 0.96, 0.97, 0.97, 0.96, 0.92, 0.86, 0.83, 0.78, 0.78, 0.79, 0.78, 0.73, 0.70, 0.69,
      0.70, 0.82, 0.84, 0.86, 0.85, 0.82, 0.79, 0.76, 0.75, 0.74, 0.73, 0.73, 0.74, 0.77, 0.80, 0.79,
      0.81, 0.83, 0.84, 0.92, 0.93, 0.93, 0.91, 0.87, 0.85, 0.82, 0.82, 0.81, 0.78, 0.74, 0.73, 0.70,
      0.69, 0.67, 0.65, 0.65, 0.66, 0.69, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.88, 0.91
    ];
    const step = worldWidth / 420;
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 420; i += 1) {
      const t = chunk[i % chunk.length];
      points.push({ x: i * step, y: Math.round(t * height) });
    }
    const flatStart = Math.floor(points.length * 0.47);
    const flatWidth = 12;
    const flatY = Math.round(0.9 * height);
    for (let i = flatStart; i < flatStart + flatWidth; i += 1) {
      points[i].y = flatY;
    }
    terrainRef.current = points;
    padRef.current = { x: points[flatStart].x, w: points[flatStart + flatWidth - 1].x - points[flatStart].x, y: flatY };
    spawnXRef.current = Math.max(120, padRef.current.x - 520);
  }, [height, worldWidth]);

  const getTerrainYAt = (x: number) => {
    const points = terrainRef.current;
    if (points.length < 2) return padRef.current.y;
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / (b.x - a.x || 1);
        return a.y + (b.y - a.y) * t;
      }
    }
    return padRef.current.y;
  };

  const reset = () => {
    setStats({ score: 0, level: 1, lives: 3, over: false });
    shipRef.current = { x: spawnXRef.current, y: 170, vx: 0, vy: 0, angle: 0 };
    keysRef.current = { left: false, right: false, up: false };
    fuelRef.current = 273;
    elapsedRef.current = 0;
    cameraXRef.current = clamp(shipRef.current.x - width / 2, 0, Math.max(0, worldWidth - width));
  };

  const setControl = useCallback((key: "left" | "right" | "up", pressed: boolean) => {
    keysRef.current[key] = pressed;
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") setControl("left", true);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") setControl("right", true);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") setControl("up", true);
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") setControl("left", false);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") setControl("right", false);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") setControl("up", false);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [setControl]);

  useAnimationFrame(
    (dt) => {
      if (stats.over) return;
      const step = dt * timeScale;
      const s = shipRef.current;
      elapsedRef.current += step;
      if (keysRef.current.left) s.angle -= 2.2 * step;
      if (keysRef.current.right) s.angle += 2.2 * step;
      if (keysRef.current.up && fuelRef.current > 0) {
        s.vx += Math.sin(s.angle) * 84 * step;
        s.vy -= Math.cos(s.angle) * 84 * step;
        fuelRef.current = Math.max(0, fuelRef.current - 24 * step);
        thrustParticles.current.push({
          x: s.x - Math.sin(s.angle) * 10,
          y: s.y + Math.cos(s.angle) * 10,
          vx: (Math.random() - 0.5) * 18,
          vy: 20 + Math.random() * 26,
          ttl: 0.32
        });
      }
      s.vy += 34 * step;
      s.x += s.vx * step;
      s.y += s.vy * step;

      if (s.x < 12) s.x = 12;
      if (s.x > worldWidth - 12) s.x = worldWidth - 12;

      const terrainY = getTerrainYAt(s.x);
      if (s.y >= terrainY - 4) {
        const inPad = s.x > padRef.current.x && s.x < padRef.current.x + padRef.current.w;
        const soft =
          Math.abs(s.vy) <= LANDER_RULES.maxVerticalSpeed &&
          Math.abs(s.vx) <= LANDER_RULES.maxHorizontalSpeed &&
          Math.abs(s.angle) <= LANDER_RULES.maxTiltRad;
        if (inPad && soft) {
          const bonus = Math.max(0, Math.round(fuelRef.current));
          if (loopMode) {
            setStats((prev) => ({
              ...prev,
              score: prev.score + 120 + bonus,
              level: prev.level + 1
            }));
            shipRef.current = { x: spawnXRef.current, y: 170, vx: 0, vy: 0, angle: 0 };
            fuelRef.current = Math.min(999, fuelRef.current + 60);
          } else {
            const score = stats.score + 120 + bonus;
            setStats((prev) => ({ ...prev, score, over: true, won: true }));
            onFinish(score, true);
          }
          return;
        }

        const lives = stats.lives - 1;
        if (lives <= 0) {
          crashRef.current = { x: s.x, y: s.y, ttl: 0.75 };
          setStats((prev) => ({ ...prev, over: true, lives: 0 }));
          onFinish(stats.score, false);
          return;
        }
        crashRef.current = { x: s.x, y: s.y, ttl: 0.55 };
        setStats((prev) => ({ ...prev, lives }));
        shipRef.current = { x: spawnXRef.current, y: 170, vx: 0, vy: 0, angle: 0 };
        fuelRef.current = Math.max(80, fuelRef.current - 30);
      }

      thrustParticles.current = thrustParticles.current
        .map((p) => ({ ...p, x: p.x + p.vx * step, y: p.y + p.vy * step, ttl: p.ttl - step }))
        .filter((p) => p.ttl > 0);
      if (crashRef.current) {
        crashRef.current.ttl -= step;
        if (crashRef.current.ttl <= 0) crashRef.current = null;
      }

      cameraXRef.current = clamp(shipRef.current.x - width * 0.5, 0, Math.max(0, worldWidth - width));
    },
    enabled
  );

  useAnimationFrame(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.min(canvas.width / width, canvas.height / height) || 1;
      const offsetX = (canvas.width - width * scale) / 2;
      const offsetY = (canvas.height - height * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      const camX = cameraXRef.current;
      const terrainTint = "rgba(255,255,255,0.58)";
      const padTint = "#ffffff";
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#3b2715";
      ctx.fillRect(0, 0, width, 10);

      starsRef.current.forEach((star) => {
        const sx = star.x - camX;
        if (sx < -2 || sx > width + 2) return;
        ctx.globalAlpha = star.a;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, star.y, 1.6, 1.6);
      });
      ctx.globalAlpha = 1;

      ctx.strokeStyle = terrainTint;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      terrainRef.current.forEach((point, idx) => {
        const px = point.x - camX;
        if (idx === 0) ctx.moveTo(px, point.y);
        else ctx.lineTo(px, point.y);
      });
      ctx.stroke();

      ctx.strokeStyle = padTint;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(padRef.current.x - camX, padRef.current.y);
      ctx.lineTo(padRef.current.x + padRef.current.w - camX, padRef.current.y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(padRef.current.x - camX, padRef.current.y - 2, padRef.current.w, 4);

      const s = shipRef.current;
      const shipColor = "#ffffff";
      const flameColor = "#ffffff";
      ctx.save();
      ctx.translate(s.x - camX, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = shipColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 5);
      ctx.lineTo(3.5, 6.2);
      ctx.lineTo(-3.5, 6.2);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4.5, 6.1);
      ctx.lineTo(-8.5, 9.5);
      ctx.moveTo(4.5, 6.1);
      ctx.lineTo(8.5, 9.5);
      ctx.stroke();

      if (keysRef.current.up && fuelRef.current > 0) {
        ctx.strokeStyle = flameColor;
        ctx.beginPath();
        ctx.moveTo(-2.5, 6.2);
        ctx.lineTo(0, 11 + Math.random() * 4);
        ctx.lineTo(2.5, 6.2);
        ctx.stroke();
      }
      ctx.restore();

      thrustParticles.current.forEach((p) => {
        ctx.globalAlpha = p.ttl * 2.8;
        ctx.fillStyle = flameColor;
        ctx.fillRect(p.x - camX, p.y, 2, 2);
      });
      ctx.globalAlpha = 1;

      if (crashRef.current) {
        ctx.fillStyle = `rgba(248,113,113,${Math.max(0, crashRef.current.ttl)})`;
        ctx.beginPath();
        ctx.arc(crashRef.current.x - camX, crashRef.current.y, 20 * (1 - crashRef.current.ttl + 0.25), 0, Math.PI * 2);
        ctx.fill();
      }

      const altitude = Math.max(0, Math.round(getTerrainYAt(s.x) - s.y));
      const hSpeed = String(Math.round(Math.abs(s.vx))).padStart(2, "0");
      const vSpeed = String(Math.round(Math.abs(s.vy))).padStart(2, "0");
      const time = Math.floor(elapsedRef.current);
      const min = String(Math.floor(time / 60)).padStart(2, "0");
      const sec = String(time % 60).padStart(2, "0");

      ctx.fillStyle = "#ffffff";
      ctx.font = '46px "IBM Plex Mono", "Consolas", "Menlo", monospace';
      ctx.textBaseline = "top";
      ctx.fillText(`SCORE ${String(stats.score).padStart(4, "0")}`, 44, 62);
      ctx.fillText(`TIME  ${min}:${sec}`, 44, 106);
      ctx.fillText(`FUEL  ${String(Math.round(fuelRef.current)).padStart(4, "0")}`, 44, 150);

      ctx.fillText(`ALTITUDE         ${String(altitude).padStart(4, "0")}`, width - 600, 62);
      ctx.fillText(`HORIZONTAL SPEED ${hSpeed}`, width - 600, 106);
      ctx.fillText(`VERTICAL SPEED   ${vSpeed}`, width - 600, 150);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    enabled
  );

  return {
    stats,
    setStats,
    reset,
    canvas: (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="flex-1 relative h-full w-full">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-none touch-none" />
        </div>
        {isTouch ? (
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-2 bg-black/40 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:p-3">
            <button
              type="button"
              className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100"
              onTouchStart={() => setControl("left", true)}
              onTouchEnd={() => setControl("left", false)}
              onTouchCancel={() => setControl("left", false)}
              onMouseDown={() => setControl("left", true)}
              onMouseUp={() => setControl("left", false)}
              onMouseLeave={() => setControl("left", false)}
            >
              Rotate Left
            </button>
            <button
              type="button"
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 py-3 text-cyan-100"
              onTouchStart={() => setControl("up", true)}
              onTouchEnd={() => setControl("up", false)}
              onTouchCancel={() => setControl("up", false)}
              onMouseDown={() => setControl("up", true)}
              onMouseUp={() => setControl("up", false)}
              onMouseLeave={() => setControl("up", false)}
            >
              Thrust
            </button>
            <button
              type="button"
              className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-3 text-cyan-100"
              onTouchStart={() => setControl("right", true)}
              onTouchEnd={() => setControl("right", false)}
              onTouchCancel={() => setControl("right", false)}
              onMouseDown={() => setControl("right", true)}
              onMouseUp={() => setControl("right", false)}
              onMouseLeave={() => setControl("right", false)}
            >
              Rotate Right
            </button>
          </div>
        ) : null}
      </div>
    )
  };
}

function XOGame({
  onFinish,
  enabled,
  xoTheme,
  theme
}: {
  onFinish: (score: number, won: boolean) => void;
  enabled: boolean;
  xoTheme: XOTheme;
  theme: ArcadeTheme;
}) {
  const isTouch = useIsTouchDevice();
  const viewportWidth = useViewportWidth();
  const [variantId, setVariantId] = useState<VariantId>("classic");
  const variant = useMemo(() => XO_VARIANTS.find((v) => v.id === variantId) ?? XO_VARIANTS[0], [variantId]);
  const [selectedWildMark, setSelectedWildMark] = useState<Mark>("X");
  const [statusText, setStatusText] = useState("Your turn");
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 1, over: false });
  const [board, setBoard] = useState<Array<Mark | null>>(Array(9).fill(null));
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  const lines = useMemo(() => {
    const out: number[][] = [];
    const n = variant.size;
    const k = variant.winLength;
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        for (const [dr, dc] of dirs) {
          const rr = r + (k - 1) * dr;
          const cc = c + (k - 1) * dc;
          if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
          const seq: number[] = [];
          for (let step = 0; step < k; step += 1) {
            seq.push((r + step * dr) * n + (c + step * dc));
          }
          out.push(seq);
        }
      }
    }
    return out;
  }, [variant.size, variant.winLength]);

  useEffect(() => {
    setBoard(Array(variant.size * variant.size).fill(null));
    setStats((prev) => ({ ...prev, score: 0, over: false, won: undefined }));
    setStatusText("Your turn");
    setWinLine(null);
    setLastClicked(null);
  }, [variant.id, variant.size]);

  const reset = () => {
    setBoard(Array(variant.size * variant.size).fill(null));
    setStats((prev) => ({ ...prev, score: 0, over: false, won: undefined }));
    setStatusText("Your turn");
    setWinLine(null);
    setLastClicked(null);
  };

  useEffect(() => {
    if (!enabled || !stats.over) return;
    const id = window.setTimeout(() => {
      setBoard(Array(variant.size * variant.size).fill(null));
      setStats((prev) => ({ ...prev, score: 0, over: false, won: undefined }));
      setStatusText(`Level ${stats.level} - new round`);
      setWinLine(null);
      setLastClicked(null);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [enabled, stats.over, stats.level, variant.size]);

  const hasAnyLine = (candidate: Array<Mark | null>) => {
    for (const line of lines) {
      const first = candidate[line[0]];
      if (!first) continue;
      let ok = true;
      for (let i = 1; i < line.length; i += 1) {
        if (candidate[line[i]] !== first) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  };

  const getWinningLine = (candidate: Array<Mark | null>) => {
    for (const line of lines) {
      const first = candidate[line[0]];
      if (!first) continue;
      let ok = true;
      for (let i = 1; i < line.length; i += 1) {
        if (candidate[line[i]] !== first) {
          ok = false;
          break;
        }
      }
      if (ok) return line;
    }
    return null;
  };

  const findWinningMove = (candidate: Array<Mark | null>, mark: Mark) => {
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      const copy = [...candidate];
      copy[i] = mark;
      if (hasAnyLine(copy)) return i;
    }
    return -1;
  };

  const heuristicMove = (candidate: Array<Mark | null>, mark: Mark) => {
    let bestIdx = -1;
    let bestScore = -1;
    const enemy: Mark = mark === "X" ? "O" : "X";
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      const copy = [...candidate];
      copy[i] = mark;
      let score = 0;
      for (const line of lines) {
        let mine = 0;
        let foe = 0;
        let empty = 0;
        for (const p of line) {
          const v = copy[p];
          if (v === mark) mine += 1;
          else if (v === enemy) foe += 1;
          else empty += 1;
        }
        if (foe === 0) score += mine * mine;
        if (mine === 0) score += empty > 0 ? 1 : 0;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const minimax3x3 = (candidate: Array<Mark | null>, aiMark: Mark, playerMark: Mark, maximizing: boolean): number => {
    if (hasAnyLine(candidate)) return maximizing ? -10 : 10;
    if (!candidate.includes(null)) return 0;
    if (maximizing) {
      let best = -Infinity;
      for (let i = 0; i < candidate.length; i += 1) {
        if (candidate[i] !== null) continue;
        candidate[i] = aiMark;
        best = Math.max(best, minimax3x3(candidate, aiMark, playerMark, false));
        candidate[i] = null;
      }
      return best;
    }
    let best = Infinity;
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      candidate[i] = playerMark;
      best = Math.min(best, minimax3x3(candidate, aiMark, playerMark, true));
      candidate[i] = null;
    }
    return best;
  };

  const pickAiMove = (candidate: Array<Mark | null>, level: number) => {
    const empties = candidate.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
    if (empties.length === 0) return { idx: -1, mark: "O" as Mark };

    const aiMarks: Mark[] = variant.bothX ? ["X"] : variant.wild || variant.orderChaos ? ["X", "O"] : ["O"];
    const playerMark: Mark = variant.bothX ? "X" : "X";
    const randomPick = () => ({ idx: empties[Math.floor(Math.random() * empties.length)], mark: aiMarks[0] });

    if (variant.orderChaos) {
      const safeMoves: Array<{ idx: number; mark: Mark }> = [];
      for (const idx of empties) {
        for (const mark of aiMarks) {
          const copy = [...candidate];
          copy[idx] = mark;
          if (!hasAnyLine(copy)) safeMoves.push({ idx, mark });
        }
      }
      if (safeMoves.length > 0) return safeMoves[Math.floor(Math.random() * safeMoves.length)];
      return { idx: empties[0], mark: aiMarks[Math.floor(Math.random() * aiMarks.length)] };
    }

    if (level <= 1) return randomPick();

    for (const mark of aiMarks) {
      const winIdx = findWinningMove(candidate, mark);
      if (winIdx >= 0) return { idx: winIdx, mark };
    }

    if (level >= 2) {
      const blockIdx = findWinningMove(candidate, playerMark);
      if (blockIdx >= 0) return { idx: blockIdx, mark: aiMarks[0] };
    }

    if (level >= 3) {
      const center = Math.floor(candidate.length / 2);
      if (candidate[center] === null) return { idx: center, mark: aiMarks[0] };
    }

    if (level >= 5 && variant.size === 3 && !variant.wild && !variant.bothX && !variant.misere) {
      let bestScore = -Infinity;
      let bestMove = empties[0];
      for (const idx of empties) {
        candidate[idx] = "O";
        const score = minimax3x3(candidate, "O", "X", false);
        candidate[idx] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = idx;
        }
      }
      return { idx: bestMove, mark: "O" as Mark };
    }

    const bestHeuristic = heuristicMove(candidate, aiMarks[0]);
    if (bestHeuristic >= 0) return { idx: bestHeuristic, mark: aiMarks[0] };
    return randomPick();
  };

  const finishRound = (won: boolean, baseScore: number, nextLevel: number, message: string) => {
    setStats((prev) => ({ ...prev, score: baseScore, over: true, won, level: nextLevel }));
    setStatusText(message);
    onFinish(baseScore, won);
  };

  const resolveAfterMove = (candidate: Array<Mark | null>, by: "user" | "ai", level: number) => {
    const winningLine = getWinningLine(candidate);
    const line = Boolean(winningLine);
    const full = !candidate.includes(null);
    if (!line && !full) return false;

    if (variant.orderChaos) {
      if (line) {
        const score = 140 + level * 8;
        finishRound(true, score, Math.min(10, level + 1), "Order completed 5-in-a-row");
        return true;
      }
      const score = 20;
      finishRound(false, score, Math.max(1, level - 1), "Chaos blocked all lines");
      return true;
    }

    if (line) {
      setWinLine(winningLine);
      if (variant.misere) {
        const userWon = by === "ai";
        const score = userWon ? 130 : 25;
        finishRound(userWon, score, userWon ? Math.min(10, level + 1) : Math.max(1, level - 1), userWon ? "You forced the trap" : "Line formed - misere loss");
        return true;
      }
      const userWon = by === "user";
      const score = userWon ? 120 + level * 10 : 20;
      finishRound(userWon, score, userWon ? Math.min(10, level + 1) : Math.max(1, level - 1), userWon ? "Round won" : "AI wins");
      return true;
    }

    finishRound(false, 55, level, "Draw");
    return true;
  };

  const clickCell = (idx: number) => {
    if (!enabled || stats.over || board[idx] !== null) return;
    setLastClicked(idx);
    const userMark: Mark = variant.bothX ? "X" : variant.wild || variant.orderChaos ? selectedWildMark : "X";
    const first = [...board];
    first[idx] = userMark;
    setBoard(first);
    if (resolveAfterMove(first, "user", stats.level)) return;

    if (variant.randomTurn && Math.random() < 0.4) {
      setStatusText("Random turn: you play again");
      return;
    }

    const ai = pickAiMove(first, stats.level);
    if (ai.idx < 0) {
      resolveAfterMove(first, "ai", stats.level);
      return;
    }
    const second = [...first];
    second[ai.idx] = ai.mark;
    setBoard(second);
    if (resolveAfterMove(second, "ai", stats.level)) return;
    setStatusText(`AI level ${stats.level} adapting...`);
  };

  const targetCell = isTouch
    ? variant.size <= 3
      ? 104
      : variant.size === 4
        ? 80
        : 64
    : variant.size <= 3
      ? 94
      : variant.size === 4
        ? 72
        : 58;
  const boardMaxWidth = Math.min(isTouch ? viewportWidth - 40 : viewportWidth - 140, isTouch ? 460 : 680);
  const computedCell = Math.floor((boardMaxWidth - (variant.size - 1) * 8 - 18) / variant.size);
  const minCell = variant.size <= 3 ? 54 : variant.size === 4 ? 46 : 40;
  const cellSize = clamp(computedCell, minCell, targetCell);
  const boardWidth = variant.size * cellSize + (variant.size - 1) * 8 + 18;

  const toneAccent = theme === "toxic" ? "lime" : theme === "sunset" ? "amber" : "cyan";
  const boardClass =
    xoTheme === "amber"
      ? "border-amber-300/40 bg-amber-950/65"
      : xoTheme === "grid"
        ? "border-violet-300/35 bg-violet-950/65"
        : toneAccent === "lime"
          ? "border-lime-300/25 bg-slate-950/65"
          : toneAccent === "amber"
            ? "border-amber-300/25 bg-slate-950/65"
            : "border-cyan-300/25 bg-slate-950/65";
  const cellClass =
    xoTheme === "amber"
      ? "border-amber-300/45 bg-amber-900/50 text-amber-100 hover:bg-amber-400/15"
      : xoTheme === "grid"
        ? "border-violet-300/40 bg-violet-900/50 text-violet-100 hover:bg-violet-400/15"
        : toneAccent === "lime"
          ? "border-lime-300/35 bg-slate-900/60 text-lime-100 hover:bg-lime-400/10"
          : toneAccent === "amber"
            ? "border-amber-300/35 bg-slate-900/60 text-amber-100 hover:bg-amber-400/10"
            : "border-cyan-300/35 bg-slate-900/60 text-cyan-100 hover:bg-cyan-400/10";

  const renderMark = (cell: Mark | null) => {
    if (cell === "X") {
      return (
        <span className="relative block h-8 w-8">
          <span className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current shadow-[0_0_10px_currentColor]" />
          <span className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current shadow-[0_0_10px_currentColor]" />
        </span>
      );
    }
    if (cell === "O") {
      return <span className="block h-8 w-8 rounded-full border-[3px] border-current shadow-[0_0_10px_currentColor]" />;
    }
    return null;
  };

  const lineOverlay = (() => {
    if (!winLine || winLine.length < 2) return null;
    const first = winLine[0];
    const last = winLine[winLine.length - 1];
    const n = variant.size;
    const rowA = Math.floor(first / n);
    const colA = first % n;
    const rowB = Math.floor(last / n);
    const colB = last % n;
    const x1 = colA * (cellSize + 8) + cellSize / 2 + 9;
    const y1 = rowA * (cellSize + 8) + cellSize / 2 + 9;
    const x2 = colB * (cellSize + 8) + cellSize / 2 + 9;
    const y2 = rowB * (cellSize + 8) + cellSize / 2 + 9;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return (
      <div
        className="pointer-events-none absolute left-0 top-0 origin-left animate-pulse rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.8)]"
        style={{ width: len, height: 4, transform: `translate(${x1}px, ${y1}px) rotate(${angle}deg)` }}
      />
    );
  })();

  const view = (
    <div className="space-y-3 p-2 sm:p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {XO_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariantId(v.id)}
            className={`rounded-lg border px-2.5 py-1 text-xs uppercase tracking-[0.08em] transition ${
              variant.id === v.id ? "border-cyan-200/60 bg-cyan-300/20 text-cyan-50" : "border-slate-500/40 bg-slate-900/55 text-slate-200 hover:border-cyan-300/40"
            }`}
          >
            {v.label}
          </button>
        ))}
        {variant.wild ? (
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-500/40 bg-slate-900/45 p-1">
            <button
              type="button"
              onClick={() => setSelectedWildMark("X")}
              className={`rounded px-2 py-0.5 text-xs ${selectedWildMark === "X" ? "bg-cyan-300/20 text-cyan-50" : "text-slate-300"}`}
            >
              Place X
            </button>
            <button
              type="button"
              onClick={() => setSelectedWildMark("O")}
              className={`rounded px-2 py-0.5 text-xs ${selectedWildMark === "O" ? "bg-cyan-300/20 text-cyan-50" : "text-slate-300"}`}
            >
              Place O
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-xs uppercase tracking-[0.08em] text-cyan-100/80">{statusText}</p>

      <div className="overflow-x-auto">
      <div className={`relative mx-auto rounded-xl border p-2 ${boardClass}`} style={{ width: boardWidth, maxWidth: "96vw" }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${variant.size}, minmax(0, 1fr))` }}>
          {board.map((cell, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => clickCell(idx)}
              className={`grid place-items-center rounded-xl border font-semibold transition ${cellClass} ${lastClicked === idx ? "scale-[0.98]" : ""}`}
              style={{ height: cellSize, width: cellSize, fontSize: variant.size <= 3 ? 32 : variant.size === 4 ? 26 : 20 }}
            >
              {renderMark(cell)}
            </button>
          ))}
        </div>
        {lineOverlay}
      </div>
      </div>
    </div>
  );

  return { stats, setStats, reset, view };
}

function PongGame({
  onFinish,
  enabled,
  paddleSkin,
  theme
}: {
  onFinish: (score: number, won: boolean) => void;
  enabled: boolean;
  paddleSkin: PongSkin;
  theme: ArcadeTheme;
}) {
  const isTouch = useIsTouchDevice();
  const ARENA_W = 400;
  const ARENA_H = isTouch ? 640 : 400;
  const PADDLE_H = 60;
  const PADDLE_X = 10;
  const PADDLE_W = 8;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 3, over: false });
  const playerY = useRef((ARENA_H - PADDLE_H) / 2);
  const aiY = useRef((ARENA_H - PADDLE_H) / 2);
  const ball = useRef({ x: ARENA_W / 2, y: ARENA_H / 2, vx: 180, vy: 120 });
  const lastEnabledRef = useRef(false);
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const [impactFlash, setImpactFlash] = useState(0);
  const [shake, setShake] = useState(0);
  useResizeCanvas(containerRef, canvasRef);

  const reset = useCallback(() => {
    setStats({ score: 0, level: 1, lives: 3, over: false });
    playerY.current = (ARENA_H - PADDLE_H) / 2;
    aiY.current = (ARENA_H - PADDLE_H) / 2;
    ball.current = { x: ARENA_W / 2, y: ARENA_H / 2, vx: 180, vy: 120 };
    trailRef.current = [];
    setImpactFlash(0);
    setShake(0);
  }, [ARENA_H, ARENA_W]);

  const movePaddleFromClientY = useCallback((clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = clientY - rect.top;
    playerY.current = clamp(y - PADDLE_H / 2, 0, ARENA_H - PADDLE_H);
  }, [ARENA_H]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      movePaddleFromClientY(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [movePaddleFromClientY]);

  useEffect(() => {
    if (enabled && !lastEnabledRef.current) {
      reset();
    }
    lastEnabledRef.current = enabled;
  }, [enabled, reset]);

  useAnimationFrame(
    (dt) => {
      if (stats.over) return;
      const b = ball.current;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < 6) {
        b.y = 6;
        b.vy = Math.abs(b.vy);
      }
      if (b.y > ARENA_H - 6) {
        b.y = ARENA_H - 6;
        b.vy = -Math.abs(b.vy);
      }

      aiY.current += (b.y - (aiY.current + PADDLE_H / 2)) * 0.06;
      aiY.current = clamp(aiY.current, 0, ARENA_H - PADDLE_H);

      if (b.x < PADDLE_X + PADDLE_W + 6 && b.y > playerY.current && b.y < playerY.current + PADDLE_H) {
        b.vx = Math.abs(b.vx) + 6;
        b.x = PADDLE_X + PADDLE_W + 6;
        setStats((s) => ({ ...s, score: s.score + 5, level: 1 + Math.floor((s.score + 5) / 30) }));
        setImpactFlash(1);
      }
      if (b.x > ARENA_W - (PADDLE_X + PADDLE_W + 6) && b.y > aiY.current && b.y < aiY.current + PADDLE_H) {
        b.vx = -Math.abs(b.vx) - 4;
        b.x = ARENA_W - (PADDLE_X + PADDLE_W + 6);
        setImpactFlash(1);
      }

      if (b.x < 0) {
        const lives = stats.lives - 1;
        if (lives <= 0) {
          setStats((s) => ({ ...s, over: true, lives: 0 }));
          onFinish(stats.score, false);
          return;
        }
        setStats((s) => ({ ...s, lives }));
        ball.current = { x: ARENA_W / 2, y: ARENA_H / 2, vx: 180, vy: 120 };
        setShake(1);
      }
      if (b.x > ARENA_W) {
        const score = stats.score + 20;
        setStats((s) => ({ ...s, score, over: true, won: true }));
        onFinish(score, true);
      }
      trailRef.current.push({ x: b.x, y: b.y });
      if (trailRef.current.length > 8) trailRef.current.shift();
      setImpactFlash((v) => Math.max(0, v - dt * 3));
      setShake((v) => Math.max(0, v - dt * 4));
    },
    enabled
  );

  useAnimationFrame(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = ARENA_W;
      const height = ARENA_H;
      const scale = Math.min(canvas.width / width, canvas.height / height) || 1;
      const offsetX = (canvas.width - width * scale) / 2;
      const offsetY = (canvas.height - height * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      const arenaGlow = theme === "toxic" ? "rgba(132,204,22,0.2)" : theme === "sunset" ? "rgba(251,146,60,0.2)" : "rgba(34,211,238,0.2)";
      const ballColor = theme === "toxic" ? "#bef264" : theme === "sunset" ? "#fdba74" : "#67e8f9";
      const shakeOffset = shake > 0 ? Math.sin(Date.now() * 0.06) * 4 * shake : 0;
      ctx.save();
      ctx.translate(shakeOffset, 0);
      ctx.fillStyle = "#020814";
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      ctx.strokeStyle = arenaGlow;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(ARENA_W / 2, 0);
      ctx.lineTo(ARENA_W / 2, ARENA_H);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = paddleSkin === "violet" ? "#a78bfa" : paddleSkin === "gold" ? "#fbbf24" : theme === "toxic" ? "#84cc16" : theme === "sunset" ? "#fb923c" : "#22d3ee";
      ctx.fillRect(PADDLE_X, playerY.current, PADDLE_W, PADDLE_H);
      ctx.fillRect(ARENA_W - (PADDLE_X + PADDLE_W), aiY.current, PADDLE_W, PADDLE_H);

      const b = ball.current;
      trailRef.current.forEach((point, idx) => {
        ctx.globalAlpha = (idx + 1) / trailRef.current.length / 2;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3 + idx * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 16;
      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (impactFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${impactFlash * 0.28})`;
        ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    enabled
  );

  return {
    stats,
    setStats,
    reset,
    view: (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="flex-1 relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            movePaddleFromClientY(touch.clientY);
          }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            movePaddleFromClientY(touch.clientY);
          }}
        />
        </div>
        {isTouch ? (
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-2 bg-black/40 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:p-3">
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100" onClick={() => { playerY.current = clamp(playerY.current - 28, 0, ARENA_H - PADDLE_H); }}>Up</button>
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100" onClick={() => { playerY.current = clamp(playerY.current + 28, 0, ARENA_H - PADDLE_H); }}>Down</button>
          </div>
        ) : null}
      </div>
    )
  };
}

function BreakoutGame({ onFinish, enabled }: { onFinish: (score: number, won: boolean) => void; enabled: boolean }) {
  const isTouch = useIsTouchDevice();
  type Brick = { x: number; y: number; w: number; h: number; alive: boolean; hp: number; maxHp: number; color: string; score: number };
  const WIDTH = 400;
  const HEIGHT = isTouch ? 760 : 480;
  const TOP = 18;
  const LEFT_WALL = 12;
  const RIGHT_WALL = WIDTH - 12;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 3, over: false });
  const paddleX = useRef(160);
  const paddleW = useRef(90);
  const ball = useRef({ x: 200, y: 250, vx: 170, vy: -170 });
  const bricks = useRef<Brick[]>([]);
  const lastEnabledRef = useRef(false);
  useResizeCanvas(containerRef, canvasRef);

  const spawnLevel = useCallback((level: number) => {
    const rows = Math.min(7, 5 + Math.floor((level - 1) / 1));
    const cols = 11;
    const brickW = 31;
    const brickH = 11;
    const gapX = 2;
    const gapY = 3;
    const startX = 24;
    const startY = 52;
    const next: Brick[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const hp = level >= 2 && (r + c + level) % 6 === 0 ? 2 : 1;
        next.push({
          x: startX + c * (brickW + gapX),
          y: startY + r * (brickH + gapY),
          w: brickW,
          h: brickH,
          alive: true,
          hp,
          maxHp: hp,
          color: LEVEL_COLORS[Math.min(LEVEL_COLORS.length - 1, r)],
          score: hp === 2 ? 20 : 10
        });
      }
    }
    bricks.current = next;
    paddleW.current = Math.max(62, 90 - (level - 1) * 6);
    const speed = 165 + level * 20;
    ball.current = { x: WIDTH / 2, y: HEIGHT * 0.62, vx: speed * (Math.random() > 0.5 ? 1 : -1), vy: -speed };
    paddleX.current = (WIDTH - paddleW.current) / 2;
  }, [HEIGHT]);

  const reset = useCallback(() => {
    setStats({ score: 0, level: 1, lives: 3, over: false });
    spawnLevel(1);
  }, [spawnLevel]);

  const movePaddleFromClientX = useCallback((clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    paddleX.current = clamp(clientX - rect.left - paddleW.current / 2, LEFT_WALL + 2, RIGHT_WALL - paddleW.current - 2);
  }, [LEFT_WALL, RIGHT_WALL]);

  useEffect(() => {
    if (enabled && !lastEnabledRef.current) {
      reset();
    }
    lastEnabledRef.current = enabled;
  }, [enabled, reset]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      movePaddleFromClientX(e.clientX);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [movePaddleFromClientX]);

  useAnimationFrame(
    (dt) => {
      if (stats.over) return;
      const b = ball.current;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < LEFT_WALL + 3) {
        b.x = LEFT_WALL + 3;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > RIGHT_WALL - 3) {
        b.x = RIGHT_WALL - 3;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < TOP + 2) {
        b.y = TOP + 2;
        b.vy = Math.abs(b.vy);
      }

      const paddleY = HEIGHT - 22;
      if (b.y > paddleY - 3 && b.x > paddleX.current && b.x < paddleX.current + paddleW.current) {
        b.vy = -Math.abs(b.vy);
        b.vx += (b.x - (paddleX.current + paddleW.current / 2)) * 0.95;
      }

      for (const brick of bricks.current) {
        if (!brick.alive) continue;
        if (b.x > brick.x && b.x < brick.x + brick.w && b.y > brick.y && b.y < brick.y + brick.h) {
          brick.hp -= 1;
          if (brick.hp <= 0) brick.alive = false;
          b.vy *= -1;
          const gained = brick.hp <= 0 ? brick.score : 6;
          setStats((s) => ({ ...s, score: s.score + gained }));
          break;
        }
      }

      if (bricks.current.every((brick) => !brick.alive)) {
        if (stats.level >= 4) {
          const score = stats.score + 140;
          setStats((s) => ({ ...s, score, over: true, won: true }));
          onFinish(score, true);
        } else {
          const nextLevel = stats.level + 1;
          setStats((s) => ({ ...s, level: nextLevel, score: s.score + 80 }));
          spawnLevel(nextLevel);
        }
      }

      if (b.y > HEIGHT + 4) {
        const lives = stats.lives - 1;
        if (lives <= 0) {
          setStats((s) => ({ ...s, over: true, lives: 0 }));
          onFinish(stats.score, false);
        } else {
          setStats((s) => ({ ...s, lives }));
          const speed = 165 + stats.level * 20;
          ball.current = { x: WIDTH / 2, y: HEIGHT * 0.62, vx: speed * (Math.random() > 0.5 ? 1 : -1), vy: -speed };
        }
      }
    },
    enabled
  );

  useAnimationFrame(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.min(canvas.width / WIDTH, canvas.height / HEIGHT) || 1;
      const offsetX = (canvas.width - WIDTH * scale) / 2;
      const offsetY = (canvas.height - HEIGHT * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      // OG frame
      ctx.strokeStyle = "#e9e1e1";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL, TOP);
      ctx.lineTo(RIGHT_WALL, TOP);
      ctx.stroke();
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL + 5, TOP);
      ctx.lineTo(LEFT_WALL + 5, HEIGHT - 4);
      ctx.moveTo(RIGHT_WALL - 5, TOP);
      ctx.lineTo(RIGHT_WALL - 5, HEIGHT - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL + 22, TOP);
      ctx.lineTo(LEFT_WALL + 22, TOP + 24);
      ctx.moveTo(LEFT_WALL + 226, TOP);
      ctx.lineTo(LEFT_WALL + 226, TOP + 24);
      ctx.stroke();
      // score text
      ctx.fillStyle = "#e9e1e1";
      ctx.font = 'bold 28px "IBM Plex Mono", monospace';
      ctx.fillText(String(stats.score).padStart(3, "0"), WIDTH - 148, TOP + 23);

      for (const brick of bricks.current) {
        if (!brick.alive) continue;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        if (brick.maxHp > 1 && brick.hp === 1) {
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillRect(brick.x + 1, brick.y + 1, brick.w - 2, brick.h - 2);
        }
      }

      ctx.fillStyle = "#14b8ff";
      ctx.fillRect(paddleX.current, HEIGHT - 18, paddleW.current, 8);
      ctx.fillStyle = "#1fd0ff";
      ctx.fillRect(LEFT_WALL + 1, HEIGHT - 17, 6, 8);
      ctx.fillRect(RIGHT_WALL - 7, HEIGHT - 17, 6, 8);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(ball.current.x - 2, ball.current.y - 2, 4, 4);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    enabled
  );

  return {
    stats,
    setStats,
    reset,
    view: (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="flex-1 relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            movePaddleFromClientX(touch.clientX);
          }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            movePaddleFromClientX(touch.clientX);
          }}
        />
        </div>
        {isTouch ? (
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-2 bg-black/40 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:p-3">
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100" onClick={() => { paddleX.current = clamp(paddleX.current - 26, LEFT_WALL + 2, RIGHT_WALL - paddleW.current - 2); }}>Left</button>
            <button type="button" className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100" onClick={() => { paddleX.current = clamp(paddleX.current + 26, LEFT_WALL + 2, RIGHT_WALL - paddleW.current - 2); }}>Right</button>
          </div>
        ) : null}
      </div>
    )
  };
}

function MemoryGame({
  onFinish,
  enabled,
  cardBack,
  theme
}: {
  onFinish: (score: number, won: boolean) => void;
  enabled: boolean;
  cardBack: MemoryBack;
  theme: ArcadeTheme;
}) {
  const icons = ["PX", "AI", "FX", "HP", "XR", "GL", "PX", "AI", "FX", "HP", "XR", "GL"].sort(() => Math.random() - 0.5);
  const [cards, setCards] = useState(icons.map((label, i) => ({ id: i, label, open: false, matched: false })));
  const [open, setOpen] = useState<number[]>([]);
  const [stats, setStats] = useState<ArcadeStats>({ score: 0, level: 1, lives: 20, over: false });
  const [pairBurst, setPairBurst] = useState<{ x: number; y: number } | null>(null);

  const reset = () => {
    const shuffled = ["PX", "AI", "FX", "HP", "XR", "GL", "PX", "AI", "FX", "HP", "XR", "GL"].sort(() => Math.random() - 0.5);
    setCards(shuffled.map((label, i) => ({ id: i, label, open: false, matched: false })));
    setOpen([]);
    setStats({ score: 0, level: 1, lives: 20, over: false });
    setPairBurst(null);
  };

  useEffect(() => {
    if (!enabled) return;
    if (open.length !== 2) return;
    const [a, b] = open;
    if (cards[a].label === cards[b].label) {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
      setStats((s) => ({ ...s, score: s.score + 15 }));
      setPairBurst({ x: ((a % 4) + (b % 4) + 1) * 40, y: (Math.floor(a / 4) + Math.floor(b / 4) + 1) * 40 });
      window.setTimeout(() => setPairBurst(null), 380);
      setOpen([]);
      return;
    }

    const t = setTimeout(() => {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, open: false } : c)));
      setOpen([]);
      setStats((s) => ({ ...s, lives: s.lives - 1 }));
    }, 520);
    return () => clearTimeout(t);
  }, [cards, enabled, open]);

  useEffect(() => {
    if (!enabled) return;
    const matched = cards.every((c) => c.matched);
    if (matched && !stats.over) {
      const score = stats.score + stats.lives * 4;
      setStats((s) => ({ ...s, score, over: true, won: true }));
      onFinish(score, true);
      return;
    }
    if (stats.lives <= 0 && !stats.over) {
      setStats((s) => ({ ...s, over: true }));
      onFinish(stats.score, false);
    }
  }, [cards, enabled, onFinish, stats]);

  const flip = (idx: number) => {
    if (stats.over) return;
    if (open.length >= 2) return;
    if (cards[idx].open || cards[idx].matched) return;
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, open: true } : c)));
    setOpen((prev) => [...prev, idx]);
  };

  const accent = theme === "toxic" ? "lime" : theme === "sunset" ? "amber" : "cyan";
  const closedClass =
    cardBack === "glyph"
      ? "border-violet-500/35 bg-violet-950/75 text-violet-300 hover:border-violet-300/45"
      : cardBack === "prism"
        ? "border-fuchsia-500/35 bg-fuchsia-950/70 text-fuchsia-300 hover:border-fuchsia-300/45"
        : accent === "lime"
          ? "border-lime-500/35 bg-slate-900/70 text-lime-300 hover:border-lime-300/35"
          : accent === "amber"
            ? "border-amber-500/35 bg-slate-900/70 text-amber-300 hover:border-amber-300/35"
            : "border-slate-500/35 bg-slate-900/70 text-slate-500 hover:border-cyan-300/35";
  const closedToken = cardBack === "glyph" ? "◇" : cardBack === "prism" ? "◈" : "?";

  const view = (
    <div className="relative mx-auto grid w-full max-w-[460px] grid-cols-4 gap-2 p-2 sm:max-w-[520px] sm:p-3">
      {cards.map((card, idx) => (
        <button
          type="button"
          key={card.id}
          onClick={() => flip(idx)}
          className={`grid aspect-square w-full place-items-center rounded-xl border text-sm font-semibold transition ${
            card.open || card.matched
              ? "border-cyan-300/55 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
              : closedClass
          }`}
          style={{ transform: card.open || card.matched ? "rotateY(180deg)" : "rotateY(0deg)", transformStyle: "preserve-3d" }}
        >
          {card.open || card.matched ? card.label : closedToken}
        </button>
      ))}
      {pairBurst ? (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300"
              style={{ left: pairBurst.x, top: pairBurst.y, transform: `translate(${Math.cos(i) * 26}px, ${Math.sin(i) * 26}px)` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return { stats, setStats, cards, setCards, open, setOpen, reset, view };
}

export function PXPlayClient() {
  const isObsidianSkull = useIsObsidianSkullTheme();
  const { profile: personalizationProfile } = usePersonalizationProfile();
  const setWallet = useWallet((state) => state.setWallet);
  const walletCoins = useWallet((state) => state.coins);
  const walletGems = useWallet((state) => state.gems);
  const walletXp = useWallet((state) => state.xp);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [viewMode, setViewMode] = useState<"games" | "rewards">("games");
  const [strictMode, setStrictMode] = useState<boolean>(() => readStrictMode());
  const [theme, setTheme] = useState<ArcadeTheme>("neon");
  const [landerSpeed, setLanderSpeed] = useState<1 | 2 | 3 | 4>(1);
  const [landerLoopMode, setLanderLoopMode] = useState(false);
  const [, setPersisted] = useState<Persisted>(() => readPersisted());
  const [tutorialSeen, setTutorialSeen] = useState<TutorialSeen>(() => readTutorialSeen());
  const [tutorialGame, setTutorialGame] = useState<GameId | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [inventory, setInventory] = useState<ArcadeInventory>(() => readInventory());
  const [rewardPopup, setRewardPopup] = useState<{ game: GameId; rewards: RewardResult; won: boolean; score: number } | null>(null);
  const gameFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gameplayKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "Spacebar",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D"
    ]);

    const shouldBlock = () => activeGame !== null && viewMode === "games";

    const inEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!shouldBlock()) return;
      if (inEditable(e.target)) return;
      if (gameplayKeys.has(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("keyup", onKey, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [activeGame, viewMode]);

  useEffect(() => {
    saveStrictMode(strictMode);
  }, [strictMode]);

  useEffect(() => {
    if (!personalizationProfile) return;
    const resolvedWallet = { coins: personalizationProfile.coins, gems: personalizationProfile.gems };
    setWallet({
      coins: personalizationProfile.walletCoins ?? resolvedWallet.coins,
      gems: personalizationProfile.walletGems ?? (resolvedWallet.gems.blue + resolvedWallet.gems.purple + resolvedWallet.gems.gold),
      xp: personalizationProfile.walletXP ?? walletXp
    });
    setInventory((prev) => ({
      ...prev,
      coins: Math.max(prev.coins, resolvedWallet.coins),
      gems: {
        blue: Math.max(prev.gems.blue, resolvedWallet.gems.blue),
        purple: Math.max(prev.gems.purple, resolvedWallet.gems.purple),
        gold: Math.max(prev.gems.gold, resolvedWallet.gems.gold)
      }
    }));
  }, [personalizationProfile, setWallet, walletXp]);

  const syncServerEarnings = useCallback((source: string, rewards: RewardResult) => {
    void fetch("/api/personalization/earn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        coins: rewards.coins,
        gems: rewards.gems
      })
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: { coins: number; gems: { blue: number; purple: number; gold: number } };
        };
        if (payload.profile) {
          setPersonalizationWalletFromMutation({
            coins: payload.profile.coins,
            gems: payload.profile.gems
          });
        }
      })
      .catch(() => {
        // keep local rewards even if backend sync fails
      });
  }, []);

  const applyFinish = (game: GameId, score: number, won: boolean) => {
    setPersisted((prev) => {
      const updatedStreak = won ? prev[game].streak + 1 : 0;
      const isFirstWin = won && prev[game].best === 0;
      const isHighScore = score > prev[game].best;
      const gameStats: ArcadeStats | null =
        game === "snake" ? snake.stats :
        game === "lander" ? lander.stats :
        game === "xo" ? xo.stats :
        game === "pong" ? pong.stats :
        game === "breakout" ? breakout.stats :
        game === "memory" ? memory.stats : null;

      setInventory((invPrev) => {
        const rewards = calcRewards({
          game,
          score,
          won,
          isFirstWin,
          isHighScore,
          streak: updatedStreak,
          stats: gameStats,
          inventory: invPrev,
          strictMode
        });

        const mergedBadges = Array.from(new Set([...invPrev.badges, ...rewards.badgesUnlocked]));
        const mergedTrophies = Array.from(new Set([...invPrev.trophies, ...rewards.trophiesUnlocked]));
        const mergedTitles = Array.from(new Set([...invPrev.titles, ...rewards.titlesUnlocked]));
        const nextInventory: ArcadeInventory = {
          ...invPrev,
          coins: invPrev.coins + rewards.coins,
          gems: {
            blue: invPrev.gems.blue + rewards.gems.blue,
            purple: invPrev.gems.purple + rewards.gems.purple,
            gold: invPrev.gems.gold + rewards.gems.gold
          },
          badges: mergedBadges,
          trophies: mergedTrophies,
          titles: mergedTitles,
          totalPlays: invPrev.totalPlays + 1,
          totalWins: invPrev.totalWins + (won ? 1 : 0),
          lastPlayedDate: todayKey(),
          themesUnlocked: invPrev.themesUnlocked.includes("neon") ? invPrev.themesUnlocked : [...invPrev.themesUnlocked, "neon"]
        };

        if (nextInventory.totalWins >= 8 && !nextInventory.themesUnlocked.includes("toxic")) {
          nextInventory.themesUnlocked = [...nextInventory.themesUnlocked, "toxic"];
          nextInventory.badges = Array.from(new Set([...nextInventory.badges, "Theme Unlock: Toxic Pulse"]));
        }
        if (nextInventory.totalWins >= 16 && !nextInventory.themesUnlocked.includes("sunset")) {
          nextInventory.themesUnlocked = [...nextInventory.themesUnlocked, "sunset"];
          nextInventory.badges = Array.from(new Set([...nextInventory.badges, "Theme Unlock: Sunset Flux"]));
        }

        saveInventory(nextInventory);
        setWallet({
          coins: nextInventory.coins,
          gems: nextInventory.gems.blue + nextInventory.gems.purple + nextInventory.gems.gold,
          xp: walletXp
        });
        syncServerEarnings("games", rewards);
        setRewardPopup({ game, rewards, won, score });
        return nextInventory;
      });

      const next: Persisted = {
        ...prev,
        [game]: {
          best: Math.max(prev[game].best, score),
          streak: updatedStreak
        }
      };
      savePersisted(next);
      return next;
    });
  };

  const isPaused = Boolean(tutorialGame);

  const snake = SnakeGame({
    onFinish: (score, won) => applyFinish("snake", score, won),
    enabled: activeGame === "snake" && !isPaused,
    theme,
    snakeSkin: inventory.equipped.snake
  });
  const lander = LanderGame({
    onFinish: (score, won) => applyFinish("lander", score, won),
    enabled: activeGame === "lander" && !isPaused,
    timeScale: landerSpeed,
    loopMode: landerLoopMode
  });
  const xo = XOGame({
    onFinish: (score, won) => applyFinish("xo", score, won),
    enabled: activeGame === "xo" && !isPaused,
    xoTheme: inventory.equipped.xo,
    theme
  });
  const pong = PongGame({
    onFinish: (score, won) => applyFinish("pong", score, won),
    enabled: activeGame === "pong" && !isPaused,
    paddleSkin: inventory.equipped.pong,
    theme
  });
  const breakout = BreakoutGame({ onFinish: (score, won) => applyFinish("breakout", score, won), enabled: activeGame === "breakout" && !isPaused });
  const memory = MemoryGame({
    onFinish: (score, won) => applyFinish("memory", score, won),
    enabled: activeGame === "memory" && !isPaused,
    cardBack: inventory.equipped.memory,
    theme
  });

  const restart = () => {
    switch (activeGame) {
      case "snake":
        snake.reset();
        break;
      case "lander":
        lander.reset();
        setLanderSpeed(1);
        setLanderLoopMode(false);
        break;
      case "xo":
        xo.reset();
        break;
      case "pong":
        pong.reset();
        break;
      case "breakout":
        breakout.reset();
        break;
      case "memory":
        memory.reset();
        break;
      default:
        break;
    }
  };

  const openTutorial = (game: GameId) => setTutorialGame(game);

  const completeTutorial = () => {
    if (!tutorialGame) return;
    const next = { ...tutorialSeen, [tutorialGame]: true };
    setTutorialSeen(next);
    saveTutorialSeen(next);
    setTutorialGame(null);
  };

  const copyPrompt = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(id);
      window.setTimeout(() => setCopiedPrompt(null), 1100);
    } catch {
      setCopiedPrompt(null);
    }
  };

  const landerPrompts = [
    {
      id: "code_html_js",
      title: "Game Development: HTML5/JavaScript Clone",
      text: "Act as an expert game developer. Write a complete, single-file HTML5 canvas and vanilla JavaScript code for a clone of the 1979 'Lunar Lander'. Include the following mechanics:\n\nA jagged, randomly generated line-vector terrain with at least three flat landing pads of different score multipliers (2x, 3x, 5x).\n\nPhysics: Constant downward gravity, velocity, and inertia.\n\nControls: Up arrow for main thrust, Left/Right arrows for rotation.\n\nUI: On-screen display of Altitude, Horizontal Speed, Vertical Speed, and Fuel.\n\nWin/Loss: The lander must crash if the vertical speed is > 15, horizontal speed is > 5, or the angle is not perfectly upright upon touching a landing pad."
    },
    {
      id: "terrain_python",
      title: "Procedural Terrain: Python Script",
      text: "Write a Python script that generates a 2D array representing the jagged terrain of a Lunar Lander game. Use midpoint displacement (1D Perlin noise/fractal algorithm) to make it look like rough mountains. Ensure there are exactly two completely flat segments (landing zones) randomly placed within the terrain. Plot the result using Matplotlib."
    },
    {
      id: "design_modern",
      title: "Modern Remake: New Mechanics",
      text: "I am designing a modern remake of the 1979 Lunar Lander. Act as a Lead Game Designer. Pitch 5 new mechanics that add depth to the game without losing the core physics-based landing challenge. Consider adding environmental hazards (like solar winds or meteor showers), ship upgrades, or different planetary gravities. Explain how each mechanic affects the player's strategy."
    },
    {
      id: "story_lore",
      title: "Story & Lore Mission Briefing",
      text: "The original 1979 Lunar Lander had no story. Write a short, engaging sci-fi backstory for the game. Why is the pilot landing on this jagged terrain? What cargo are they carrying, and why is their fuel so strictly limited? Write it as a mission briefing from a gritty, 1970s retro-futuristic space agency."
    },
    {
      id: "visual_concept",
      title: "Concept Art Prompt",
      text: "A hyper-realistic concept art of a retro-futuristic lunar landing module approaching a highly jagged, dangerous moon surface. The perspective is side-on, similar to a 2D platformer. High contrast, cinematic lighting, pitch black starry sky, glowing thruster exhaust, and a flat glowing landing pad in the distance. 8k resolution, sci-fi."
    },
    {
      id: "text_sim",
      title: "Text-Based Simulation Prompt",
      text: "You are the Apollo Flight Computer. We are playing a text-based, turn-by-turn simulation of Lunar Lander.\nInitial State: Altitude: 1000m, Vertical Velocity: -50m/s (falling), Fuel: 500 units. Gravity is pulling me down at 1.6m/s².\nRules per turn: > 1. You present my current stats (Altitude, Velocity, Fuel).\n2. You ask me for my 'Thrust Level' (0 to 10).\n3. Each thrust unit consumes 5 Fuel units and provides 2m/s² of upward acceleration.\n4. You calculate the new velocity and altitude for a 5-second time step using basic kinematic physics, then output the new state.\nWin/Loss: If Altitude hits 0 and Velocity is between 0 and -5m/s, I land safely. If Velocity is faster than -5m/s when Altitude hits 0, I crash.\nDo not play the game for me. Wait for my input after displaying the first state."
    }
  ];

  const toggleFullscreen = async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target = gameFrameRef.current;
      if (!target) return;
      await target.requestFullscreen();
      target.scrollLeft = 0;
      target.scrollTop = 0;
    } catch {
      // Ignore fullscreen API failures and keep game usable.
    }
  };

  useEffect(() => {
    const onFs = () => {
      if (document.fullscreenElement && gameFrameRef.current) {
        gameFrameRef.current.scrollLeft = 0;
        gameFrameRef.current.scrollTop = 0;
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const current = (() => {
    if (activeGame === "snake") return { title: "Snake", stats: snake.stats, view: snake.canvas, id: "snake" as const };
    if (activeGame === "lander") return { title: "Lunar Lander", stats: lander.stats, view: lander.canvas, id: "lander" as const };
    if (activeGame === "xo") return { title: "Tic-Tac-Toe", stats: xo.stats, view: xo.view, id: "xo" as const };
    if (activeGame === "pong") return { title: "Pong", stats: pong.stats, view: pong.view, id: "pong" as const };
    if (activeGame === "breakout") return { title: "Breakout", stats: breakout.stats, view: breakout.view, id: "breakout" as const };
    if (activeGame === "memory") return { title: "Memory Match", stats: memory.stats, view: memory.view, id: "memory" as const };
    return null;
  })();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = activeGame !== null;
    document.body.classList.toggle("px-play-game-active", active);
    return () => {
      document.body.classList.remove("px-play-game-active");
    };
  }, [activeGame]);

  const cosmetics: Array<{ id: string; label: string; type: string; cost: number; equipKey: keyof ArcadeInventory["equipped"]; equipValue: string }> = [
    { id: "snake-ember", label: "Snake Ember Skin", type: "Snake", cost: 120, equipKey: "snake", equipValue: "ember" },
    { id: "snake-plasma", label: "Snake Plasma Skin", type: "Snake", cost: 220, equipKey: "snake", equipValue: "plasma" },
    { id: "pong-violet", label: "Pong Violet Paddles", type: "Pong", cost: 100, equipKey: "pong", equipValue: "violet" },
    { id: "pong-gold", label: "Pong Gold Paddles", type: "Pong", cost: 190, equipKey: "pong", equipValue: "gold" },
    { id: "lander-cyan", label: "Lander Cyan Ship", type: "Lander", cost: 160, equipKey: "lander", equipValue: "cyan" },
    { id: "lander-sun", label: "Lander Solar Ship", type: "Lander", cost: 260, equipKey: "lander", equipValue: "sun" },
    { id: "xo-amber", label: "XO Amber Grid", type: "XO", cost: 120, equipKey: "xo", equipValue: "amber" },
    { id: "xo-grid", label: "XO Violet Grid", type: "XO", cost: 190, equipKey: "xo", equipValue: "grid" },
    { id: "memory-glyph", label: "Memory Glyph Back", type: "Memory", cost: 100, equipKey: "memory", equipValue: "glyph" },
    { id: "memory-prism", label: "Memory Prism Back", type: "Memory", cost: 180, equipKey: "memory", equipValue: "prism" }
  ];

  const unlockOrEquip = (item: (typeof cosmetics)[number]) => {
    setInventory((prev) => {
      const unlocked = prev.cosmeticsUnlocked.includes(item.id);
      if (!unlocked && prev.coins < item.cost) return prev;
      const next: ArcadeInventory = {
        ...prev,
        coins: unlocked ? prev.coins : prev.coins - item.cost,
        cosmeticsUnlocked: unlocked ? prev.cosmeticsUnlocked : [...prev.cosmeticsUnlocked, item.id],
        equipped: { ...prev.equipped, [item.equipKey]: item.equipValue as never }
      };
      saveInventory(next);
      setWallet({
        coins: next.coins,
        gems: next.gems.blue + next.gems.purple + next.gems.gold,
        xp: walletXp
      });
      return next;
    });
  };

  return (
    <div className={`px-play-shell px-shell ${current ? "space-y-2 pb-3" : "space-y-6 pb-12"}`}>
      {!current ? <section className="px-panel p-4 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          {isObsidianSkull ? <SkullJoystickIcon className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
          PX Play Arcade
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">PX Play</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600 dark:text-slate-300">Classic arcade + AI casual games in a neon PX mini arcade.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="w-full overflow-x-auto sm:w-auto">
          <div className="inline-flex min-w-max rounded-xl border border-slate-500/30 bg-slate-900/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("games")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                viewMode === "games" ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Games
            </button>
            <button
              type="button"
              onClick={() => setViewMode("rewards")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                viewMode === "rewards" ? "bg-fuchsia-400/20 text-fuchsia-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PX Rewards
            </button>
          </div>
          </div>
          <button
            type="button"
            onClick={() => setStrictMode((prev) => !prev)}
            className={`w-full rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition sm:w-auto ${
              strictMode
                ? "border-rose-300/45 bg-rose-500/15 text-rose-100"
                : "border-slate-500/30 bg-slate-900/50 text-slate-300 hover:text-slate-100"
            }`}
          >
            Strict Mode: {strictMode ? "On" : "Off"}
          </button>
          <div className="w-full overflow-x-auto sm:w-auto">
          <div className="inline-flex min-w-max rounded-xl border border-slate-500/30 bg-slate-900/50 p-1">
          {inventory.themesUnlocked.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                theme === key ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {themeMeta[key].label}
            </button>
          ))}
          </div>
          </div>
        </div>
        {strictMode ? (
          <p className="mt-2 text-xs text-rose-200">Strict mode is active: harder reward thresholds and lower coin payout.</p>
        ) : null}
      </section> : null}

      {viewMode === "rewards" ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="px-panel p-5">
            <h2 className="text-lg font-semibold text-white">Inventory</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-amber-200">{isObsidianSkull ? <SkullCoinIcon className="h-4 w-4" /> : <Coins className="h-4 w-4" />} PX Coins: {walletCoins}</p>
              <p className="flex items-center gap-2 text-cyan-200">{isObsidianSkull ? <SkullCrystalIcon className="h-4 w-4" /> : <Gem className="h-4 w-4" />} Total Gems: {walletGems}</p>
              <p className="flex items-center gap-2 text-emerald-200"><Trophy className="h-4 w-4" /> Trophies: {inventory.trophies.length}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Titles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inventory.titles.map((title) => (
                  <span key={title} className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">{title}</span>
                ))}
              </div>
            </div>
          </article>
          <article className="px-panel p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">Cosmetic Unlocks</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {cosmetics.map((item) => {
                const unlocked = inventory.cosmeticsUnlocked.includes(item.id);
                const equipped = inventory.equipped[item.equipKey] === item.equipValue;
                return (
                  <div key={item.id} className="rounded-xl border border-cyan-300/25 bg-slate-900/60 p-3">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-slate-300">{item.type}</p>
                    <p className="mt-1 text-xs text-amber-200">Cost: {item.cost} PX Coins</p>
                    <button
                      type="button"
                      onClick={() => unlockOrEquip(item)}
                      className="mt-3 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-100"
                    >
                      {equipped ? "Equipped" : unlocked ? "Equip" : "Unlock"}
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="px-panel p-5 lg:col-span-3">
            <h2 className="text-lg font-semibold text-white">Badges and Trophies</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-cyan-300/25 bg-slate-900/55 p-4">
                <p className="flex items-center gap-2 text-cyan-100"><Shield className="h-4 w-4" /> Badges</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {inventory.badges.length ? inventory.badges.map((b) => (
                    <span key={b} className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{b}</span>
                  )) : <span className="text-xs text-slate-400">No badges yet</span>}
                </div>
              </div>
              <div className="rounded-xl border border-fuchsia-300/25 bg-slate-900/55 p-4">
                <p className="flex items-center gap-2 text-fuchsia-100"><Trophy className="h-4 w-4" /> Trophies</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {inventory.trophies.length ? inventory.trophies.map((t) => (
                    <span key={t} className="rounded-full border border-fuchsia-300/35 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">{t}</span>
                  )) : <span className="text-xs text-slate-400">No trophies yet</span>}
                </div>
              </div>
            </div>
          </article>
          <article className="px-panel p-5 lg:col-span-3">
            <PXCustomizationPanel />
          </article>
        </section>
      ) : current ? (
        <div ref={gameFrameRef} className="px-game-full-target w-full">
          <FullscreenGameLayout
            title={current.title}
            canvas={current.view}
            onExit={() => setActiveGame(null)}
            controls={
              <>
                <button type="button" onClick={restart} className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100">Restart</button>
                <button type="button" onClick={() => openTutorial(current.id)} className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100">Tutorial</button>
                <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-cyan-300/40 bg-slate-900/65 py-2 text-cyan-100">Fullscreen</button>
              </>
            }
          />
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile, index) => {
            const Icon = tile.icon;
            return (
              <article
                key={tile.id}
                className="px-panel px-reveal px-hover-lift relative overflow-hidden p-5"
                style={{ animationDelay: `${100 + index * 70}ms` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-blue-500/10 to-transparent opacity-60" />
                <Icon className="h-5 w-5 text-cyan-300" />
                <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{tile.name}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tile.subtitle}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (tile.id === "snake") {
                      snake.reset();
                    }
                    if (tile.id === "pong") {
                      pong.reset();
                    }
                    if (tile.id === "lander") {
                      lander.reset();
                    }
                    if (tile.id === "xo") {
                      xo.reset();
                    }
                    if (tile.id === "breakout") {
                      breakout.reset();
                    }
                    if (tile.id === "memory") {
                      memory.reset();
                    }
                    setActiveGame(tile.id);
                    if (!tutorialSeen[tile.id]) {
                      setTutorialGame(tile.id);
                    }
                  }}
                  className="px-button mt-4 w-full"
                >
                  Play
                </button>
              </article>
            );
          })}
        </section>
      )}

      {rewardPopup ? (
        <div className="px-reward-popup fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="px-reward-popup-card relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-300/40 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 p-4 shadow-[0_0_90px_rgba(34,211,238,0.25)] sm:p-6">
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 44 }, (_, i) => (
                <span
                  key={i}
                  className={`absolute rounded-full ${i % 3 === 0 ? "h-2 w-2 bg-amber-300/85" : i % 3 === 1 ? "h-2 w-2 bg-cyan-300/80" : "h-1.5 w-1.5 bg-violet-300/80"}`}
                  style={{ left: `${(i * 23) % 100}%`, top: `${(i * 31) % 100}%`, transform: `translateY(${(i % 5) * -2}px) scale(${1 + (i % 3) * 0.3})` }}
                />
              ))}
            </div>
            <h3 className={`relative text-center text-2xl font-bold ${rewardPopup.won ? "text-cyan-100" : "text-rose-200"}`}>
              {rewardPopup.won ? "Victory Rewards" : "Round Complete"}
            </h3>
            <p className="relative mt-1 text-center text-xs uppercase tracking-[0.18em] text-slate-300">{rewardPopup.game.toUpperCase()} complete</p>
            <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-center">
                <Coins className="mx-auto h-6 w-6 text-amber-300" />
                <p className="mt-1 text-sm text-amber-100">+{rewardPopup.rewards.coins} PX Coins</p>
              </div>
              <div className="rounded-xl border border-violet-300/40 bg-violet-400/10 p-3 text-center">
                <Gem className="mx-auto h-6 w-6 text-violet-200" />
                <p className="mt-1 text-sm text-violet-100">
                  +{rewardPopup.rewards.gems.blue} Blue / +{rewardPopup.rewards.gems.purple} Purple / +{rewardPopup.rewards.gems.gold} Gold
                </p>
              </div>
            </div>
            <div className="relative mt-4 space-y-2 text-sm">
              {rewardPopup.rewards.badgesUnlocked.length ? <p className="text-cyan-100">New Badge: {rewardPopup.rewards.badgesUnlocked.join(", ")}</p> : null}
              {rewardPopup.rewards.trophiesUnlocked.length ? <p className="text-yellow-100">Trophy: {rewardPopup.rewards.trophiesUnlocked.join(", ")}</p> : null}
              {rewardPopup.rewards.titlesUnlocked.length ? <p className="text-fuchsia-100">Title: {rewardPopup.rewards.titlesUnlocked.join(", ")}</p> : null}
              {rewardPopup.rewards.notes.length ? <p className="text-slate-300">Triggers: {rewardPopup.rewards.notes.join(", ")}</p> : null}
              {!rewardPopup.won ? <p className="text-rose-200">Tip: Watch timing and keep steady rhythm to push your streak.</p> : null}
            </div>
            <div className="relative mt-6 grid grid-cols-1 gap-3 sm:flex sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setRewardPopup(null);
                  restart();
                }}
                className="px-button"
              >
                {rewardPopup.won ? "Next Level" : "Retry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRewardPopup(null);
                  setActiveGame(null);
                  setViewMode("games");
                }}
                className="px-button-ghost"
              >
                Back to PX Play
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tutorialGame ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 backdrop-blur-[2px]">
          <div className="h-full w-full overflow-y-auto rounded-none border border-cyan-300/40 bg-slate-900/95 p-4 shadow-[0_0_80px_rgba(34,211,238,0.2)] sm:h-auto sm:max-h-none sm:w-full sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">First Round Tutorial</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {tutorialGame === "snake" ? "Snake Rules" : tutorialGame === "lander" ? "Lunar Lander Rules" : tutorialGame === "xo" ? "Tic-Tac-Toe Rules" : tutorialGame === "pong" ? "Pong Rules" : tutorialGame === "memory" ? "Memory Match Rules" : "Breakout Rules"}
            </h3>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              {tutorialGame === "snake" ? (
                <>
                  <p>Controls: Arrow keys or WASD.</p>
                  <p>Eat apples to score and increase speed by level.</p>
                  <p>Avoid walls and your own body.</p>
                </>
              ) : null}
              {tutorialGame === "lander" ? (
                <>
                  <p>Controls: Left/Right rotate, Up/Space thrust.</p>
                  <p>Land only on the flat pad.</p>
                  <p>Safe landing requires: Vertical speed &lt;= 22, Horizontal speed &lt;= 14, Tilt &lt;= 15 degrees.</p>
                  <div className="mt-3 rounded-xl border border-cyan-300/35 bg-slate-950/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">Advanced Prompt Library</p>
                    <div className="mt-2 max-h-60 space-y-2 overflow-auto pr-1">
                      {landerPrompts.map((prompt) => (
                        <div key={prompt.id} className="rounded-lg border border-slate-500/35 bg-slate-900/65 p-2">
                          <p className="text-xs font-semibold text-slate-100">{prompt.title}</p>
                          <p className="mt-1 line-clamp-3 text-[11px] text-slate-300">{prompt.text}</p>
                          <button
                            type="button"
                            onClick={() => copyPrompt(prompt.text, prompt.id)}
                            className="mt-2 rounded-md border border-cyan-300/45 bg-cyan-400/10 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-cyan-100"
                          >
                            {copiedPrompt === prompt.id ? "Copied" : "Copy Prompt"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              {tutorialGame === "xo" ? (
                <>
                  <p>Tap a cell to place your mark.</p>
                  <p>Different modes change the win condition (3x3, 4x4, 5x5, Misere, Wild).</p>
                  <p>Beat the AI to climb levels.</p>
                </>
              ) : null}
              {tutorialGame === "pong" ? (
                <>
                  <p>Move mouse or drag on screen to control your paddle.</p>
                  <p>Bounce the ball past the AI to score.</p>
                  <p>Do not miss the ball or you lose lives.</p>
                </>
              ) : null}
              {tutorialGame === "memory" ? (
                <>
                  <p>Click cards to reveal and match pairs.</p>
                  <p>Wrong pair costs one life.</p>
                  <p>Match all pairs before lives run out.</p>
                </>
              ) : null}
              {tutorialGame === "breakout" ? (
                <>
                  <p>Move mouse or drag on screen to control paddle.</p>
                  <p>Break all bricks to win.</p>
                  <p>Don&apos;t let the ball fall below the paddle.</p>
                </>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
              <button type="button" onClick={completeTutorial} className="px-button w-full">Start Round</button>
              <button type="button" onClick={() => setTutorialGame(null)} className="px-button-ghost w-full">Close</button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .px-game-full-target:fullscreen,
        .px-game-full-target:-webkit-full-screen {
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 10px;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          overflow: hidden;
        }

        .px-game-full-target:fullscreen > section,
        .px-game-full-target:-webkit-full-screen > section {
          width: 100%;
          max-width: 1800px;
          max-height: 100%;
          overflow: hidden;
        }

        .px-game-full-target:fullscreen canvas,
        .px-game-full-target:-webkit-full-screen canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
      `}</style>

      {!current ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/ai-playground" className="px-button-ghost inline-flex">Back to AI Playground</Link>
          <Link href="/dashboard" className="px-button-ghost inline-flex">Back to Dashboard</Link>
        </div>
      ) : null}
    </div>
  );
}
