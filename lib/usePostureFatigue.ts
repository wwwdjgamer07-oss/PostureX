"use client";

import { useEffect, useRef, useState } from "react";
import {
  addFatigueSample,
  calculateFatigueState,
  type FatigueSample,
  type FatigueState
} from "@/lib/fatigueDetection";

const defaultState: FatigueState = {
  fatigue_level: "none",
  duration: 0,
  avg_score: 0,
  action: "none",
  message: "Posture energy stable"
};

export function usePostureFatigue(score: number) {
  const [state, setState] = useState<FatigueState>(defaultState);
  const samplesRef = useRef<FatigueSample[]>([]);

  useEffect(() => {
    const now = Date.now();
    samplesRef.current = addFatigueSample(samplesRef.current, score, now);
    setState(calculateFatigueState(samplesRef.current, now));
  }, [score]);

  return state;
}

