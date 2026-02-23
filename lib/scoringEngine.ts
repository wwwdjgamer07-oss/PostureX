import { clamp } from "@/lib/utils";

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface ScoringSnapshot {
  timestamp: number;
  shoulderMid: PoseLandmark;
  hipMid: PoseLandmark;
  nose: PoseLandmark;
  torsoLeanDeg: number;
  neckTiltDeg: number;
  shoulderTiltDeg: number;
  hipTiltDeg: number;
  velocity: number;
  badFrames: number;
  fatigueAccumulator: number;
}

export interface ScorePayload {
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
  score: number;
  snapshot: ScoringSnapshot;
}

const IDX = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24
};

const distance3D = (a: PoseLandmark, b: PoseLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const midpoint = (a: PoseLandmark, b: PoseLandmark): PoseLandmark => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
  visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1)
});

const radToDeg = (rad: number) => (rad * 180) / Math.PI;

export function calculateAngle3D(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.hypot(ab.x, ab.y, ab.z);
  const magCB = Math.hypot(cb.x, cb.y, cb.z);

  if (magAB === 0 || magCB === 0) return 0;
  return radToDeg(Math.acos(clamp(dot / (magAB * magCB), -1, 1)));
}

const toSymmetryPenalty = (diff: number, tolerance: number) =>
  clamp((Math.abs(diff) / tolerance) * 100, 0, 100);

export function computePostureScores(
  landmarks: PoseLandmark[],
  timestamp: number,
  previous?: ScoringSnapshot
): ScorePayload {
  const leftShoulder = landmarks[IDX.LEFT_SHOULDER];
  const rightShoulder = landmarks[IDX.RIGHT_SHOULDER];
  const leftHip = landmarks[IDX.LEFT_HIP];
  const rightHip = landmarks[IDX.RIGHT_HIP];
  const leftEar = landmarks[IDX.LEFT_EAR];
  const rightEar = landmarks[IDX.RIGHT_EAR];
  const nose = landmarks[IDX.NOSE];

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const earMid = midpoint(leftEar, rightEar);

  const torsoLeanDeg = radToDeg(Math.atan2(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y));
  const neckTiltDeg = radToDeg(Math.atan2(earMid.x - shoulderMid.x, earMid.y - shoulderMid.y));
  const shoulderTiltDeg = radToDeg(Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x));
  const hipTiltDeg = radToDeg(Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x));

  const shoulderWidth = distance3D(leftShoulder, rightShoulder);
  const hipWidth = distance3D(leftHip, rightHip);
  const bodyScale = Math.max((shoulderWidth + hipWidth) / 2, 0.01);

  const velocity = previous
    ? distance3D(shoulderMid, previous.shoulderMid) / Math.max((timestamp - previous.timestamp) / 1000, 0.016)
    : 0;

  const torsoPenalty = clamp(Math.abs(torsoLeanDeg) * 3.2, 0, 100);
  const neckPenalty = clamp(Math.abs(neckTiltDeg) * 3.8, 0, 100);
  const forwardHeadPenalty = clamp(((nose.z - shoulderMid.z) / bodyScale) * 120, 0, 100);

  const alignment = clamp(100 - torsoPenalty * 0.42 - neckPenalty * 0.38 - forwardHeadPenalty * 0.2, 0, 100);

  const shoulderDiff = (leftShoulder.y - rightShoulder.y) / bodyScale;
  const hipDiff = (leftHip.y - rightHip.y) / bodyScale;
  const shoulderPenalty = toSymmetryPenalty(shoulderDiff, 0.2);
  const hipPenalty = toSymmetryPenalty(hipDiff, 0.2);
  const symmetry = clamp(100 - shoulderPenalty * 0.55 - hipPenalty * 0.45, 0, 100);

  const jitterPenalty = clamp((velocity / 0.8) * 100, 0, 100);
  const leanDeltaPenalty = previous ? clamp(Math.abs(torsoLeanDeg - previous.torsoLeanDeg) * 4, 0, 100) : 0;
  const stability = clamp(100 - jitterPenalty * 0.65 - leanDeltaPenalty * 0.35, 0, 100);

  const isBadFrame = alignment < 65 || symmetry < 65 || stability < 60;
  const badFrames = (previous?.badFrames ?? 0) + (isBadFrame ? 1 : -0.5);
  const normalizedBadFrames = clamp(badFrames, 0, 200);

  const fatigueAccumulator = clamp(
    (previous?.fatigueAccumulator ?? 0) + (isBadFrame ? 1.6 : -0.6) + (forwardHeadPenalty > 25 ? 0.8 : 0),
    0,
    400
  );

  const fatigue = clamp((fatigueAccumulator / 400) * 100 + (100 - stability) * 0.25, 0, 100);

  const score = clamp(alignment * 0.38 + symmetry * 0.24 + stability * 0.26 + (100 - fatigue) * 0.12, 0, 100);

  return {
    alignment,
    symmetry,
    stability,
    fatigue,
    score,
    snapshot: {
      timestamp,
      shoulderMid,
      hipMid,
      nose,
      torsoLeanDeg,
      neckTiltDeg,
      shoulderTiltDeg,
      hipTiltDeg,
      velocity,
      badFrames: normalizedBadFrames,
      fatigueAccumulator
    }
  };
}