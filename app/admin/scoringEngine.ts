export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Calculates the angle between three points in 3D space.
 */
export function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

/**
 * Core posture scoring logic.
 * Returns metrics normalized between 0-100.
 */
export function analyzePosture(landmarks: PoseLandmark[]) {
  // Indices: 11 (L Shoulder), 12 (R Shoulder), 23 (L Hip), 24 (R Hip), 0 (Nose)
  const lS = landmarks[11];
  const rS = landmarks[12];
  const lH = landmarks[23];
  const rH = landmarks[24];
  const nose = landmarks[0];

  if (!lS || !rS || !lH || !rH || !nose) return null;

  // 1. Alignment: Verticality of the spine (Shoulder center to Hip center)
  const shoulderMidX = (lS.x + rS.x) / 2;
  const hipMidX = (lH.x + rH.x) / 2;
  const alignment = Math.max(0, 100 - Math.abs(shoulderMidX - hipMidX) * 500);

  // 2. Symmetry: Shoulder levelness
  const shoulderTilt = Math.abs(lS.y - rS.y);
  const symmetry = Math.max(0, 100 - shoulderTilt * 600);

  // 3. Stability: Head centering relative to shoulders
  const headOffset = Math.abs(nose.x - shoulderMidX);
  const stability = Math.max(0, 100 - headOffset * 800);

  // 4. Aggregate Score
  const score = (alignment * 0.4) + (symmetry * 0.3) + (stability * 0.3);

  return {
    alignment: Number(alignment.toFixed(2)),
    symmetry: Number(symmetry.toFixed(2)),
    stability: Number(stability.toFixed(2)),
    score: Number(score.toFixed(2))
  };
}