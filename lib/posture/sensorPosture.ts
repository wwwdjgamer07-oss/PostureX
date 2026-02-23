import type { PostureFrame } from "@/lib/posture/types";

export interface SensorPostureFrame extends PostureFrame {
  mode: "sensor";
  confidence: number;
  forwardLean: boolean;
  sideTilt: boolean;
  unstable: boolean;
  slouch: boolean;
  yawDrift: number;
  pitch: number;
  roll: number;
  stability: number;
  timestamp: string;
}

export interface SensorPostureConfig {
  sampleIntervalMs: number;
  emitDebounceMs: number;
  forwardThresholdDeg: number;
  rollThresholdDeg: number;
  unstableThreshold: number;
  slouchSustainMs: number;
}

export interface SensorAvailability {
  supported: boolean;
  hasOrientation: boolean;
  hasMotion: boolean;
  isPhone: boolean;
}

export interface SensorPostureEngineOptions {
  onFrame: (frame: SensorPostureFrame) => void;
  onError?: (message: string) => void;
  config?: Partial<SensorPostureConfig>;
}

interface MotionSample {
  ts: number;
  pitch: number;
  roll: number;
  yaw: number;
  movement: number;
}

const DEFAULT_CONFIG: SensorPostureConfig = {
  sampleIntervalMs: 66, // ~15Hz
  emitDebounceMs: 200,
  forwardThresholdDeg: 18,
  rollThresholdDeg: 14,
  unstableThreshold: 7.5,
  slouchSustainMs: 2500
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toFinite(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeAngleDeg(angle: number) {
  if (!Number.isFinite(angle)) return 0;
  let out = angle % 360;
  if (out > 180) out -= 360;
  if (out < -180) out += 360;
  return out;
}

function angleDelta(a: number, b: number) {
  return normalizeAngleDeg(a - b);
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sq = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return sq;
}

function confidenceFromSignals(input: { hasOrientation: boolean; hasMotion: boolean; sampleCount: number }) {
  let score = 0.35;
  if (input.hasOrientation) score += 0.35;
  if (input.hasMotion) score += 0.2;
  if (input.sampleCount >= 20) score += 0.1;
  return clamp(score, 0.1, 1);
}

function inactivityFallbackFrame(ts = Date.now()): SensorPostureFrame {
  const t = ts / 1000;
  const score = clamp(66 + Math.sin(t * 0.37) * 8, 0, 100);
  return {
    mode: "sensor",
    score,
    forwardLean: false,
    sideTilt: false,
    unstable: false,
    slouch: false,
    confidence: 0.25,
    yawDrift: 0,
    pitch: 0,
    roll: 0,
    stability: 65,
    source: "sensor",
    ts,
    timestamp: new Date(ts).toISOString()
  };
}

export async function requestSensorPermissions(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let orientationGranted = true;
  let motionGranted = true;

  const orientationRequest = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
    .requestPermission;
  const motionRequest = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;

  if (typeof orientationRequest === "function") {
    try {
      orientationGranted = (await orientationRequest.call(DeviceOrientationEvent)) === "granted";
    } catch {
      orientationGranted = false;
    }
  }

  if (typeof motionRequest === "function") {
    try {
      motionGranted = (await motionRequest.call(DeviceMotionEvent)) === "granted";
    } catch {
      motionGranted = false;
    }
  }

  return orientationGranted || motionGranted;
}

export function getSensorAvailability(): SensorAvailability {
  if (typeof window === "undefined") {
    return { supported: false, hasOrientation: false, hasMotion: false, isPhone: false };
  }

  const hasOrientation = "DeviceOrientationEvent" in window;
  const hasMotion = "DeviceMotionEvent" in window;
  const ua = String(navigator.userAgent || "").toLowerCase();
  const mobileHint = "userAgentData" in navigator ? Boolean((navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile) : false;
  const isTablet =
    /ipad|tablet|playbook|silk|kindle/.test(ua) ||
    (/\bandroid\b/.test(ua) && !/\bmobile\b/.test(ua)) ||
    (/\bmacintosh\b/.test(ua) && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1);
  const isPhone = (mobileHint || /\bmobile\b|iphone|ipod|windows phone/.test(ua)) && !isTablet;
  return {
    supported: (hasOrientation || hasMotion) && isPhone,
    hasOrientation,
    hasMotion,
    isPhone
  };
}

export class SensorPostureEngine {
  private readonly onFrame: (frame: SensorPostureFrame) => void;
  private readonly onError?: (message: string) => void;
  private readonly config: SensorPostureConfig;
  private started = false;
  private orientation: { alpha: number; beta: number; gamma: number } = { alpha: 0, beta: 0, gamma: 0 };
  private motionMagnitude = 0;
  private history: MotionSample[] = [];
  private baselineYaw: number | null = null;
  private forwardLeanAt: number | null = null;
  private badPostureStartedAt: number | null = null;
  private sustainedBadMs = 0;
  private lastSampleAt = 0;
  private lastEmitAt = 0;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: SensorPostureEngineOptions) {
    this.onFrame = options.onFrame;
    this.onError = options.onError;
    this.config = { ...DEFAULT_CONFIG, ...(options.config ?? {}) };
  }

  async start() {
    if (this.started || typeof window === "undefined") return;

    const availability = getSensorAvailability();
    this.started = true;

    if (!availability.supported) {
      this.startFallbackLoop();
      return;
    }

    const granted = await requestSensorPermissions();
    if (!granted) {
      this.onError?.("Sensor permission not granted.");
      this.startFallbackLoop();
      return;
    }

    window.addEventListener("deviceorientation", this.handleOrientation, { passive: true });
    window.addEventListener("devicemotion", this.handleMotion, { passive: true });
    this.startFallbackLoop();
  }

  stop() {
    if (!this.started || typeof window === "undefined") return;
    this.started = false;
    window.removeEventListener("deviceorientation", this.handleOrientation);
    window.removeEventListener("devicemotion", this.handleMotion);
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.history = [];
    this.forwardLeanAt = null;
    this.badPostureStartedAt = null;
    this.sustainedBadMs = 0;
    this.baselineYaw = null;
    this.lastSampleAt = 0;
    this.lastEmitAt = 0;
  }

  private startFallbackLoop() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
    this.fallbackTimer = setInterval(() => {
      if (!this.started) return;
      const now = Date.now();
      if (now - this.lastEmitAt < this.config.emitDebounceMs) return;
      this.lastEmitAt = now;
      this.onFrame(this.createFrame(now));
    }, this.config.emitDebounceMs);
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.started) return;
    this.orientation = {
      alpha: toFinite(event.alpha),
      beta: toFinite(event.beta),
      gamma: toFinite(event.gamma)
    };
    this.captureSample(Date.now());
  };

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.started) return;
    const motion = event.accelerationIncludingGravity ?? event.acceleration;
    if (motion) {
      const x = toFinite(motion.x);
      const y = toFinite(motion.y);
      const z = toFinite(motion.z);
      this.motionMagnitude = Math.sqrt(x * x + y * y + z * z);
    }
    this.captureSample(Date.now());
  };

  private captureSample(now: number) {
    if (now - this.lastSampleAt < this.config.sampleIntervalMs) return;
    this.lastSampleAt = now;

    const pitch = normalizeAngleDeg(this.orientation.beta);
    const roll = normalizeAngleDeg(this.orientation.gamma);
    const yaw = normalizeAngleDeg(this.orientation.alpha);
    if (this.baselineYaw === null) {
      this.baselineYaw = yaw;
    }

    this.history.push({
      ts: now,
      pitch,
      roll,
      yaw,
      movement: this.motionMagnitude
    });
    this.history = this.history.filter((item) => item.ts >= now - 5000);

    if (now - this.lastEmitAt >= this.config.emitDebounceMs) {
      this.lastEmitAt = now;
      this.onFrame(this.createFrame(now));
    }
  }

  private createFrame(now: number): SensorPostureFrame {
    if (this.history.length === 0) {
      return inactivityFallbackFrame(now);
    }

    const latest = this.history[this.history.length - 1];
    const pitch = latest.pitch;
    const roll = latest.roll;
    const yawDrift = Math.abs(angleDelta(latest.yaw, this.baselineYaw ?? latest.yaw));
    const movementVar = variance(this.history.map((item) => item.movement));
    const orientationVar = variance(
      this.history.map((item) => Math.abs(item.pitch) + Math.abs(item.roll) * 0.8 + Math.abs(angleDelta(item.yaw, this.baselineYaw ?? item.yaw)) * 0.2)
    );

    const stability = clamp(100 - Math.sqrt(movementVar * 28 + orientationVar * 9), 0, 100);
    const unstable = stability < 100 - this.config.unstableThreshold * 4;
    const forwardLean = pitch > this.config.forwardThresholdDeg;
    const sideTilt = Math.abs(roll) > this.config.rollThresholdDeg;

    if (forwardLean) {
      if (this.forwardLeanAt === null) this.forwardLeanAt = now;
    } else {
      this.forwardLeanAt = null;
    }

    const slouch = Boolean(this.forwardLeanAt && now - this.forwardLeanAt >= this.config.slouchSustainMs && unstable);
    const badPostureNow = forwardLean || sideTilt || unstable;
    if (badPostureNow) {
      if (this.badPostureStartedAt === null) this.badPostureStartedAt = now;
      this.sustainedBadMs += Math.max(0, now - (this.history[this.history.length - 2]?.ts ?? now));
    } else {
      this.badPostureStartedAt = null;
      this.sustainedBadMs = Math.max(0, this.sustainedBadMs - this.config.emitDebounceMs);
    }

    const forwardSeverity = clamp((pitch - this.config.forwardThresholdDeg) * 1.9, 0, 35);
    const rollSeverity = clamp((Math.abs(roll) - this.config.rollThresholdDeg) * 1.8, 0, 25);
    const instabilityPenalty = clamp((100 - stability) * 0.45, 0, 28);
    const sustainedPenalty = clamp(this.sustainedBadMs / 1000, 0, 18);
    const score = clamp(100 - forwardSeverity - rollSeverity - instabilityPenalty - sustainedPenalty, 0, 100);

    const availability = getSensorAvailability();
    const confidence = confidenceFromSignals({
      hasOrientation: availability.hasOrientation,
      hasMotion: availability.hasMotion,
      sampleCount: this.history.length
    });

    return {
      mode: "sensor",
      score,
      forwardLean,
      sideTilt,
      unstable,
      slouch,
      confidence,
      yawDrift,
      pitch,
      roll,
      stability,
      source: "sensor",
      ts: now,
      timestamp: new Date(now).toISOString()
    };
  }
}
