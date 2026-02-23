"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Activity, PlayCircle, Square } from "lucide-react";
import { BreakReminder } from "@/components/BreakReminder";
import { PostureAlert } from "@/components/PostureAlert";
import { createClient } from "@/lib/supabase/client";
import {
  addFatigueSample,
  calculateFatigueState,
  type FatigueSample,
  type FatigueLevel
} from "@/lib/fatigueDetection";
import {
  applyReminderTriggered,
  applySnooze,
  createBreakState,
  getBreakEvaluationIntervalMs,
  logBreakEvent,
  shouldTriggerBreakReminder,
  speakBreakCue,
  type BreakRecommendation
} from "@/lib/breakLogic";
import type { CoachEvent } from "@/lib/coachPersonality";
import type { PostureFrame } from "@/lib/posture/types";
import { SensorPostureEngine, type SensorPostureFrame } from "@/lib/posture/sensorPosture";
import type { CameraPermissionStatus } from "@/components/CameraSession";
import type { PostureMetrics } from "@/lib/postureEngine";
import { toast } from "sonner";

interface SensorSessionProps {
  onMetrics: (metrics: PostureMetrics) => void;
  onTick: (seconds: number) => void;
  onSessionStop: (durationSeconds: number, alertCount: number, sessionId: string | null, breakTaken: boolean) => void;
  onPermissionChange: (status: CameraPermissionStatus) => void;
  onSensorFrame?: (frame: SensorPostureFrame) => void;
  onPostureFrame?: (frame: PostureFrame) => void;
  onSessionIdChange?: (sessionId: string | null) => void;
  onCoachEvent?: (event: CoachEvent) => void;
}

type SensorAlertType = "forward_head" | "slouch" | "shoulder" | "stability";

const SENSOR_ALERT_COOLDOWN_MS = 3000;
const SENSOR_VIOLATION_MS = 1000;

const riskFromScore = (score: number): PostureMetrics["riskLevel"] => {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "SEVERE";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function SensorSession({
  onMetrics,
  onTick,
  onSessionStop,
  onPermissionChange,
  onSensorFrame,
  onPostureFrame,
  onSessionIdChange,
  onCoachEvent
}: SensorSessionProps) {
  const engineRef = useRef<SensorPostureEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const breakStateRef = useRef(createBreakState());
  const fatigueSamplesRef = useRef<FatigueSample[]>([]);
  const postureScoreHistoryRef = useRef<Array<{ score: number; at: number }>>([]);
  const breakTakenRef = useRef(false);
  const alertCountRef = useRef(0);
  const breakEvalAtRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const sensorAlertStateRef = useRef<{
    firstDetectedAt: Partial<Record<SensorAlertType, number>>;
    lastTriggeredAt: number;
  }>({
    firstDetectedAt: {},
    lastTriggeredAt: 0
  });

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [latestFrame, setLatestFrame] = useState<SensorPostureFrame | null>(null);
  const [activeAlert, setActiveAlert] = useState<{
    type: SensorAlertType;
    message: string;
    active: boolean;
  } | null>(null);
  const [activeBreakRecommendation, setActiveBreakRecommendation] = useState<BreakRecommendation | null>(null);
  const [breakCountdownSeconds, setBreakCountdownSeconds] = useState<number | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);

  const buttonLabel = useMemo(() => {
    if (loading) return "Initializing...";
    if (running) return "Stop Sensor Session";
    return "Start Sensor Session";
  }, [loading, running]);

  useEffect(() => {
    return () => {
      stopSession(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const seconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      setElapsed(seconds);
      onTick(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopBreakCountdown() {
    if (breakCountdownTimerRef.current) {
      clearInterval(breakCountdownTimerRef.current);
      breakCountdownTimerRef.current = null;
    }
    setBreakCountdownSeconds(null);
  }

  async function logBreak(taken: boolean) {
    try {
      const supabase = supabaseRef.current ?? createClient();
      supabaseRef.current = supabase;

      const userId = userIdRef.current;
      if (!userId) {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        userIdRef.current = user?.id ?? null;
      }
      if (!userIdRef.current) return;

      await logBreakEvent(supabase, userIdRef.current, sessionIdRef.current, 120, taken);
    } catch {
      // Break logging should not interrupt session flow.
    }
  }

  function startBreakCountdown() {
    stopBreakCountdown();
    breakTakenRef.current = true;
    setActiveBreakRecommendation(null);
    setBreakCountdownSeconds(120);

    breakCountdownTimerRef.current = setInterval(() => {
      setBreakCountdownSeconds((previous) => {
        if (previous === null) return null;
        if (previous <= 1) {
          void logBreak(true);
          stopBreakCountdown();
          return null;
        }
        return previous - 1;
      });
    }, 1000);
  }

  function snoozeBreakReminder() {
    applySnooze(breakStateRef.current, Date.now());
    setActiveBreakRecommendation(null);
    void logBreak(false);
  }

  function resolveSensorAlert(frame: SensorPostureFrame, now: number): { type: SensorAlertType; message: string } | null {
    const active: SensorAlertType[] = [];
    if (frame.forwardLean) active.push("forward_head");
    if (frame.slouch) active.push("slouch");
    if (frame.sideTilt) active.push("shoulder");
    if (frame.unstable) active.push("stability");

    const priority: SensorAlertType[] = ["slouch", "forward_head", "shoulder", "stability"];
    for (const type of priority) {
      if (!active.includes(type)) {
        delete sensorAlertStateRef.current.firstDetectedAt[type];
      }
    }

    if (now - sensorAlertStateRef.current.lastTriggeredAt < SENSOR_ALERT_COOLDOWN_MS) {
      return null;
    }

    for (const type of priority) {
      if (!active.includes(type)) continue;
      if (!sensorAlertStateRef.current.firstDetectedAt[type]) {
        sensorAlertStateRef.current.firstDetectedAt[type] = now;
        continue;
      }
      if (now - (sensorAlertStateRef.current.firstDetectedAt[type] ?? now) >= SENSOR_VIOLATION_MS) {
        sensorAlertStateRef.current.lastTriggeredAt = now;
        sensorAlertStateRef.current.firstDetectedAt[type] = now;
        if (type === "slouch") return { type, message: "Straighten your back" };
        if (type === "forward_head") return { type, message: "Reduce forward lean" };
        if (type === "shoulder") return { type, message: "Level your device tilt" };
        return { type, message: "Hold steady posture" };
      }
    }

    return null;
  }

  function handleFrame(frame: SensorPostureFrame) {
    if (!runningRef.current) return;
    const now = Date.now();

    setLatestFrame(frame);
    setFallbackActive(frame.confidence < 0.3);
    onSensorFrame?.(frame);
    onPostureFrame?.({
      score: frame.score,
      forwardLean: frame.forwardLean,
      sideTilt: frame.sideTilt,
      unstable: frame.unstable,
      source: "sensor",
      ts: frame.ts
    });

    const symmetry = clamp(100 - Math.abs(frame.roll) * 2.8, 0, 100);
    const stability = clamp(frame.stability, 0, 100);
    const alignment = clamp(frame.score * 0.7 + (100 - Math.abs(frame.pitch) * 1.5) * 0.3, 0, 100);
    onMetrics({
      alignment,
      stability,
      symmetry,
      riskLevel: riskFromScore(frame.score)
    });

    const nextAlert = resolveSensorAlert(frame, now);
    if (nextAlert) {
      alertCountRef.current += 1;
      if (nextAlert.type === "slouch") {
        onCoachEvent?.("slouch");
      }
      setActiveAlert({
        type: nextAlert.type,
        message: nextAlert.message,
        active: true
      });
      toast.warning(nextAlert.message, { duration: 1800 });
    }

    if (breakCountdownTimerRef.current === null && now - breakEvalAtRef.current >= getBreakEvaluationIntervalMs()) {
      breakEvalAtRef.current = now;
      postureScoreHistoryRef.current = [...postureScoreHistoryRef.current, { score: frame.score, at: now }].filter(
        (item) => item.at >= now - 5 * 60 * 1000
      );
      fatigueSamplesRef.current = addFatigueSample(fatigueSamplesRef.current, frame.score, now);
      const fatigueLevel: FatigueLevel = calculateFatigueState(fatigueSamplesRef.current, now).fatigue_level;
      const samples = postureScoreHistoryRef.current;
      const trend =
        samples.length >= 4 ? (samples[samples.length - 1].score <= samples[0].score - 8 ? "declining" : "stable") : "stable";
      const elapsedSeconds = startedAtRef.current ? Math.max(0, Math.floor((now - startedAtRef.current) / 1000)) : elapsed;
      const breakRecommendation = shouldTriggerBreakReminder(
        {
          elapsedSeconds,
          fatigueLevel,
          postureScoreTrend: trend,
          now
        },
        breakStateRef.current
      );

      if (breakRecommendation) {
        applyReminderTriggered(breakStateRef.current, now);
        setActiveBreakRecommendation(breakRecommendation);
        onCoachEvent?.("break");
        speakBreakCue();
        toast.info(breakRecommendation.message, {
          description: breakRecommendation.suggestion,
          duration: breakRecommendation.urgency === "urgent" ? 3000 : 2200
        });
      }
    }
  }

  async function startSession() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      supabaseRef.current = supabase;
      const {
        data: { user }
      } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;

      const startResponse = await fetch("/api/posture/session/start", {
        method: "POST",
        credentials: "include"
      });
      if (!startResponse.ok) {
        const payload = (await startResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to start session.");
      }

      const startPayload = (await startResponse.json()) as { sessionId?: string };
      sessionIdRef.current = startPayload.sessionId ?? null;
      onSessionIdChange?.(sessionIdRef.current);

      engineRef.current?.stop();
      const engine = new SensorPostureEngine({
        onFrame: handleFrame,
        onError: (message) => {
          setError(message);
          onPermissionChange("denied");
        }
      });
      engineRef.current = engine;
      await engine.start();

      setElapsed(0);
      setLatestFrame(null);
      setActiveAlert(null);
      setActiveBreakRecommendation(null);
      stopBreakCountdown();
      setFallbackActive(false);
      alertCountRef.current = 0;
      breakStateRef.current = createBreakState();
      fatigueSamplesRef.current = [];
      postureScoreHistoryRef.current = [];
      breakTakenRef.current = false;
      breakEvalAtRef.current = 0;
      sensorAlertStateRef.current = { firstDetectedAt: {}, lastTriggeredAt: 0 };
      startedAtRef.current = Date.now();
      runningRef.current = true;
      setRunning(true);
      onPermissionChange("granted");
      setLoading(false);
      startTimer();
    } catch (err) {
      setLoading(false);
      setRunning(false);
      runningRef.current = false;
      setError(err instanceof Error ? err.message : "Failed to start sensor session.");
      onPermissionChange("denied");
    }
  }

  function stopSession(notify: boolean) {
    runningRef.current = false;
    stopTimer();
    stopBreakCountdown();
    engineRef.current?.stop();
    engineRef.current = null;

    if (notify && startedAtRef.current) {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      onSessionStop(durationSeconds, alertCountRef.current, sessionIdRef.current, breakTakenRef.current);
    }

    startedAtRef.current = null;
    sessionIdRef.current = null;
    onSessionIdChange?.(null);
    setRunning(false);
    setActiveAlert(null);
    setActiveBreakRecommendation(null);
    setFallbackActive(false);
    sensorAlertStateRef.current = { firstDetectedAt: {}, lastTriggeredAt: 0 };
  }

  return (
    <div className="px-panel w-full overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
          <Activity className="h-4 w-4 text-cyan-300" />
          <p className="text-sm font-medium">Sensor Tracking</p>
        </div>
        <p className="rounded-full border border-slate-300/50 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/70 dark:text-slate-300">{elapsed}s</p>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
          <p>Score: {Math.round(latestFrame?.score ?? 0)}</p>
          <p>Confidence: {Math.round((latestFrame?.confidence ?? 0) * 100)}%</p>
          <p>Pitch: {Math.round(latestFrame?.pitch ?? 0)}°</p>
          <p>Roll: {Math.round(latestFrame?.roll ?? 0)}°</p>
          <p>Stability: {Math.round(latestFrame?.stability ?? 0)}%</p>
          <p>Yaw drift: {Math.round(latestFrame?.yawDrift ?? 0)}°</p>
        </div>
        <PostureAlert active={Boolean(activeAlert?.active)} type={activeAlert?.type ?? null} message={activeAlert?.message ?? null} />
        <BreakReminder
          active={Boolean(activeBreakRecommendation)}
          recommendation={activeBreakRecommendation}
          countdownSeconds={breakCountdownSeconds}
          onStartBreak={startBreakCountdown}
          onSnooze={snoozeBreakReminder}
        />
      </div>

      {error ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-300/60 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {running && fallbackActive ? (
        <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Sensor signal is limited. Running inactivity posture estimation fallback.
        </div>
      ) : null}

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/45 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:shadow-[0_12px_28px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          if (running) {
            stopSession(true);
            return;
          }
          void startSession();
        }}
        disabled={loading}
      >
        {running ? <Square className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
        {buttonLabel}
      </button>
    </div>
  );
}

