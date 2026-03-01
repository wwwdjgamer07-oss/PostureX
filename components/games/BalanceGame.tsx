"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell, usePostureFeed, type SessionResult } from "@/components/games/GameCore";
import GameModelSuggestion from "@/components/games/GameModelSuggestion";
import { getAlignmentStability, getBalanceValue, getCorrectionResponse, type GamePostureSample } from "@/lib/games/postureAdapter";
import { computeUnifiedGameScore } from "@/lib/games/scoring";
import { calculateRewards, readRewardProgress, saveRewardProgress } from "@/lib/games/rewards";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function BalanceGame() {
  const { videoRef, running, loading, error, sample, start, stop } = usePostureFeed();

  const [gameRunning, setGameRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [winBurst, setWinBurst] = useState(false);

  const startedAtRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stableMsRef = useRef(0);
  const streakMsRef = useRef(0);
  const maxStreakMsRef = useRef(0);
  const alignmentSumRef = useRef(0);
  const sampleCountRef = useRef(0);
  const smoothnessSumRef = useRef(0);
  const prevSampleRef = useRef<GamePostureSample | null>(null);
  const balanceValueRef = useRef(0);
  const wobbleTimeRef = useRef(0);

  const rewardLevel = readRewardProgress().level;
  const challengeLevel = rewardLevel >= 16 ? 4 : rewardLevel >= 10 ? 3 : rewardLevel >= 5 ? 2 : 1;

  const config = useMemo(() => {
    if (challengeLevel === 4) {
      return { beamWidth: 180, wobble: 4.2, danger: 11, fail: 14, goal: 34, dualAxis: true };
    }
    if (challengeLevel === 3) {
      return { beamWidth: 210, wobble: 3.4, danger: 13, fail: 16, goal: 32, dualAxis: false };
    }
    if (challengeLevel === 2) {
      return { beamWidth: 240, wobble: 2.7, danger: 15, fail: 18, goal: 30, dualAxis: false };
    }
    return { beamWidth: 280, wobble: 2, danger: 17, fail: 20, goal: 28, dualAxis: false };
  }, [challengeLevel]);

  const resetState = () => {
    stableMsRef.current = 0;
    streakMsRef.current = 0;
    maxStreakMsRef.current = 0;
    alignmentSumRef.current = 0;
    sampleCountRef.current = 0;
    smoothnessSumRef.current = 0;
    prevSampleRef.current = null;
    balanceValueRef.current = 0;
    wobbleTimeRef.current = 0;
    setFailed(false);
    setResult(null);
    setWinBurst(false);
  };

  const finalize = useCallback((status: "fail" | "win" | "manual") => {
    stop();
    setGameRunning(false);

    const avgAlignment = sampleCountRef.current ? Math.round(alignmentSumRef.current / sampleCountRef.current) : 0;
    const correctionSpeed = sampleCountRef.current ? Math.round(smoothnessSumRef.current / sampleCountRef.current) : 0;

    const score = computeUnifiedGameScore({
      alignmentScore: avgAlignment,
      stabilityTime: stableMsRef.current / 1000,
      reactionSpeed: correctionSpeed,
      correctionAccuracy: avgAlignment
    });

    const reward = calculateRewards(
      {
        alignmentPercent: avgAlignment,
        stabilityTime: stableMsRef.current / 1000,
        reactionSpeed: Math.max(0.2, 1.7 - (correctionSpeed / 100) * 1.4),
        correctionAccuracy: avgAlignment / 100,
        postureScore: avgAlignment,
        shoulderStability: correctionSpeed
      },
      readRewardProgress()
    );
    saveRewardProgress(reward.progress);

    const feedback =
      status === "fail"
        ? "Beam lost stability under slouch pressure. Recover earlier to avoid danger zone collapse."
        : status === "win"
          ? "Beam locked clean. Excellent posture control under instability tension."
          : "Session complete. Aim for longer max streak in the next run.";

    setResult({
      title: "Posture Balance Trainer",
      score: score.gameScore,
      alignment: avgAlignment,
      correctionSpeed,
      stabilityTime: Math.round(stableMsRef.current / 1000),
      postureFeedback: feedback,
      xpEarned: reward.xp,
      postureQuality: score.postureQuality,
      reward
    });

    if (status === "win") {
      setWinBurst(true);
      setTimeout(() => setWinBurst(false), 1000);
    }
  }, [stop]);

  const handleStart = async () => {
    resetState();
    await start();
    startedAtRef.current = Date.now();
    lastTickRef.current = Date.now();
    setGameRunning(true);
  };

  useEffect(() => {
    if (!gameRunning || !sample) return;

    const now = Date.now();
    const deltaMs = Math.max(16, now - lastTickRef.current);
    lastTickRef.current = now;
    wobbleTimeRef.current += deltaMs / 1000;

    const baseBalance = getBalanceValue(sample);
    const wobbleScale = config.wobble * (1 + (1 - sample.alignmentPercent / 100) * 1.6);
    const ambientWobble = Math.sin(wobbleTimeRef.current * 2.8) * wobbleScale;
    const microWobble = Math.sin(wobbleTimeRef.current * 8.7) * (wobbleScale * 0.3);
    const dualAxisPenalty = config.dualAxis ? (sample.headForwardAngle / 60) * 4 : 0;

    const tiltDeg = baseBalance * 20 + ambientWobble + microWobble + dualAxisPenalty;
    balanceValueRef.current = tiltDeg;

    const slouchDrop = clamp((sample.headForwardAngle - 10) / 20 + (sample.spineAngle - 9) / 16, 0, 1);

    const alignmentStability = getAlignmentStability(sample);
    alignmentSumRef.current += alignmentStability;
    sampleCountRef.current += 1;

    const correction = getCorrectionResponse(prevSampleRef.current, sample);
    smoothnessSumRef.current += correction.smoothness;
    prevSampleRef.current = sample;

    const stable = Math.abs(tiltDeg) < config.danger && slouchDrop < 0.42;
    if (stable) {
      stableMsRef.current += deltaMs;
      streakMsRef.current += deltaMs;
      if (streakMsRef.current > maxStreakMsRef.current) {
        maxStreakMsRef.current = streakMsRef.current;
      }
    } else {
      streakMsRef.current = 0;
    }

    const failNow = Math.abs(tiltDeg) > config.fail || slouchDrop > 0.9;
    if (failNow) {
      setFailed(true);
      finalize("fail");
      return;
    }

    const stableSec = stableMsRef.current / 1000;
    if (stableSec >= config.goal) {
      finalize("win");
      return;
    }

    if (now - startedAtRef.current > 65000) {
      finalize("manual");
    }
  }, [config, finalize, gameRunning, sample]);

  const danger = Math.abs(balanceValueRef.current) >= config.danger;
  const beamDrop = failed
    ? 120
    : sample
      ? clamp((sample.headForwardAngle - 12) * 2.6 + (sample.spineAngle - 8) * 1.8, 0, 80)
      : 0;

  const hud = {
    scorePercent: sample ? Math.round(getAlignmentStability(sample)) : 0,
    statusText: failed ? "Failure risk triggered" : danger ? "Danger zone" : gameRunning ? "Hold steady" : "Ready",
    stabilityTime: stableMsRef.current / 1000,
    goalTime: config.goal,
    signal: (failed ? "danger" : danger ? "warning" : Math.abs(balanceValueRef.current) > 7 ? "tilt" : "aligned") as "aligned" | "tilt" | "warning" | "danger",
    streak: maxStreakMsRef.current / 1000
  };

  return (
    <GameShell
      running={running}
      loading={loading}
      error={error}
      videoRef={videoRef}
      onStart={handleStart}
      onStop={() => finalize("manual")}
      hud={hud}
      result={result}
      footer={<GameModelSuggestion game="balance" compact />}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="absolute h-[420px] w-[420px] animate-[spin_28s_linear_infinite] rounded-full border border-cyan-300/20" />
        <div className={`absolute inset-y-0 left-[8%] w-3 rounded-full ${danger ? "bg-rose-500/75" : "bg-cyan-400/25"}`} />
        <div className={`absolute inset-y-0 right-[8%] w-3 rounded-full ${danger ? "bg-rose-500/75" : "bg-cyan-400/25"}`} />

        <div
          className="relative"
          style={{
            width: `${config.beamWidth}px`,
            transform: `translateY(${beamDrop}px) rotate(${balanceValueRef.current}deg)`,
            transition: "transform 130ms linear"
          }}
        >
          <div
            className={`h-4 rounded-full border ${danger ? "border-rose-300/80 bg-rose-400/55" : "border-cyan-300/70 bg-cyan-300/65"}`}
            style={{ boxShadow: danger ? "0 0 26px rgba(244,63,94,0.5)" : "0 0 24px rgba(34,211,238,0.45)" }}
          />
          <div className="absolute left-1/2 top-1/2 h-10 w-8 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/45 bg-white/55" />
        </div>

        {winBurst ? (
          <>
            <div className="absolute h-[260px] w-[260px] animate-[ping_620ms_ease-out] rounded-full border border-cyan-200/70" />
            <p className="absolute -top-2 text-lg font-semibold text-cyan-100 animate-[pxGameFlash_900ms_ease-out]">+XP</p>
          </>
        ) : null}

        {!danger && gameRunning ? (
          <>
            <span className="px-game-particle" style={{ left: "34%", top: "46%", animationDelay: "-0.5s" }} />
            <span className="px-game-particle" style={{ left: "62%", top: "52%", animationDelay: "-1.2s" }} />
          </>
        ) : null}
      </div>
    </GameShell>
  );
}
