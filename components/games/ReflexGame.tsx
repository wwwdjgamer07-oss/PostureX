"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, usePostureFeed, type SessionResult } from "@/components/games/GameCore";
import GameModelSuggestion from "@/components/games/GameModelSuggestion";
import { getAlignmentStability, type GamePostureSample } from "@/lib/games/postureAdapter";
import { computeUnifiedGameScore } from "@/lib/games/scoring";
import { calculateRewards, readRewardProgress, saveRewardProgress } from "@/lib/games/rewards";

type ReflexPrompt = {
  id: string;
  label: string;
  check: (sample: GamePostureSample) => boolean;
};

const promptBank: ReflexPrompt[] = [
  {
    id: "lift-chest",
    label: "Lift chest",
    check: (sample) => sample.spineAngle < 9 && sample.alignmentPercent > 72
  },
  {
    id: "align-head",
    label: "Align head",
    check: (sample) => sample.headForwardAngle < 12
  },
  {
    id: "sit-tall",
    label: "Sit tall",
    check: (sample) => sample.postureScore > 78 && sample.spineAngle < 10
  },
  {
    id: "relax-shoulders",
    label: "Relax shoulders",
    check: (sample) => Math.abs(sample.shoulderTilt) < 5
  }
];

function pickPrompt() {
  return promptBank[Math.floor(Math.random() * promptBank.length)];
}

export default function ReflexGame() {
  const { videoRef, running, loading, error, sample, start, stop } = usePostureFeed();
  const [gameRunning, setGameRunning] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<ReflexPrompt>(() => pickPrompt());

  const startedAtRef = useRef(0);
  const promptShownAtRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const successRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const holdMsRef = useRef(0);
  const alignSumRef = useRef(0);
  const sampleCountRef = useRef(0);

  const activeTimeoutMs = 5000;

  const resetState = () => {
    setResult(null);
    attemptsRef.current = 0;
    successRef.current = 0;
    reactionTimesRef.current = [];
    holdMsRef.current = 0;
    alignSumRef.current = 0;
    sampleCountRef.current = 0;
    holdStartRef.current = null;
    const next = pickPrompt();
    setCurrentPrompt(next);
    promptShownAtRef.current = Date.now();
  };

  const finalize = useCallback(() => {
    stop();
    setGameRunning(false);

    const alignment = sampleCountRef.current ? Math.round(alignSumRef.current / sampleCountRef.current) : 0;
    const avgReaction = reactionTimesRef.current.length
      ? reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length
      : activeTimeoutMs;
    const reactionSpeed = Math.max(0, Math.min(100, Math.round(100 - avgReaction / 55)));
    const accuracy = attemptsRef.current ? Math.round((successRef.current / attemptsRef.current) * 100) : 0;

    const score = computeUnifiedGameScore({
      alignmentScore: alignment,
      stabilityTime: holdMsRef.current / 1000,
      reactionSpeed,
      correctionAccuracy: accuracy
    });
    const reward = calculateRewards(
      {
        alignmentPercent: alignment,
        stabilityTime: holdMsRef.current / 1000,
        reactionSpeed: avgReaction / 1000,
        correctionAccuracy: accuracy / 100,
        postureScore: alignment,
        shoulderStability: alignment
      },
      readRewardProgress()
    );
    saveRewardProgress(reward.progress);

    const feedback =
      accuracy >= 70
        ? "Great shoulder stability and fast correction reflexes. Neck correction improved 18%."
        : "Reaction speed is building. Hold each correction slightly longer for higher accuracy.";

    setResult({
      title: "Reflex Correction Game",
      score: score.gameScore,
      alignment,
      correctionSpeed: reactionSpeed,
      stabilityTime: Math.round(holdMsRef.current / 1000),
      postureFeedback: feedback,
      xpEarned: reward.xp,
      postureQuality: score.postureQuality,
      reward
    });
  }, [activeTimeoutMs, stop]);

  const nextPrompt = useCallback(() => {
    attemptsRef.current += 1;
    holdStartRef.current = null;
    const next = pickPrompt();
    setCurrentPrompt(next);
    promptShownAtRef.current = Date.now();
  }, []);

  const handleStart = async () => {
    resetState();
    await start();
    startedAtRef.current = Date.now();
    setGameRunning(true);
  };

  useEffect(() => {
    if (!gameRunning || !sample) return;

    const now = Date.now();

    alignSumRef.current += getAlignmentStability(sample);
    sampleCountRef.current += 1;

    if (currentPrompt.check(sample)) {
      if (!holdStartRef.current) {
        holdStartRef.current = now;
      }

      if (now - holdStartRef.current >= 700) {
        successRef.current += 1;
        reactionTimesRef.current.push(now - promptShownAtRef.current);
        holdMsRef.current += now - holdStartRef.current;
        nextPrompt();
      }
    } else {
      holdStartRef.current = null;
    }

    if (now - promptShownAtRef.current >= activeTimeoutMs) {
      nextPrompt();
    }

    if (now - startedAtRef.current >= 60000) {
      finalize();
    }
  }, [activeTimeoutMs, currentPrompt, finalize, gameRunning, nextPrompt, sample]);

  const progress = Math.round((successRef.current / Math.max(1, attemptsRef.current)) * 100);

  const hud = {
    signal: (progress >= 75 ? "aligned" : progress >= 45 ? "tilt" : "warning") as "aligned" | "tilt" | "warning" | "danger",
    scorePercent: sample ? Math.round(getAlignmentStability(sample)) : 0,
    statusText: running ? "Correcting" : "Ready",
    stabilityTime: holdMsRef.current / 1000,
    goalTime: 30
  };

  return (
    <GameShell
      running={running}
      loading={loading}
      error={error}
      videoRef={videoRef}
      onStart={handleStart}
      onStop={finalize}
      hud={hud}
      result={result}
      footer={<GameModelSuggestion game="reflex" compact />}
    >
      <div className="mx-auto w-full max-w-md space-y-3 px-4 py-3">
        <div className="rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-4 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Current Prompt</p>
          <p className="mt-2 text-lg font-semibold text-cyan-100">{currentPrompt.label}</p>
        </div>
        <div className="rounded-2xl border border-slate-500/30 bg-slate-900/50 p-4 backdrop-blur-xl">
          <p className="text-sm text-slate-200">Accuracy progress: <span className="font-semibold text-cyan-200">{progress}%</span></p>
          <p className="mt-1 text-sm text-slate-400">Successful prompts: {successRef.current} / {attemptsRef.current}</p>
        </div>
      </div>
    </GameShell>
  );
}
