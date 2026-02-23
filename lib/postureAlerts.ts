import type { PoseLandmark, PostureMetrics } from "@/lib/postureEngine";

export type PostureAlertType = "forward_head" | "slouch" | "shoulder" | "stability";

export interface PostureTelemetry {
  neckAngle: number;
  trunkAngle: number;
  shoulderTilt: number;
  stability: number;
}

export interface TriggeredPostureAlert {
  type: PostureAlertType;
  message: string;
  telemetry: PostureTelemetry;
  at: number;
}

export interface PostureAlertState {
  firstDetectedAt: Partial<Record<PostureAlertType, number>>;
  lastTriggeredAt: number;
}

const VIOLATION_MS = 1000;
const COOLDOWN_MS = 3000;

const ALERT_MESSAGES: Record<PostureAlertType, string> = {
  forward_head: "Head too forward",
  slouch: "Straighten your back",
  shoulder: "Level shoulders",
  stability: "Hold steady posture"
};

interface Point2D {
  x: number;
  y: number;
}

function radToDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

function angleBetween(a: Point2D, b: Point2D) {
  const dot = a.x * b.x + a.y * b.y;
  const magA = Math.sqrt(a.x * a.x + a.y * a.y);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y);
  if (magA === 0 || magB === 0) return 180;
  const value = Math.max(-1, Math.min(1, dot / (magA * magB)));
  return radToDeg(Math.acos(value));
}

function midpoint(a: PoseLandmark, b: PoseLandmark): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

export function speakPostureCue(message: string) {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function buildPostureTelemetry(landmarks: PoseLandmark[], metrics: PostureMetrics): PostureTelemetry | null {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftEar || !rightEar) {
    return null;
  }

  const shoulderCenter = midpoint(leftShoulder, rightShoulder);
  const hipCenter = midpoint(leftHip, rightHip);
  const earCenter = midpoint(leftEar, rightEar);

  const torsoVector = { x: hipCenter.x - shoulderCenter.x, y: hipCenter.y - shoulderCenter.y };
  const neckVector = { x: earCenter.x - shoulderCenter.x, y: earCenter.y - shoulderCenter.y };

  const neckAngle = angleBetween(neckVector, torsoVector);
  const trunkAngle = radToDeg(Math.atan2(Math.abs(torsoVector.x), Math.abs(torsoVector.y) || 0.00001));
  const shoulderTilt = radToDeg(
    Math.atan2(Math.abs(leftShoulder.y - rightShoulder.y), Math.abs(leftShoulder.x - rightShoulder.x) || 0.00001)
  );

  return {
    neckAngle,
    trunkAngle,
    shoulderTilt,
    stability: metrics.stability
  };
}

function detectViolations(telemetry: PostureTelemetry): PostureAlertType[] {
  const alerts: PostureAlertType[] = [];
  if (telemetry.neckAngle < 165) alerts.push("forward_head");
  if (telemetry.trunkAngle > 12) alerts.push("slouch");
  if (telemetry.shoulderTilt > 8) alerts.push("shoulder");
  if (telemetry.stability < 70) alerts.push("stability");
  return alerts;
}

export function evaluatePostureAlerts(
  landmarks: PoseLandmark[],
  metrics: PostureMetrics,
  state: PostureAlertState,
  now = Date.now()
): TriggeredPostureAlert | null {
  const telemetry = buildPostureTelemetry(landmarks, metrics);
  if (!telemetry) return null;

  const activeViolations = detectViolations(telemetry);
  const priority: PostureAlertType[] = ["forward_head", "slouch", "shoulder", "stability"];

  for (const type of priority) {
    if (!activeViolations.includes(type)) {
      delete state.firstDetectedAt[type];
    }
  }

  if (now - state.lastTriggeredAt < COOLDOWN_MS) {
    return null;
  }

  for (const type of priority) {
    if (!activeViolations.includes(type)) continue;

    if (!state.firstDetectedAt[type]) {
      state.firstDetectedAt[type] = now;
      continue;
    }

    if (now - (state.firstDetectedAt[type] ?? now) >= VIOLATION_MS) {
      state.lastTriggeredAt = now;
      state.firstDetectedAt[type] = now;
      return {
        type,
        message: ALERT_MESSAGES[type],
        telemetry,
        at: now
      };
    }
  }

  return null;
}

export function createPostureAlertState(): PostureAlertState {
  return {
    firstDetectedAt: {},
    lastTriggeredAt: 0
  };
}
