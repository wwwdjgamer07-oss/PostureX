import { classifyRisk } from "./riskEngine";

/* eslint-disable no-restricted-globals */

let fatigueAccumulator = 15;

self.onmessage = (event: MessageEvent) => {
  const { type, landmarks, timestamp } = event.data;

  if (type === "reset") {
    fatigueAccumulator = 15;
    return;
  }

  if (type === "score" && landmarks) {
    const metrics = calculateMetrics(landmarks);
    self.postMessage({
      type: "result",
      ...metrics,
      timestamp
    });
  }
};

function calculateMetrics(landmarks: any[]) {
  // Landmark indices: 11 (L Shoulder), 12 (R Shoulder), 0 (Nose)
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const nose = landmarks[0];

  // 1. Alignment (Shoulder Levelness)
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  const alignment = Math.max(0, 100 - shoulderTilt * 650);

  // 2. Symmetry (Depth/Z-axis balance)
  const shoulderDepthDiff = Math.abs(leftShoulder.z - rightShoulder.z);
  const symmetry = Math.max(0, 100 - shoulderDepthDiff * 450);

  // 3. Stability (Head Centering)
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const headOffset = Math.abs(nose.x - shoulderCenterX);
  const stability = Math.max(0, 100 - headOffset * 750);

  // 4. Fatigue Modeling (Accumulative strain)
  if (alignment < 75 || stability < 70) {
    fatigueAccumulator = Math.min(100, fatigueAccumulator + 0.45);
  } else {
    fatigueAccumulator = Math.max(10, fatigueAccumulator - 0.12);
  }

  // 5. Weighted Aggregate Score
  const score = (alignment * 0.35) + (symmetry * 0.25) + (stability * 0.25) + ((100 - fatigueAccumulator) * 0.15);
  
  const riskLevel = classifyRisk(score, fatigueAccumulator);

  return {
    alignment,
    symmetry,
    stability,
    fatigue: fatigueAccumulator,
    score,
    riskLevel
  };
}