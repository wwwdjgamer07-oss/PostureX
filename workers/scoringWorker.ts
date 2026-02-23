/// <reference lib="webworker" />

import { computePostureScores, PoseLandmark, ScoringSnapshot } from "@/lib/scoringEngine";
import { classifyRisk } from "@/lib/riskEngine";

interface ScoreMessage {
  type: "score";
  landmarks: PoseLandmark[];
  timestamp: number;
}

interface ResetMessage {
  type: "reset";
}

type WorkerMessage = ScoreMessage | ResetMessage;

let previousSnapshot: ScoringSnapshot | undefined;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const payload = event.data;

  if (payload.type === "reset") {
    previousSnapshot = undefined;
    return;
  }

  const score = computePostureScores(payload.landmarks, payload.timestamp, previousSnapshot);
  previousSnapshot = score.snapshot;

  const riskLevel = classifyRisk(score.score, score.fatigue);
  self.postMessage({
    type: "result",
    ...score,
    riskLevel
  });
};

export {};
