import { detectMobile, hasMobileSensorSupport, requestSensorPermission } from "@/lib/mobileSensor";

export interface SensorTrackingState {
  dateKey: string;
  totalTime: number;
  goodTime: number;
  mediumTime: number;
  badTime: number;
  scoreSamples: number[];
  latestTilt: number;
}

export interface SensorDailyReport {
  dateKey: string;
  avgScore: number;
  goodPercent: number;
  badPercent: number;
  duration: number;
  createdAt: string;
}

export const SENSOR_SESSION_KEY = "px_sensor_session";
export const SENSOR_ACTIVE_KEY = "px_session_active";
export const STREAK_KEY = "px_streak_days";
export const TOTAL_XP_KEY = "px_total_xp";
const LAST_REWARD_DAY_KEY = "px_last_reward_day";
const DAILY_REPORT_PREFIX = "px_daily_report_";
const MAX_SAMPLES = 24 * 60 * 60;
const XP_PER_GOOD_DAY = 50;

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function yesterdayKey(fromKey: string) {
  const year = Number(fromKey.slice(0, 4));
  const month = Number(fromKey.slice(4, 6));
  const day = Number(fromKey.slice(6, 8));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

function readNumber(key: string, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultState(dateKeyValue = todayKey()): SensorTrackingState {
  return {
    dateKey: dateKeyValue,
    totalTime: 0,
    goodTime: 0,
    mediumTime: 0,
    badTime: 0,
    scoreSamples: [],
    latestTilt: 0
  };
}

function reportKey(dateKeyValue: string) {
  return `${DAILY_REPORT_PREFIX}${dateKeyValue}`;
}

export function readSensorSessionState() {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(SENSOR_SESSION_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<SensorTrackingState>;
    return {
      dateKey: typeof parsed.dateKey === "string" ? parsed.dateKey : todayKey(),
      totalTime: Number(parsed.totalTime ?? 0),
      goodTime: Number(parsed.goodTime ?? 0),
      mediumTime: Number(parsed.mediumTime ?? 0),
      badTime: Number(parsed.badTime ?? 0),
      scoreSamples: Array.isArray(parsed.scoreSamples)
        ? parsed.scoreSamples.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : [],
      latestTilt: Number(parsed.latestTilt ?? 0)
    };
  } catch {
    return defaultState();
  }
}

function writeSensorSessionState(state: SensorTrackingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SENSOR_SESSION_KEY, JSON.stringify(state));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toReport(state: SensorTrackingState): SensorDailyReport {
  const avgScore = Math.round(average(state.scoreSamples));
  const total = Math.max(state.totalTime, 1);
  return {
    dateKey: state.dateKey,
    avgScore,
    goodPercent: Math.round((state.goodTime / total) * 100),
    badPercent: Math.round((state.badTime / total) * 100),
    duration: state.totalTime,
    createdAt: new Date().toISOString()
  };
}

function writeDailyReport(report: SensorDailyReport) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(reportKey(report.dateKey), JSON.stringify(report));
}

export function readDailyReport(dateKeyValue: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(reportKey(dateKeyValue));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SensorDailyReport;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyFreeRewards(report: SensorDailyReport) {
  if (typeof window === "undefined") return;
  if (report.avgScore <= 80) return;

  const lastRewardDay = window.localStorage.getItem(LAST_REWARD_DAY_KEY);
  if (lastRewardDay === report.dateKey) return;

  const currentXp = readNumber(TOTAL_XP_KEY, 0);
  const currentStreak = readNumber(STREAK_KEY, 0);
  const previousDay = yesterdayKey(report.dateKey);
  const streak = lastRewardDay === previousDay ? currentStreak + 1 : 1;

  window.localStorage.setItem(TOTAL_XP_KEY, String(currentXp + XP_PER_GOOD_DAY));
  window.localStorage.setItem(STREAK_KEY, String(streak));
  window.localStorage.setItem(LAST_REWARD_DAY_KEY, report.dateKey);
}

function tiltFrom(beta: number, gamma: number) {
  return Math.sqrt(beta * beta + gamma * gamma);
}

export class SensorPostureEngine {
  private state: SensorTrackingState = readSensorSessionState();
  private tickId: ReturnType<typeof setInterval> | null = null;
  private saveId: ReturnType<typeof setInterval> | null = null;
  private latestBeta = 0;
  private latestGamma = 0;
  private active = false;
  private onUpdate?: (state: SensorTrackingState, report: SensorDailyReport) => void;

  constructor(onUpdate?: (state: SensorTrackingState, report: SensorDailyReport) => void) {
    this.onUpdate = onUpdate;
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    this.latestBeta = Number(event.beta ?? 0);
    this.latestGamma = Number(event.gamma ?? 0);
  };

  private handleMotion = () => {
    // motion listener retained for broad device compatibility and wakeups.
  };

  private maybeRotateDay() {
    const currentDay = todayKey();
    if (this.state.dateKey === currentDay) return;
    const archivedReport = toReport(this.state);
    writeDailyReport(archivedReport);
    applyFreeRewards(archivedReport);
    this.state = defaultState(currentDay);
    writeSensorSessionState(this.state);
  }

  private tick = () => {
    if (!this.active) return;
    this.maybeRotateDay();
    const tilt = tiltFrom(this.latestBeta, this.latestGamma);
    const score = Math.max(0, 100 - tilt);

    this.state.latestTilt = tilt;
    this.state.scoreSamples.push(score);
    if (this.state.scoreSamples.length > MAX_SAMPLES) {
      this.state.scoreSamples = this.state.scoreSamples.slice(-MAX_SAMPLES);
    }

    if (tilt < 20) this.state.goodTime += 1;
    else if (tilt < 40) this.state.mediumTime += 1;
    else this.state.badTime += 1;
    this.state.totalTime += 1;

    const liveReport = toReport(this.state);
    this.onUpdate?.(this.state, liveReport);
  };

  private saveSession = () => {
    if (!this.active) return;
    writeSensorSessionState(this.state);
    writeDailyReport(toReport(this.state));
  };

  async start() {
    if (typeof window === "undefined" || this.active) return false;
    if (!detectMobile() || !hasMobileSensorSupport()) return false;

    const granted = await requestSensorPermission();
    if (!granted) return false;

    this.state = readSensorSessionState();
    this.maybeRotateDay();
    window.localStorage.setItem(SENSOR_ACTIVE_KEY, "1");

    window.addEventListener("deviceorientation", this.handleOrientation, { passive: true });
    window.addEventListener("devicemotion", this.handleMotion, { passive: true });

    this.active = true;
    this.tickId = setInterval(this.tick, 1000);
    this.saveId = setInterval(this.saveSession, 10000);
    this.tick();
    return true;
  }

  stop() {
    if (typeof window === "undefined") return;
    this.active = false;
    window.removeEventListener("deviceorientation", this.handleOrientation);
    window.removeEventListener("devicemotion", this.handleMotion);
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
    if (this.saveId) {
      clearInterval(this.saveId);
      this.saveId = null;
    }
    this.saveSession();
  }

  getSnapshot() {
    const report = toReport(this.state);
    return { state: this.state, report, active: this.active };
  }
}

