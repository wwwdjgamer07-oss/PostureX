"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, usePostureFeed, type SessionResult } from "@/components/games/GameCore";
import { getAlignmentStability, getCorrectionResponse, getSlouchState, type GamePostureSample } from "@/lib/games/postureAdapter";
import { computeUnifiedGameScore } from "@/lib/games/scoring";
import { calculateRewards, readRewardProgress, saveRewardProgress } from "@/lib/games/rewards";

export default function SlouchGame() {
  const { videoRef, running, loading, error, sample, start, stop } = usePostureFeed();
  const [gameRunning, setGameRunning] = useState(false);
  const [vines, setVines] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const startedAtRef = useRef(0);
  const lastTickRef = useRef(0);
  const slouchMsRef = useRef(0);
  const holdMsRef = useRef(0);
  const alignSumRef = useRef(0);
  const sampleCountRef = useRef(0);
  const correctionTimesRef = useRef<number[]>([]);
  const slouchStartedAtRef = useRef<number | null>(null);
  const prevSampleRef = useRef<GamePostureSample | null>(null);

  const resetState = () => {
    slouchMsRef.current = 0;
    holdMsRef.current = 0;
    alignSumRef.current = 0;
    sampleCountRef.current = 0;
    correctionTimesRef.current = [];
    slouchStartedAtRef.current = null;
    prevSampleRef.current = null;
    setVines(0);
    setResult(null);
  };

  const finishGame = useCallback(() => {
    stop();
    setGameRunning(false);

    const alignment = sampleCountRef.current ? Math.round(alignSumRef.current / sampleCountRef.current) : 0;
    const avgCorrectionMs = correctionTimesRef.current.length
      ? correctionTimesRef.current.reduce((a, b) => a + b, 0) / correctionTimesRef.current.length
      : 4000;
    const reactionSpeed = Math.max(0, Math.min(100, Math.round(100 - avgCorrectionMs / 45)));
    const correctionAccuracy = Math.max(0, Math.min(100, Math.round(100 - vines)));

    const score = computeUnifiedGameScore({
      alignmentScore: alignment,
      stabilityTime: holdMsRef.current / 1000,
      reactionSpeed,
      correctionAccuracy
    });
    const reward = calculateRewards(
      {
        alignmentPercent: alignment,
        stabilityTime: holdMsRef.current / 1000,
        reactionSpeed: avgCorrectionMs / 1000,
        correctionAccuracy: correctionAccuracy / 100,
        postureScore: alignment,
        shoulderStability: correctionAccuracy,
        slouchCorrections: correctionTimesRef.current.length
      },
      readRewardProgress()
    );
    saveRewardProgress(reward.progress);

    const feedback =
      slouchMsRef.current < 15000
        ? "Great anti-slouch control. Shoulder balance stayed strong through pressure."
        : "Recovery is improving. Keep neutral spine longer to break constraints faster.";

    setResult({
      title: "Anti-Slouch Challenge",
      score: score.gameScore,
      alignment,
      correctionSpeed: reactionSpeed,
      stabilityTime: Math.round(holdMsRef.current / 1000),
      postureFeedback: feedback,
      xpEarned: reward.xp,
      postureQuality: score.postureQuality,
      reward
    });
  }, [stop, vines]);

  const handleStart = async () => {
    resetState();
    await start();
    startedAtRef.current = Date.now();
    lastTickRef.current = Date.now();
    setGameRunning(true);
  };

  const hud = {
    signal: (vines > 65 ? "danger" : vines > 35 ? "warning" : "aligned") as "aligned" | "tilt" | "warning" | "danger",
    scorePercent: sample ? Math.round(getAlignmentStability(sample)) : 0,
    statusText: vines > 55 ? "Slouch detected" : vines > 25 ? "Correcting" : "Hold steady",
    stabilityTime: holdMsRef.current / 1000,
    goalTime: 30
  };

  useEffect(() => {
    if (!gameRunning || !sample) return;

    const now = Date.now();
    const deltaMs = Math.max(16, now - lastTickRef.current);
    lastTickRef.current = now;

    const slouch = getSlouchState(sample);
    const alignment = getAlignmentStability(sample);
    alignSumRef.current += alignment;
    sampleCountRef.current += 1;
    getCorrectionResponse(prevSampleRef.current, sample);
    prevSampleRef.current = sample;

    setVines((prev) => {
      if (slouch.isSlouching) {
        return Math.min(100, prev + slouch.severity * (deltaMs / 14));
      }
      return Math.max(0, prev - deltaMs / 12);
    });

    if (slouch.isSlouching) {
      slouchMsRef.current += deltaMs;
      if (!slouchStartedAtRef.current) slouchStartedAtRef.current = now;
    } else {
      if (slouchStartedAtRef.current) {
        correctionTimesRef.current.push(now - slouchStartedAtRef.current);
        slouchStartedAtRef.current = null;
      }
      holdMsRef.current += deltaMs;
    }

    if (now - startedAtRef.current >= 60000) {
      finishGame();
    }
  }, [finishGame, gameRunning, sample]);

  return (
    <GameShell
      running={running}
      loading={loading}
      error={error}
      videoRef={videoRef}
      onStart={handleStart}
      onStop={finishGame}
      hud={hud}
      result={result}
    >
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-[46%] h-28 w-16 -translate-x-1/2 rounded-2xl border border-cyan-300/50 bg-cyan-400/15" />
        <div
          className="absolute left-1/2 top-[42%] h-36 -translate-x-1/2 rounded-full border-2 border-emerald-300/70 transition-all"
          style={{ width: `${70 + vines * 1.2}px`, boxShadow: `0 0 ${10 + vines / 2}px rgba(16,185,129,0.45)` }}
        />
        <div className="absolute inset-x-3 top-3 flex justify-between text-xs text-slate-300">
          <span>Constraint level: {Math.round(vines)}%</span>
          <span>{vines > 45 ? "Slouching" : "Recovering"}</span>
        </div>
      </div>
    </GameShell>
  );
}
