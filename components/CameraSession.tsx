"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, PlayCircle, Square, Video } from "lucide-react";
import { CoachingBubble } from "@/components/CoachingBubble";
import { LandmarkOverlay } from "@/components/LandmarkOverlay";
import { PostureAlert } from "@/components/PostureAlert";
import { BreakReminder } from "@/components/BreakReminder";
import { createClient } from "@/lib/supabase/client";
import type { PostureCoachingMetrics } from "@/lib/postureCoaching";
import { usePostureCoaching } from "@/lib/usePostureCoaching";
import {
  PostureEngine,
  type PoseLandmark,
  type PostureMetrics
} from "@/lib/postureEngine";
import {
  addFatigueSample,
  calculateFatigueState,
  type FatigueSample,
  type FatigueLevel,
} from "@/lib/fatigueDetection";
import {
  applyReminderTriggered,
  applySnooze,
  createBreakState,
  getBreakEvaluationIntervalMs,
  logBreakEvent,
  shouldTriggerBreakReminder,
  speakBreakCue,
  type BreakRecommendation,
} from "@/lib/breakLogic";
import {
  createPostureAlertState,
  buildPostureTelemetry,
  evaluatePostureAlerts,
  speakPostureCue,
  type PostureAlertType
} from "@/lib/postureAlerts";
import type { PostureFrame } from "@/lib/posture/types";
import { toast } from "sonner";
import type { CoachEvent } from "@/lib/coachPersonality";

export type CameraPermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported"
  | "unknown";

interface CameraSessionProps {
  onMetrics: (metrics: PostureMetrics) => void;
  onTick: (seconds: number) => void;
  onSessionStop: (durationSeconds: number, alertCount: number, sessionId: string | null, breakTaken: boolean) => void;
  onPermissionChange: (status: CameraPermissionStatus) => void;
  onPostureFrame?: (frame: PostureFrame) => void;
  onSessionIdChange?: (sessionId: string | null) => void;
  onCoachEvent?: (event: CoachEvent) => void;
}

export function CameraSession({
  onMetrics,
  onTick,
  onSessionStop,
  onPermissionChange,
  onPostureFrame,
  onSessionIdChange,
  onCoachEvent
}: CameraSessionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<PostureEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breakCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const alertStateRef = useRef(createPostureAlertState());
  const breakStateRef = useRef(createBreakState());
  const fatigueSamplesRef = useRef<FatigueSample[]>([]);
  const postureScoreHistoryRef = useRef<Array<{ score: number; at: number }>>([]);
  const breakTakenRef = useRef(false);
  const alertCountRef = useRef(0);
  const voiceEnabledRef = useRef(true);
  const breakEvalAtRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{
    type: PostureAlertType;
    message: string;
    active: boolean;
  } | null>(null);
  const [activeBreakRecommendation, setActiveBreakRecommendation] = useState<BreakRecommendation | null>(null);
  const [breakCountdownSeconds, setBreakCountdownSeconds] = useState<number | null>(null);
  const [coachingMetrics, setCoachingMetrics] = useState<PostureCoachingMetrics | null>(null);
  const { feedback: coachingFeedback, tips: coachingTips } = usePostureCoaching(coachingMetrics);

  const buttonLabel = useMemo(() => {
    if (loading) return "Initializing...";
    if (running) return "Stop Session";
    return "Start Session";
  }, [loading, running]);

  useEffect(() => {
    return () => {
      stopSession(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getSessionErrorMessage(errorValue: unknown): string {
    if (errorValue instanceof DOMException) {
      if (errorValue.name === "NotAllowedError" || errorValue.name === "SecurityError") {
        return "Camera permission denied. Allow camera access in browser settings and try again.";
      }
      if (errorValue.name === "NotFoundError") {
        return "No camera device found. Connect a webcam and try again.";
      }
      if (errorValue.name === "NotReadableError") {
        return "Camera is in use by another app. Close other apps using the camera and retry.";
      }
      return errorValue.message || "Browser blocked camera access.";
    }

    if (errorValue instanceof Error) {
      if (errorValue.message.toLowerCase().includes("fetch")) {
        return "Camera opened, but AI model failed to load. Check internet access and retry.";
      }
      return errorValue.message;
    }

    if (typeof errorValue === "string") {
      return errorValue;
    }

    if (errorValue && typeof errorValue === "object") {
      const record = errorValue as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      const message = typeof record.message === "string" ? record.message : "";

      if (name || message) {
        return `${name ? `${name}: ` : ""}${message || "Unknown browser error."}`;
      }
    }

    return `Unknown startup failure (${String(errorValue)}).`;
  }

  async function readPermissionState(): Promise<CameraPermissionStatus> {
    if (typeof navigator === "undefined") {
      return "unknown";
    }

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
      return "unsupported";
    }

    if (!("permissions" in navigator) || !navigator.permissions?.query) {
      return "unknown";
    }

    try {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName
      });
      return status.state;
    } catch {
      return "unknown";
    }
  }

  function resolvePostureTrend(now: number): "declining" | "stable" | "improving" {
    const cutoff = now - 2 * 60 * 1000;
    const trendSamples = postureScoreHistoryRef.current.filter((item) => item.at >= cutoff);
    if (trendSamples.length < 4) {
      return "stable";
    }

    const oldest = trendSamples[0].score;
    const latest = trendSamples[trendSamples.length - 1].score;
    if (latest <= oldest - 8) return "declining";
    if (latest >= oldest + 8) return "improving";
    return "stable";
  }

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

  async function requestCameraStream() {
    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      { video: true, audio: false }
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (errorValue) {
        lastError = errorValue;
      }
    }

    throw lastError ?? new Error("Unable to open camera stream.");
  }

  async function waitForVideoReady(video: HTMLVideoElement) {
    if (video.readyState >= 2) return;
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Video stream failed to initialize."));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Camera stream timed out while initializing."));
      }, 6000);
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("canplay", onLoaded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("canplay", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
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

  function stopBreakCountdown() {
    if (breakCountdownTimerRef.current) {
      clearInterval(breakCountdownTimerRef.current);
      breakCountdownTimerRef.current = null;
    }
    setBreakCountdownSeconds(null);
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

  async function processFrame() {
    if (!videoRef.current || !engineRef.current || !runningRef.current) {
      return;
    }

    const frame = await engineRef.current.analyze(videoRef.current);
    if (frame) {
      setLandmarks(frame.landmarks);
      onMetrics(frame.metrics);
      setFallbackActive(Boolean(frame.fallback));
      const score = Math.round((frame.metrics.alignment + frame.metrics.stability + frame.metrics.symmetry) / 3);
      const telemetry = !frame.fallback && frame.landmarks.length > 0 ? buildPostureTelemetry(frame.landmarks, frame.metrics) : null;
      onPostureFrame?.({
        score,
        forwardLean: Boolean(telemetry && telemetry.neckAngle < 165),
        sideTilt: Boolean(telemetry && telemetry.shoulderTilt > 8),
        unstable: frame.metrics.stability < 70,
        source: "camera",
        ts: Date.now()
      });

      if (!frame.fallback && frame.landmarks.length > 0) {
        if (telemetry) {
          const headForwardAngle = Math.max(0, 180 - telemetry.neckAngle);
          setCoachingMetrics({
            head_forward_angle: headForwardAngle,
            shoulder_tilt: telemetry.shoulderTilt,
            spine_angle: telemetry.trunkAngle,
            score
          });
        }
      }

      if (!frame.fallback && frame.landmarks.length > 0) {
        const nextAlert = evaluatePostureAlerts(frame.landmarks, frame.metrics, alertStateRef.current, Date.now());
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
          if (voiceEnabledRef.current) {
            speakPostureCue(nextAlert.message);
          }

          if (alertHideTimerRef.current) {
            clearTimeout(alertHideTimerRef.current);
          }
          alertHideTimerRef.current = setTimeout(() => {
            setActiveAlert((previous) => (previous ? { ...previous, active: false } : null));
          }, 2000);
        }
      }

      if (!frame.fallback && breakCountdownTimerRef.current === null) {
        const now = Date.now();
        if (now - breakEvalAtRef.current >= getBreakEvaluationIntervalMs()) {
          breakEvalAtRef.current = now;
          const postureScore = Math.round((frame.metrics.alignment + frame.metrics.stability + frame.metrics.symmetry) / 3);
          postureScoreHistoryRef.current = [...postureScoreHistoryRef.current, { score: postureScore, at: now }].filter(
            (item) => item.at >= now - 5 * 60 * 1000
          );
          fatigueSamplesRef.current = addFatigueSample(fatigueSamplesRef.current, postureScore, now);
          const fatigueLevel: FatigueLevel = calculateFatigueState(fatigueSamplesRef.current, now).fatigue_level;
          const postureScoreTrend = resolvePostureTrend(now);
          const elapsedSeconds = startedAtRef.current ? Math.max(0, Math.floor((now - startedAtRef.current) / 1000)) : elapsed;
          const breakRecommendation = shouldTriggerBreakReminder(
            {
              elapsedSeconds,
              fatigueLevel,
              postureScoreTrend,
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
    }

    rafRef.current = requestAnimationFrame(() => {
      void processFrame();
    });
  }

  async function startSession() {
    setLoading(true);
    setError(null);
    setVideoReady(false);

    let stage = "initialization";
    const permission = await readPermissionState();
    onPermissionChange(permission);

    try {
      stage = "secure-context check";
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!window.isSecureContext && !isLocalhost) {
        throw new Error("Camera requires HTTPS (or localhost). Open the app over HTTPS and try again.");
      }

      stage = "browser camera API check";
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access.");
      }

      stage = "camera device access";
      const mediaStream = await requestCameraStream();

      streamRef.current = mediaStream;

      if (!videoRef.current) {
        throw new Error("Video element is not available.");
      }

      stage = "video stream attach";
      videoRef.current.srcObject = mediaStream;
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.volume = 0;
      await waitForVideoReady(videoRef.current);
      await videoRef.current.play();
      setVideoReady(true);

      stage = "AI model initialization";
      const engine = new PostureEngine();
      await engine.initialize();
      engineRef.current = engine;

      const supabase = createClient();
      supabaseRef.current = supabase;
      const {
        data: { user }
      } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;

      try {
        const startResponse = await fetch("/api/posture/session/start", {
          method: "POST",
          credentials: "include"
        });
        if (startResponse.ok) {
          const startPayload = (await startResponse.json()) as { sessionId?: string };
          sessionIdRef.current = startPayload.sessionId ?? null;
          onSessionIdChange?.(sessionIdRef.current);
        } else {
          const payload = (await startResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Unable to start session.");
        }
      } catch (errorValue) {
        const message =
          errorValue instanceof Error
            ? errorValue.message
            : "Unable to start session. Please check your plan limits and try again.";
        throw new Error(message);
      }

      stage = "session loop start";
      setElapsed(0);
      setFallbackActive(false);
      setActiveAlert(null);
      setActiveBreakRecommendation(null);
      stopBreakCountdown();
      alertCountRef.current = 0;
      alertStateRef.current = createPostureAlertState();
      breakStateRef.current = createBreakState();
      fatigueSamplesRef.current = [];
      postureScoreHistoryRef.current = [];
      breakTakenRef.current = false;
      breakEvalAtRef.current = 0;
      startedAtRef.current = Date.now();
      runningRef.current = true;
      setRunning(true);
      onPermissionChange("granted");
      setLoading(false);
      startTimer();
      void processFrame();
    } catch (sessionError) {
      const message = getSessionErrorMessage(sessionError);
      console.error("Camera start failure:", { stage, sessionError });
      setError(`Failed at ${stage}. ${message}`);
      setLoading(false);
      setRunning(false);
      setVideoReady(false);
      runningRef.current = false;

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }

      if (permission !== "denied") {
        onPermissionChange("denied");
      }
    }
  }

  function stopSession(notify: boolean) {
    runningRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    stopTimer();
    if (alertHideTimerRef.current) {
      clearTimeout(alertHideTimerRef.current);
      alertHideTimerRef.current = null;
    }
    stopBreakCountdown();
    engineRef.current?.stop();
    engineRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (notify && startedAtRef.current) {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      onSessionStop(durationSeconds, alertCountRef.current, sessionIdRef.current, breakTakenRef.current);
    }

    startedAtRef.current = null;
    setRunning(false);
    setVideoReady(false);
    setLandmarks([]);
    setFallbackActive(false);
    setActiveAlert(null);
    setActiveBreakRecommendation(null);
    setCoachingMetrics(null);
    alertStateRef.current = createPostureAlertState();
    breakStateRef.current = createBreakState();
    fatigueSamplesRef.current = [];
    postureScoreHistoryRef.current = [];
    breakTakenRef.current = false;
    breakEvalAtRef.current = 0;
    sessionIdRef.current = null;
    onSessionIdChange?.(null);
  }

  return (
    <div className="px-panel w-full overflow-hidden p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
          <Video className="h-4 w-4 text-cyan-300" />
          <p className="text-sm font-medium">Live Camera</p>
        </div>
        <p className="rounded-full border border-slate-300/50 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/70 dark:text-slate-300">{elapsed}s</p>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
        {!running ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center">
            <div className="rounded-xl border border-slate-300/35 bg-slate-900/65 px-4 py-2 text-xs text-slate-200">
              {error?.toLowerCase().includes("permission")
                ? "Camera permission is blocked. Enable it in browser settings, then retry."
                : "Tap Start Session to enable live camera preview."}
            </div>
          </div>
        ) : null}
        {running && !videoReady ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-950/35 text-xs text-slate-200">
            Connecting camera...
          </div>
        ) : null}
        <LandmarkOverlay landmarks={landmarks} />
        <PostureAlert active={Boolean(activeAlert?.active)} type={activeAlert?.type ?? null} message={activeAlert?.message ?? null} />
        {running ? <CoachingBubble feedback={coachingFeedback} tips={coachingTips} /> : null}
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
          AI model assets are unavailable. Running in fallback metrics mode.
        </div>
      ) : null}

      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-base font-semibold text-white transition hover:shadow-[0_12px_28px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
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
