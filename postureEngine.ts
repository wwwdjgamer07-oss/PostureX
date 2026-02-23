import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { RiskLevel } from "./types";
import { classifyRisk } from "./riskEngine";

export interface PostureFrame {
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
  score: number;
  riskLevel: RiskLevel;
  landmarks: any[];
  timestamp: number;
}

export class PostureEngine {
  private landmarker: PoseLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private onFrame: ((frame: PostureFrame) => void) | null = null;
  private running = false;
  private lastTimestamp = 0;
  private fatigueAccumulator = 15;

  async start({
    video,
    onFrame,
    onError
  }: {
    video: HTMLVideoElement;
    onFrame: (frame: PostureFrame) => void;
    onError: (msg: string) => void;
  }) {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });

      this.video = video;
      this.onFrame = onFrame;
      this.running = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, frameRate: 30 }
      });
      this.video.srcObject = stream;
      this.video.onloadedmetadata = () => {
        this.video?.play();
        this.process();
      };

      return true;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Camera access denied");
      return false;
    }
  }

  stop() {
    this.running = false;
    if (this.video?.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  }

  private process = () => {
    if (!this.running || !this.video || !this.landmarker) return;

    const now = Date.now();
    if (now - this.lastTimestamp >= 200) {
      this.lastTimestamp = now;
      const results = this.landmarker.detectForVideo(this.video, now);

      if (results.landmarks?.[0]) {
        const landmarks = results.landmarks[0];
        const metrics = this.calculateMetrics(landmarks);
        
        this.onFrame?.({
          ...metrics,
          landmarks,
          timestamp: now
        });
      }
    }
    requestAnimationFrame(this.process);
  };

  private calculateMetrics(landmarks: any[]) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const nose = landmarks[0];

    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
    const alignment = Math.max(0, 100 - shoulderTilt * 500);
    const symmetry = Math.max(0, 100 - Math.abs(leftShoulder.z - rightShoulder.z) * 400);
    const headCenter = Math.abs(nose.x - (leftShoulder.x + rightShoulder.x) / 2);
    const stability = Math.max(0, 100 - headCenter * 600);

    if (alignment < 70) this.fatigueAccumulator = Math.min(100, this.fatigueAccumulator + 0.5);
    else this.fatigueAccumulator = Math.max(10, this.fatigueAccumulator - 0.1);

    const score = alignment * 0.4 + symmetry * 0.3 + stability * 0.3;
    const riskLevel = classifyRisk(score, this.fatigueAccumulator);

    return { alignment, symmetry, stability, fatigue: this.fatigueAccumulator, score, riskLevel };
  }
}