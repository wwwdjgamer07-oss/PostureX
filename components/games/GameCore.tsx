"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, PlayCircle, Square } from "lucide-react";
import { PostureEngine, type PostureFrame } from "@/lib/postureEngine";
import { buildPostureTelemetry } from "@/lib/postureAlerts";
import type { GamePostureSample } from "@/lib/games/postureAdapter";
import { RewardPopup } from "@/components/games/RewardPopup";
import type { RewardComputationResult } from "@/lib/games/rewards";

interface UsePostureFeedResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  running: boolean;
  loading: boolean;
  error: string | null;
  sample: GamePostureSample | null;
  start: () => Promise<void>;
  stop: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createSample(frame: PostureFrame): GamePostureSample {
  const telemetry = frame.landmarks.length ? buildPostureTelemetry(frame.landmarks, frame.metrics) : null;
  const leftShoulder = frame.landmarks[11];
  const rightShoulder = frame.landmarks[12];
  const shoulderTiltSigned =
    leftShoulder && rightShoulder
      ? (Math.atan2(leftShoulder.y - rightShoulder.y, Math.abs(leftShoulder.x - rightShoulder.x) || 0.0001) * 180) / Math.PI
      : telemetry?.shoulderTilt ?? 0;

  const headForwardAngle = telemetry ? clamp(180 - telemetry.neckAngle, 0, 60) : clamp((100 - frame.metrics.alignment) * 0.55, 0, 60);
  const spineAngle = telemetry?.trunkAngle ?? clamp((100 - frame.metrics.alignment) * 0.35, 0, 28);
  const postureScore = Math.round((frame.metrics.alignment + frame.metrics.stability + frame.metrics.symmetry) / 3);

  return {
    shoulderTilt: shoulderTiltSigned,
    headForwardAngle,
    spineAngle,
    postureScore,
    alignmentPercent: frame.metrics.alignment,
    stability: frame.metrics.stability
  };
}

function usePostureFeed(): UsePostureFeedResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<PostureEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<GamePostureSample | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      engineRef.current?.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const processFrame = async () => {
    if (!runningRef.current || !engineRef.current || !videoRef.current) return;

    const frame = await engineRef.current.analyze(videoRef.current);
    if (frame) {
      setSample(createSample(frame));
    }

    rafRef.current = requestAnimationFrame(() => {
      void processFrame();
    });
  };

  const start = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable in this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = mediaStream;

      if (!videoRef.current) throw new Error("Video element unavailable.");
      videoRef.current.srcObject = mediaStream;
      await videoRef.current.play();

      const engine = new PostureEngine();
      await engine.initialize();
      engineRef.current = engine;

      runningRef.current = true;
      setRunning(true);
      setLoading(false);
      void processFrame();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start posture feed.";
      setError(message);
      setLoading(false);
      runningRef.current = false;
      setRunning(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stop = () => {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    engineRef.current?.stop();
    engineRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return { videoRef, running, loading, error, sample, start, stop };
}

interface ArenaHUD {
  scorePercent: number;
  statusText: string;
  stabilityTime: number;
  goalTime: number;
  signal: "aligned" | "tilt" | "warning" | "danger";
  streak?: number;
}

interface SessionResult {
  title: string;
  score: number;
  alignment: number;
  correctionSpeed: number;
  stabilityTime: number;
  postureFeedback: string;
  xpEarned: number;
  postureQuality: number;
  reward?: RewardComputationResult;
}

function GameShell({
  running,
  loading,
  error,
  videoRef,
  onStart,
  onStop,
  hud,
  children,
  result,
  footer
}: {
  running: boolean;
  loading: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onStart: () => Promise<void>;
  onStop: () => void;
  hud: ArenaHUD;
  children: ReactNode;
  result: SessionResult | null;
  footer?: ReactNode;
}) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!result) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [result]);

  const progress = clamp((hud.stabilityTime / Math.max(1, hud.goalTime)) * 100, 0, 100);
  const toneClass =
    hud.signal === "aligned"
      ? "text-cyan-100"
      : hud.signal === "tilt"
        ? "text-amber-200"
        : hud.signal === "warning"
          ? "text-orange-200"
          : "text-rose-200";

  return (
    <div className="relative min-h-[68vh] overflow-hidden rounded-[1.5rem] border border-cyan-300/30 bg-[#040916] sm:min-h-[76vh] sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-0 px-game-grid opacity-35" />
      <div className="pointer-events-none absolute inset-0 px-game-vignette" />
      <div className="pointer-events-none absolute inset-0">
        <span className="px-game-particle" style={{ left: "14%", top: "18%", animationDelay: "0s" }} />
        <span className="px-game-particle" style={{ left: "80%", top: "24%", animationDelay: "-2.6s" }} />
        <span className="px-game-particle" style={{ left: "24%", top: "74%", animationDelay: "-1.7s" }} />
        <span className="px-game-particle" style={{ left: "70%", top: "70%", animationDelay: "-4.2s" }} />
      </div>

      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-[0.14]" muted playsInline />

      <div className="relative z-10 flex h-full min-h-[68vh] flex-col items-center justify-between px-4 py-5 sm:min-h-[76vh] sm:px-6 sm:py-8">
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Stability {hud.stabilityTime.toFixed(1)}s</span>
            <span className={toneClass}>{hud.statusText}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-cyan-300/30 bg-slate-900/70">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${progress}%`, transition: "width 180ms ease" }} />
          </div>
        </div>

        <div className="relative flex h-[280px] w-full max-w-5xl items-center justify-center sm:h-[380px] lg:h-[480px]">
          <div className="absolute right-2 top-2 rounded-xl border border-cyan-300/30 bg-slate-900/50 px-3 py-1.5 text-xs text-cyan-100 backdrop-blur-xl sm:right-3 sm:top-4 sm:px-4 sm:py-2 sm:text-sm">
            Streak: {Math.max(0, Math.round(hud.streak ?? 0))}
          </div>
          {children}
        </div>

        <div className="w-full max-w-md space-y-3">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-300/35 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={loading || running}
              onClick={() => void onStart()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-cyan-300/55 bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,211,238,0.28)] transition hover:brightness-110 disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" />
              {loading ? "Initializing" : result ? "Retry" : "Start"}
            </button>
            <button
              type="button"
              disabled={!running}
              onClick={onStop}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-400/35 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:opacity-60"
            >
              <Square className="h-4 w-4" />
              Complete
            </button>
          </div>
          {footer ? <div>{footer}</div> : null}
        </div>
      </div>

      {flash ? <div className="pointer-events-none absolute inset-0 animate-[pxGameFlash_900ms_ease-out] bg-cyan-300/25" /> : null}

      {result ? (
        <div className="absolute inset-x-4 bottom-4 z-20 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-cyan-300/35 bg-slate-950/75 p-4 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Round Summary</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <p>Score: <span className="font-semibold text-cyan-100">{result.score}</span></p>
              <p>Alignment: <span className="font-semibold text-cyan-100">{result.alignment}%</span></p>
              <p>Stability: <span className="font-semibold text-cyan-100">{result.stabilityTime}s</span></p>
              <p>Correction: <span className="font-semibold text-cyan-100">{result.correctionSpeed}</span></p>
            </div>
            <p className="mt-2 text-sm text-cyan-100">{result.postureFeedback}</p>
          </article>
          {result.reward ? <RewardPopup alignmentPercent={result.alignment} reward={result.reward} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export { usePostureFeed, GameShell };
export type { ArenaHUD, SessionResult };
