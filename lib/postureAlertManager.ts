export type ManagedPostureType = "forward_head" | "slouch" | "shoulder_raise" | "tilt";

export interface PostureSample {
  ts: number;
  forward_head: number;
  slouch: number;
  shoulder_raise: number;
  tilt: number;
}

const COOLDOWN_MS = 5 * 60 * 1000;
const PERSIST_MS = 3000;
const WINDOW_MS = 1500;

export class PostureAlertManager {
  private lastAlert: Partial<Record<ManagedPostureType, number>> = {};
  private firstDetected: Partial<Record<ManagedPostureType, number>> = {};
  private samples: PostureSample[] = [];

  pushSample(sample: PostureSample) {
    this.samples.push(sample);
    const minTs = sample.ts - WINDOW_MS;
    this.samples = this.samples.filter((item) => item.ts >= minTs);
  }

  private average(type: ManagedPostureType) {
    if (!this.samples.length) return 0;
    const sum = this.samples.reduce((acc, sample) => acc + sample[type], 0);
    return sum / this.samples.length;
  }

  evaluate(now: number, thresholds: Record<ManagedPostureType, number>) {
    const types: ManagedPostureType[] = ["forward_head", "slouch", "shoulder_raise", "tilt"];
    for (const type of types) {
      const crossed = this.average(type) >= thresholds[type];
      if (!crossed) {
        delete this.firstDetected[type];
        continue;
      }
      if (!this.firstDetected[type]) {
        this.firstDetected[type] = now;
        continue;
      }
      if (now - (this.firstDetected[type] ?? now) < PERSIST_MS) {
        continue;
      }
      const last = this.lastAlert[type] ?? 0;
      if (now - last < COOLDOWN_MS) {
        continue;
      }
      this.lastAlert[type] = now;
      this.firstDetected[type] = now;
      return type;
    }
    return null;
  }

  getLastAlertTimestamps() {
    return { ...this.lastAlert };
  }
}
