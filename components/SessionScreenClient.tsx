"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, Timer, Video } from "lucide-react";
import { CameraSession, type CameraPermissionStatus } from "@/components/CameraSession";
import { SensorSession } from "@/components/SensorSession";
import { DevicePostureGauge } from "@/components/DevicePostureGauge";
import { CoachAvatarBubble } from "@/components/CoachAvatarBubble";
import { FatigueIndicatorBar } from "@/components/FatigueIndicatorBar";
import type { FatigueLevel } from "@/lib/fatigueDetection";
import type { CoachEvent } from "@/lib/coachPersonality";
import { generate_coach_message } from "@/lib/coachPersonality";
import { getSensorAvailability, type SensorPostureFrame } from "@/lib/posture/sensorPosture";
import { detectMobile, hasMobileSensorSupport } from "@/lib/mobileSensor";
import type { PostureFrame, PostureMode, PostureSource } from "@/lib/posture/types";
import { usePostureFatigue } from "@/lib/usePostureFatigue";
import type { PostureMetrics, RiskLevel } from "@/lib/postureEngine";
import { toast } from "sonner";

const defaultMetrics: PostureMetrics = {
  alignment: 0,
  stability: 0,
  symmetry: 0,
  riskLevel: "LOW"
};

const riskTone: Record<RiskLevel, string> = {
  LOW: "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
  MODERATE: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-200",
  HIGH: "border-orange-400/35 bg-orange-400/10 text-orange-700 dark:text-orange-200",
  SEVERE: "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-200"
};

export function SessionScreenClient() {
  const [metrics, setMetrics] = useState<PostureMetrics>(defaultMetrics);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>("unknown");
  const [postureMode, setPostureMode] = useState<PostureMode>("auto");
  const [resolvedSource, setResolvedSource] = useState<PostureSource>("camera");
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [sensorPhoneOnly, setSensorPhoneOnly] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [sensorAutoFailed, setSensorAutoFailed] = useState(false);
  const [latestSensorFrame, setLatestSensorFrame] = useState<SensorPostureFrame | null>(null);

  const postureScore = useMemo(
    () => Math.round((metrics.alignment + metrics.stability + metrics.symmetry) / 3),
    [metrics.alignment, metrics.stability, metrics.symmetry]
  );
  const availableModes = useMemo<readonly PostureMode[]>(
    () => (sensorPhoneOnly ? (["auto", "camera", "sensor"] as const) : (["auto", "camera"] as const)),
    [sensorPhoneOnly]
  );
  const fatigue = usePostureFatigue(postureScore);
  const previousFatigueLevelRef = useRef<FatigueLevel>("none");
  const coachLastEventAtRef = useRef(0);
  const streakMessageShownRef = useRef(false);
  const postureSamplesRef = useRef<number[]>([]);
  const autoFallbackTriggeredRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastRecordSavedAtRef = useRef(0);
  const [coachMessage, setCoachMessage] = useState("Welcome back. Settle in and we'll keep your posture smooth.");

  const resolvePostureSource = useCallback(
    (mode: PostureMode, cameraReady: boolean, canUseSensor: boolean): PostureSource => {
      if (mode === "camera") return "camera";
      if (mode === "sensor") return canUseSensor ? "sensor" : "camera";
      if (cameraReady) return "camera";
      return canUseSensor ? "sensor" : "camera";
    },
    []
  );

  useEffect(() => {
    let active = true;
    const detectCamera = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!active) return;
        setCameraAvailable(false);
        setResolvedSource(resolvePostureSource(postureMode, false, sensorAvailable));
        return;
      }

      try {
        if (!navigator.permissions?.query) {
          if (!active) return;
          setCameraAvailable(true);
          setResolvedSource(resolvePostureSource(postureMode, true, sensorAvailable));
          return;
        }

        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        const ready = status.state !== "denied";
        if (!active) return;
        setCameraAvailable(ready);
        setResolvedSource(resolvePostureSource(postureMode, ready, sensorAvailable));
      } catch {
        if (!active) return;
        setCameraAvailable(true);
        setResolvedSource(resolvePostureSource(postureMode, true, sensorAvailable));
      }
    };

    void detectCamera();
    return () => {
      active = false;
    };
  }, [postureMode, resolvePostureSource, sensorAvailable]);

  useEffect(() => {
    // Resolve browser-only sensor support after mount to avoid SSR/client hydration mismatch.
    const availability = getSensorAvailability();
    setSensorAvailable(availability.supported);
    setSensorPhoneOnly(availability.isPhone);
    setIsMobileDevice(detectMobile());
  }, []);

  const shouldAutoSensorStart = useMemo(
    () => isMobileDevice && hasMobileSensorSupport() && sensorAvailable,
    [isMobileDevice, sensorAvailable]
  );

  useEffect(() => {
    if (shouldAutoSensorStart && postureMode === "auto" && !sensorAutoFailed) {
      setResolvedSource("sensor");
      return;
    }
    if (postureMode !== "auto") {
      setResolvedSource(resolvePostureSource(postureMode, cameraAvailable, sensorAvailable));
      return;
    }
    const blocked = permissionStatus === "denied" || permissionStatus === "unsupported";
    setResolvedSource(blocked && sensorAvailable && !sensorAutoFailed ? "sensor" : resolvePostureSource(postureMode, cameraAvailable, sensorAvailable));
  }, [cameraAvailable, permissionStatus, postureMode, resolvePostureSource, sensorAutoFailed, sensorAvailable, shouldAutoSensorStart]);

  useEffect(() => {
    if (sessionSeconds < 2) {
      autoFallbackTriggeredRef.current = false;
      return;
    }
    if (
      postureMode === "auto" &&
      resolvedSource === "camera" &&
      sensorAvailable &&
      permissionStatus === "granted" &&
      sessionSeconds >= 8 &&
      postureScore <= 5 &&
      !autoFallbackTriggeredRef.current
    ) {
      autoFallbackTriggeredRef.current = true;
      setResolvedSource("sensor");
      toast.info("Switched to sensor tracking", {
        description: "Camera signal is weak or unavailable. Sensor mode is now active."
      });
    }
  }, [permissionStatus, postureMode, postureScore, resolvedSource, sensorAvailable, sessionSeconds]);

  const persistPostureRecord = useCallback(async (frame: PostureFrame) => {
    if (!sessionIdRef.current) return;
    const now = Date.now();
    if (now - lastRecordSavedAtRef.current < 1000) return;
    lastRecordSavedAtRef.current = now;

    const alignment = frame.score;
    const stability = frame.unstable ? Math.max(0, frame.score - 20) : Math.min(100, frame.score + 5);
    const symmetry = frame.sideTilt ? Math.max(0, frame.score - 18) : Math.min(100, frame.score + 6);
    const riskLevel: RiskLevel = frame.score >= 80 ? "LOW" : frame.score >= 60 ? "MODERATE" : frame.score >= 40 ? "HIGH" : "SEVERE";

    try {
      await fetch("/api/posture/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          alignment,
          symmetry,
          stability,
          fatigue: Math.max(0, 100 - frame.score),
          score: frame.score,
          riskLevel,
          source: frame.source,
          timestamp: new Date(frame.ts).toISOString()
        })
      });
    } catch {
      // record persistence is best-effort
    }
  }, []);

  const stopSessionAndSave = useCallback(async (
    durationSeconds: number,
    alertCount: number,
    sessionId: string | null,
    breakTaken: boolean,
    source: PostureSource
  ) => {
    const score = Math.round((metrics.alignment + metrics.stability + metrics.symmetry) / 3);
    try {
      const response = await fetch("/api/posture/session-end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          score,
          duration: durationSeconds,
          alert_count: alertCount,
          session_id: sessionId,
          break_taken: breakTaken,
          source
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save session.");
      }
    } catch (error) {
      toast.error("Session save failed", {
        description: error instanceof Error ? error.message : "Unexpected error while saving session."
      });
    }

    setSessionSeconds(0);
    postureSamplesRef.current = [];
    sessionIdRef.current = null;
    lastRecordSavedAtRef.current = 0;
  }, [metrics.alignment, metrics.stability, metrics.symmetry]);

  const resolveTrend = useCallback(() => {
    const samples = postureSamplesRef.current;
    if (samples.length < 5) return "stable" as const;
    const delta = samples[samples.length - 1] - samples[0];
    if (delta >= 4) return "improving" as const;
    if (delta <= -4) return "declining" as const;
    return "stable" as const;
  }, []);

  const postCoachEvent = useCallback((event: CoachEvent) => {
    const now = Date.now();
    if (now - coachLastEventAtRef.current < 7000) return;
    setCoachMessage((previous) =>
      generate_coach_message(event, previous, {
        fatigueLevel: fatigue.fatigue_level,
        sessionSeconds,
        trend: resolveTrend(),
        riskLevel: metrics.riskLevel,
        hourOfDay: new Date().getHours()
      })
    );
    coachLastEventAtRef.current = now;
  }, [fatigue.fatigue_level, metrics.riskLevel, resolveTrend, sessionSeconds]);

  useEffect(() => {
    postureSamplesRef.current = [...postureSamplesRef.current, postureScore].slice(-8);
  }, [postureScore]);

  useEffect(() => {
    const previous = previousFatigueLevelRef.current;
    if (fatigue.fatigue_level !== previous) {
      if (fatigue.fatigue_level === "low" || fatigue.fatigue_level === "medium" || fatigue.fatigue_level === "high") {
        postCoachEvent("fatigue");
      }
      if (fatigue.fatigue_level === "medium") {
        toast.warning("Tension is building", {
          description: "Take a small reset and let your shoulders drop."
        });
      }
      if (fatigue.fatigue_level === "high") {
        toast.error("Time for a short reset", {
          description: "Stand up, breathe, and walk for about 2 minutes."
        });
      }
      previousFatigueLevelRef.current = fatigue.fatigue_level;
    }
  }, [fatigue.fatigue_level, postCoachEvent]);

  useEffect(() => {
    if (postureScore > 85 && sessionSeconds > 15) {
      postCoachEvent("good_posture");
    }
  }, [postureScore, postCoachEvent, sessionSeconds]);

  useEffect(() => {
    if (!streakMessageShownRef.current && sessionSeconds >= 120 && postureScore >= 80) {
      streakMessageShownRef.current = true;
      postCoachEvent("streak");
    }
    if (sessionSeconds < 10) {
      streakMessageShownRef.current = false;
    }
  }, [postCoachEvent, postureScore, sessionSeconds]);

  return (
    <div className="px-shell space-y-6">
      <header className="px-panel px-reveal p-6" style={{ animationDelay: "50ms" }}>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Session Runtime</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Live Posture Tracking</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Camera + sensor tracking with automatic fallback and unified posture telemetry.</p>
        <div className="mt-4 inline-flex rounded-xl border border-slate-500/30 bg-slate-900/45 p-1">
          {availableModes.map((mode) => {
            const sensorDisabled = mode === "sensor" && !sensorAvailable;
            return (
            <button
              key={mode}
              type="button"
              onClick={() => setPostureMode(mode)}
              disabled={sensorDisabled}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                postureMode === mode ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          Active source: <span className="font-semibold text-cyan-300">{resolvedSource === "camera" ? "Camera Tracking" : "Sensor Tracking"}</span>
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4 px-reveal" style={{ animationDelay: "120ms" }}>
          {resolvedSource === "camera" ? (
            <CameraSession
              onMetrics={(next) => {
                setMetrics(next);
              }}
              onTick={setSessionSeconds}
              onCoachEvent={postCoachEvent}
              onPostureFrame={(frame) => {
                void persistPostureRecord(frame);
              }}
              onSessionIdChange={(nextId) => {
                sessionIdRef.current = nextId;
              }}
              onSessionStop={(durationSeconds, alertCount, sessionId, breakTaken) => {
                void stopSessionAndSave(durationSeconds, alertCount, sessionId, breakTaken, "camera");
              }}
              onPermissionChange={setPermissionStatus}
            />
          ) : (
            <SensorSession
              onMetrics={(next) => {
                setMetrics(next);
              }}
              onTick={setSessionSeconds}
              onCoachEvent={postCoachEvent}
              onSensorFrame={setLatestSensorFrame}
              onPostureFrame={(frame) => {
                void persistPostureRecord(frame);
              }}
              onSessionIdChange={(nextId) => {
                sessionIdRef.current = nextId;
              }}
              onSessionStop={(durationSeconds, alertCount, sessionId, breakTaken) => {
                void stopSessionAndSave(durationSeconds, alertCount, sessionId, breakTaken, "sensor");
              }}
              autoStart={shouldAutoSensorStart}
              onAutoStartFailed={() => {
                setSensorAutoFailed(true);
                setResolvedSource("camera");
              }}
              onPermissionChange={setPermissionStatus}
            />
          )}
        </div>

        <aside className="space-y-4">
          <CoachAvatarBubble message={coachMessage} />

          <article className="px-panel px-reveal px-hover-lift p-5" style={{ animationDelay: "220ms" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Posture Score</p>
              <Video className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="mt-4 grid place-items-center">
              <div className="relative grid h-40 w-40 place-items-center rounded-full border border-cyan-300/35 bg-slate-950/70 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
                <div className="absolute inset-3 rounded-full border border-cyan-300/25" />
                <p className="text-4xl font-semibold text-cyan-200">{postureScore}</p>
              </div>
            </div>
          </article>

          <article className="px-panel px-reveal px-hover-lift p-5" style={{ animationDelay: "300ms" }}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Risk Status</p>
            <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[metrics.riskLevel]}`}>
              {metrics.riskLevel}
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>Alignment: {Math.round(metrics.alignment)}%</p>
              <p>Stability: {Math.round(metrics.stability)}%</p>
              <p>Symmetry: {Math.round(metrics.symmetry)}%</p>
            </div>
          </article>

          <article className="px-panel px-reveal px-hover-lift p-5" style={{ animationDelay: "380ms" }}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Session Timer</p>
            <p className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold text-cyan-200">
              <Timer className="h-5 w-5" />
              {sessionSeconds}s
            </p>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-500">Camera permission: {permissionStatus}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
              Sensor availability: {sensorAvailable ? "available (phone)" : sensorPhoneOnly ? "unavailable on this phone" : "phone only"}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Start and stop controls are available in the active tracking panel.</p>
          </article>

          {resolvedSource === "sensor" && latestSensorFrame ? (
            <DevicePostureGauge pitch={latestSensorFrame.pitch} roll={latestSensorFrame.roll} stability={latestSensorFrame.stability} />
          ) : null}

          <article className="px-panel px-reveal px-hover-lift p-5" style={{ animationDelay: "460ms" }}>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ShieldAlert className="h-4 w-4 text-cyan-300" />
              Control Notes
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Use camera mode for landmark tracking. Sensor mode is enabled on phones only.</p>
          </article>

          <FatigueIndicatorBar fatigue={fatigue} />
        </aside>
      </div>
    </div>
  );
}
