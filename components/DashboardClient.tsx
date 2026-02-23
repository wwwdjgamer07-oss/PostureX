"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Brain, Flame, LayoutDashboard, Palette, ShieldAlert, Timer, User, Video } from "lucide-react";
import { SkullAvatarIcon, SkullBrainIcon, SkullCoinIcon, SkullGemIcon, SkullGridIcon, SkullJoystickIcon } from "@/components/icons/SkullIcons";
import { DailyScoreCard } from "@/components/DailyScoreCard";
import { PostureRiskCard } from "@/components/PostureRiskCard";
import { PdfReportButton } from "@/components/PdfReportButton";
import { SensorReportCard } from "@/components/SensorReportCard";
import { WeeklyPostureTrendChart } from "@/components/WeeklyPostureTrendChart";
import { XPBar } from "@/components/games/XPBar";
import { BADGE_DEFINITIONS } from "@/lib/games/badges";
import { createDefaultRewardProgress, readRewardProgress, type RewardProgressState } from "@/lib/games/rewards";
import { detectMobile, hasMobileSensorSupport } from "@/lib/mobileSensor";
import { usePersonalizationProfile } from "@/lib/personalization/profileClient";
import { resolveLevel } from "@/lib/games/xpSystem";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { readDailyReport, SENSOR_ACTIVE_KEY, SensorPostureEngine, type SensorDailyReport } from "@/lib/sensorPostureEngine";
import type { PlanTier } from "@/lib/types";

interface SessionRecord {
  id: string;
  avg_alignment: number;
  stability: number;
  symmetry: number;
  risk_level: string;
  duration_seconds: number;
  started_at: string;
  alert_count?: number;
  source?: "camera" | "sensor";
}

interface DashboardClientProps {
  userId: string;
  planTier: PlanTier;
  initialSessions: SessionRecord[];
  initialDailyProgress: {
    todayScore: number;
    sessionsToday: number;
    totalDurationToday: number;
    streak: number;
    weeklyTrend: Array<{
      date: string;
      avg_score: number;
      sessions_count: number;
    }>;
  };
  initialBreakStats: {
    breaksToday: number;
    lastBreakAt: string | null;
  };
  initialDashboardLayout: Record<string, unknown>;
}

interface DashboardLayoutState {
  compact: boolean;
  headerStyle: "default" | "minimal" | "arcade";
  hiddenWidgets: string[];
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ai", label: "AI Coach", icon: Brain },
  { href: "/session", label: "Session", icon: Video },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User }
];

const riskTone: Record<string, string> = {
  LOW: "text-emerald-300",
  MODERATE: "text-amber-300",
  HIGH: "text-orange-300",
  SEVERE: "text-rose-300"
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function riskToFatigue(riskLevel: string) {
  switch (riskLevel) {
    case "LOW":
      return 22;
    case "MODERATE":
      return 48;
    case "HIGH":
      return 68;
    case "SEVERE":
      return 82;
    default:
      return 35;
  }
}

export function DashboardClient({ userId, planTier, initialSessions, initialDailyProgress, initialBreakStats, initialDashboardLayout }: DashboardClientProps) {
  const latestSession = initialSessions[0];
  const liveScore = latestSession
    ? Math.round((latestSession.avg_alignment + latestSession.stability + latestSession.symmetry) / 3)
    : initialDailyProgress.todayScore;
  const [activeTab, setActiveTab] = useState<"overview" | "rewards">("overview");
  const [rewardProgress, setRewardProgress] = useState<RewardProgressState>(createDefaultRewardProgress());
  const { profile: personalizationProfile } = usePersonalizationProfile();
  const isObsidianSkull = useIsObsidianSkullTheme();
  const [layout, setLayout] = useState<DashboardLayoutState>(() => ({
    compact: Boolean(initialDashboardLayout?.compact ?? false),
    headerStyle:
      initialDashboardLayout?.headerStyle === "minimal" || initialDashboardLayout?.headerStyle === "arcade"
        ? (initialDashboardLayout.headerStyle as "minimal" | "arcade")
        : "default",
    hiddenWidgets: Array.isArray(initialDashboardLayout?.hiddenWidgets)
      ? (initialDashboardLayout.hiddenWidgets.filter((item): item is string => typeof item === "string") as string[])
      : []
  }));
  const [sensorModeActive, setSensorModeActive] = useState(false);
  const [dailySensorReport, setDailySensorReport] = useState<SensorDailyReport | null>(null);
  const [yesterdaySensorReport, setYesterdaySensorReport] = useState<SensorDailyReport | null>(null);

  useEffect(() => {
    const syncRewards = () => setRewardProgress(readRewardProgress());
    syncRewards();
    window.addEventListener("focus", syncRewards);
    return () => {
      window.removeEventListener("focus", syncRewards);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const engine = new SensorPostureEngine((_state, report) => {
      setDailySensorReport(report);
    });
    const date = new Date();
    const todayKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, "0")}${String(yesterday.getDate()).padStart(2, "0")}`;
    setDailySensorReport(readDailyReport(todayKey));
    setYesterdaySensorReport(readDailyReport(yesterdayKey));

    const bootstrap = async () => {
      const mobile = detectMobile();
      const hasSensor = hasMobileSensorSupport();
      if (!mobile || !hasSensor) return;
      const saved = window.localStorage.getItem(SENSOR_ACTIVE_KEY);
      const started = await engine.start();
      if (started || saved === "1") {
        setSensorModeActive(true);
      }
    };
    void bootstrap();

    return () => {
      engine.stop();
    };
  }, []);

  const serverWallet = personalizationProfile
    ? { coins: personalizationProfile.coins, gems: personalizationProfile.gems }
    : null;
  const displayedPxCoins = serverWallet?.coins ?? rewardProgress.coins;

  const persistLayout = async (next: DashboardLayoutState) => {
    setLayout(next);
    try {
      await fetch("/api/personalization/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardLayout: {
            compact: next.compact,
            headerStyle: next.headerStyle,
            hiddenWidgets: next.hiddenWidgets
          }
        })
      });
      window.dispatchEvent(new Event("px-personalization-updated"));
    } catch {
      // optional
    }
  };

  const isVisible = (widget: string) => !layout.hiddenWidgets.includes(widget);

  const toggleWidget = (widget: string) => {
    const hidden = layout.hiddenWidgets.includes(widget)
      ? layout.hiddenWidgets.filter((item) => item !== widget)
      : [...layout.hiddenWidgets, widget];
    void persistLayout({ ...layout, hiddenWidgets: hidden });
  };

  const xpLevelState = resolveLevel(rewardProgress.xp);

  return (
    <div className={`px-shell grid gap-6 lg:grid-cols-[220px_1fr] ${layout.compact ? "text-[0.94rem]" : ""}`}>
      <aside className="px-dashboard-sidebar px-panel animate-fade-slide-right sticky top-24 h-fit p-3">
        <div className="mb-4 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">PostureX Core</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Operator ID</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{userId}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon =
              isObsidianSkull && item.href === "/dashboard"
                ? SkullGridIcon
                : isObsidianSkull && item.href === "/dashboard/ai"
                  ? SkullBrainIcon
                  : isObsidianSkull && item.href === "/session"
                    ? SkullJoystickIcon
                    : isObsidianSkull && item.href === "/profile"
                      ? SkullAvatarIcon
                      : item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:border-slate-400/40 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-500/40 dark:hover:bg-slate-800/80 dark:hover:text-white">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="space-y-6">
        <header className={`px-panel px-reveal p-6 ${layout.headerStyle === "minimal" ? "border-cyan-300/20" : ""}`} style={{ animationDelay: "60ms" }}>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">PostureX Command Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Performance Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Live readiness, posture risk, and trend analytics for every session.</p>
          {sensorModeActive ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              Sensor Mode Active
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/session" className="px-button">Start Session</Link>
            <Link href="/ai-playground" className="px-button-ghost">AI Playground</Link>
            <Link href="/alerts" className="px-button-ghost">View Alerts</Link>
            {latestSession && planTier !== "FREE" ? (
              <PdfReportButton
                data={{
                  alignment: Math.round(latestSession.avg_alignment),
                  stability: Math.round(latestSession.stability),
                  symmetry: Math.round(latestSession.symmetry),
                  score: liveScore,
                  riskLevel: latestSession.risk_level,
                  fatigue: riskToFatigue(latestSession.risk_level),
                  duration: latestSession.duration_seconds,
                  user: "Operator",
                  sessionId: latestSession.id
                }}
              />
            ) : (
              <Link href="/pricing?plan=basic" className="px-button-ghost">
                Unlock PDF Reports
              </Link>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <button type="button" className="px-button-ghost" onClick={() => void persistLayout({ ...layout, compact: !layout.compact })}>
              {layout.compact ? "Spacious" : "Compact"} Layout
            </button>
            <button
              type="button"
              className="px-button-ghost"
              onClick={() =>
                void persistLayout({
                  ...layout,
                  headerStyle: layout.headerStyle === "default" ? "minimal" : layout.headerStyle === "minimal" ? "arcade" : "default"
                })
              }
            >
              Header: {layout.headerStyle}
            </button>
            {serverWallet ? (
              <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-cyan-700 dark:text-cyan-100">
                Wallet: {serverWallet.coins} PX Coins | {serverWallet.gems.blue}/{serverWallet.gems.purple}/{serverWallet.gems.gold} Gems
              </span>
            ) : null}
          </div>
          <div className="mt-4 inline-flex rounded-xl border border-slate-500/30 bg-slate-900/45 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                activeTab === "overview" ? "bg-cyan-400/20 text-cyan-700 dark:text-cyan-100" : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rewards")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                activeTab === "rewards" ? "bg-cyan-400/20 text-cyan-700 dark:text-cyan-100" : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Rewards
            </button>
          </div>
        </header>

        {activeTab === "overview" ? (
          <>
        <SensorReportCard report={dailySensorReport} yesterdayReport={yesterdaySensorReport} active={sensorModeActive} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isVisible("dailyScore") ? <DailyScoreCard
            score={initialDailyProgress.todayScore}
            sessions={initialDailyProgress.sessionsToday}
            totalDurationSeconds={initialDailyProgress.totalDurationToday}
          /> : null}
          {isVisible("sessions") ? <article className="px-kpi px-reveal px-hover-lift" style={{ animationDelay: "140ms" }}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sessions</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{initialDailyProgress.sessionsToday}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Tracked today</p>
          </article> : null}
          {isVisible("risk") ? <PostureRiskCard
            avgScore={initialDailyProgress.todayScore}
            fatigueTime={0}
            slouchEvents={latestSession?.alert_count ?? 0}
            headForwardEvents={0}
          /> : null}
          {isVisible("streak") ? <article className="px-kpi px-reveal px-hover-lift" style={{ animationDelay: "300ms" }}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Streak</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-semibold text-slate-900 dark:text-white">
              <Flame className="h-6 w-6 text-cyan-300" />
              {initialDailyProgress.streak}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Days in sequence</p>
          </article> : null}
          {isVisible("alerts") ? <article className="px-kpi px-reveal px-hover-lift" style={{ animationDelay: "380ms" }}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Alerts</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{latestSession?.alert_count ?? 0}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Most recent session</p>
          </article> : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
          {isVisible("scoreChart") ? <article className="px-panel px-reveal p-6" style={{ animationDelay: "440ms" }}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Posture Score</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="space-y-3">
                <div className="relative mx-auto grid h-40 w-40 place-items-center rounded-full border border-cyan-300/35 bg-slate-900/80 shadow-[0_0_35px_rgba(34,211,238,0.16)]">
                  <div className="absolute inset-3 rounded-full border border-cyan-300/30" />
                  <p className="text-4xl font-semibold text-cyan-200">{liveScore}</p>
                </div>
                <p className="mx-auto inline-flex w-fit rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-100">
                  {latestSession?.source === "sensor" ? "Sensor Tracking" : "Camera Tracking"}
                </p>

                <div className="mx-auto w-full max-w-[220px] rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
                  <p className="inline-flex items-center gap-2 text-base font-semibold text-cyan-700 dark:text-cyan-100">
                    <Flame className="h-4 w-4 text-cyan-200" />
                    {initialDailyProgress.streak} day streak
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Keep your posture strong</p>
                </div>
              </div>

              <div className="space-y-3">
                {initialDailyProgress.weeklyTrend.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No weekly trend data available yet.</p>
                ) : (
                  <div className="flex h-36 items-end gap-2">
                    {initialDailyProgress.weeklyTrend.map((point, index) => {
                      const height = Math.max(12, Math.min(100, Math.round(point.avg_score)));
                      const label = new Date(`${point.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
                      return (
                        <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="px-bar-grow w-full rounded-md border border-cyan-300/35 bg-gradient-to-t from-blue-500/70 to-cyan-300/75 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                            style={{ height: `${height}%`, animationDelay: `${520 + index * 70}ms` }}
                          />
                          <span className="text-[10px] text-slate-600 dark:text-slate-500">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-500">Weekly posture trend with glow-accent score bars.</p>
              </div>
            </div>
          </article> : null}

          {isVisible("systemStatus") ? <article className="px-panel px-reveal p-6" style={{ animationDelay: "520ms" }}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Status</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between rounded-xl border border-slate-300/45 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">
                <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4 text-cyan-300" />Last session duration</span>
                <span>{formatDuration(latestSession?.duration_seconds ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-300/45 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">
                <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-cyan-300" />Breaks today</span>
                <span>{initialBreakStats.breaksToday}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-300/45 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">
                <span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-cyan-300" />Last break</span>
                <span>{initialBreakStats.lastBreakAt ? new Date(initialBreakStats.lastBreakAt).toLocaleTimeString() : "None"}</span>
              </div>
            </div>
          </article> : null}
        </div>

        {isVisible("weeklyTrend") ? <WeeklyPostureTrendChart /> : null}

        {isVisible("recentSessions") ? <article className="px-panel px-reveal p-6" style={{ animationDelay: "620ms" }}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Sessions</h2>
          <div className="mt-4 space-y-2">
            {initialSessions.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No sessions yet.</p>
            ) : (
              initialSessions.slice(0, 8).map((session, index) => (
                <div key={session.id} className="px-reveal grid gap-2 rounded-xl border border-slate-300/45 bg-white/70 px-3 py-3 text-sm text-slate-700 dark:border-slate-500/20 dark:bg-slate-900/50 dark:text-slate-300 md:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]" style={{ animationDelay: `${700 + index * 55}ms` }}>
                  <span className="text-slate-900 dark:text-slate-200">{new Date(session.started_at).toLocaleString()}</span>
                  <span>A {Math.round(session.avg_alignment)}</span>
                  <span>S {Math.round(session.stability)}</span>
                  <span>Y {Math.round(session.symmetry)}</span>
                  <span className={riskTone[session.risk_level] ?? "text-slate-200"}>{session.risk_level}</span>
                  <span>{session.alert_count ?? 0} alerts | {session.source === "sensor" ? "Sensor" : "Camera"}</span>
                </div>
              ))
            )}
          </div>
        </article> : null}

        <article className="px-panel px-reveal p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">Dashboard Widgets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["dailyScore", "sessions", "risk", "streak", "alerts", "scoreChart", "systemStatus", "weeklyTrend", "recentSessions"].map((widget) => (
              <button
                key={widget}
                type="button"
                onClick={() => toggleWidget(widget)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  isVisible(widget)
                    ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-700 dark:text-cyan-100"
                    : "border-slate-400/35 bg-white/70 text-slate-700 dark:border-slate-500/35 dark:bg-slate-900/50 dark:text-slate-400"
                }`}
              >
                {widget}
              </button>
            ))}
          </div>
        </article>
          </>
        ) : (
          <section className="space-y-4">
            <article className="px-panel px-reveal p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rewards Progress</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Posture Games rewards are tied to posture quality and correction performance.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <p className="px-kpi inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {isObsidianSkull ? <SkullCoinIcon className="h-4 w-4 text-violet-200" /> : null}
                  PX Coins: <span className="font-semibold text-cyan-700 dark:text-cyan-200">{displayedPxCoins}</span>
                </p>
                <p className="px-kpi text-sm text-slate-700 dark:text-slate-200">XP: <span className="font-semibold text-cyan-700 dark:text-cyan-200">{rewardProgress.xp}</span></p>
                <p className="px-kpi text-sm text-slate-700 dark:text-slate-200">Level: <span className="font-semibold text-cyan-700 dark:text-cyan-200">{rewardProgress.level}</span></p>
                <p className="px-kpi text-sm text-slate-700 dark:text-slate-200">Avatar Stage: <span className="font-semibold text-cyan-700 dark:text-cyan-200">{rewardProgress.avatarStage}</span></p>
              </div>
              <div className="mt-4">
                <XPBar current={xpLevelState.currentLevelXp} total={xpLevelState.nextLevelXp} />
              </div>
            </article>

            <article className="px-panel px-reveal p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Badges</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(BADGE_DEFINITIONS).map((badge) => {
                  const unlocked = rewardProgress.badges.includes(badge.id);
                  return (
                    <div key={badge.id} className={`rounded-xl border p-3 ${unlocked ? "border-cyan-300/35 bg-cyan-400/10" : "border-slate-500/30 bg-slate-900/40"}`}>
                      <p className={`text-sm font-semibold ${unlocked ? "text-cyan-700 dark:text-cyan-100" : "text-slate-700 dark:text-slate-300"}`}>{badge.title}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{badge.description}</p>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="px-panel px-reveal p-6">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                {isObsidianSkull ? <SkullGemIcon className="h-5 w-5 text-violet-300" /> : <Palette className="h-5 w-5 text-cyan-300" />}
                Unlocked Themes & Coach Personalities
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Themes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rewardProgress.unlockedThemes.map((theme) => (
                      <span key={theme} className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">AI Coach Personalities</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rewardProgress.unlockedCoachPersonalities.map((style) => (
                      <span key={style} className="rounded-full border border-slate-400/35 bg-white/70 px-3 py-1 text-xs text-slate-700 dark:border-slate-500/35 dark:bg-slate-900/50 dark:text-slate-200">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </section>
        )}
      </section>
    </div>
  );
}
