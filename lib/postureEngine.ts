import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PostureMetrics {
  alignment: number;
  stability: number;
  symmetry: number;
  riskLevel: RiskLevel;
}

export interface PostureFrame {
  landmarks: PoseLandmark[];
  metrics: PostureMetrics;
  fallback?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export class PostureEngine {
  private poseLandmarker: PoseLandmarker | null = null;
  private previousShoulderCenter: { x: number; y: number } | null = null;
  private fallbackMode = false;
  private fallbackSeed = 0;

  async initialize() {
    if (this.poseLandmarker || this.fallbackMode) {
      return;
    }

    const modelCandidates = [
      "/mediapipe/models/pose_landmarker_lite.task",
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    ];
    const wasmCandidates = [
      "/mediapipe/wasm",
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm",
      "https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm"
    ];

    for (const wasmPath of wasmCandidates) {
      for (const modelAssetPath of modelCandidates) {
        try {
          const vision = await FilesetResolver.forVisionTasks(wasmPath);
          this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath },
            runningMode: "VIDEO",
            numPoses: 1
          });
          return;
        } catch {
          // Try next candidate.
        }
      }
    }

    // If model assets are blocked/offline, keep the session running with fallback metrics.
    this.fallbackMode = true;
    this.fallbackSeed = Date.now();
  }

  async analyze(video: HTMLVideoElement): Promise<PostureFrame | null> {
    if (!this.poseLandmarker) {
      await this.initialize();
    }

    if (this.fallbackMode || !this.poseLandmarker) {
      return this.createFallbackFrame();
    }

    let result: PoseLandmarkerResult;
    try {
      result = this.poseLandmarker.detectForVideo(
        video,
        performance.now()
      ) as PoseLandmarkerResult;
    } catch {
      this.fallbackMode = true;
      this.poseLandmarker?.close();
      this.poseLandmarker = null;
      return this.createFallbackFrame();
    }

    if (!result.landmarks || result.landmarks.length === 0) {
      return null;
    }

    const firstPose = result.landmarks[0];
    if (!firstPose || firstPose.length === 0) {
      return null;
    }

    const landmarks: PoseLandmark[] = firstPose.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility
    }));

    return {
      landmarks,
      metrics: this.calculateMetrics(landmarks),
      fallback: false
    };
  }

  stop() {
    this.poseLandmarker?.close();
    this.poseLandmarker = null;
    this.previousShoulderCenter = null;
    this.fallbackMode = false;
    this.fallbackSeed = 0;
  }

  private calculateMetrics(landmarks: PoseLandmark[]): PostureMetrics {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return {
        alignment: 50,
        stability: 50,
        symmetry: 50,
        riskLevel: "HIGH"
      };
    }

    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
    const hipTilt = Math.abs(leftHip.y - rightHip.y);
    const alignment = clamp(100 - (shoulderTilt + hipTilt) * 150, 0, 100);

    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const symmetry = clamp(100 - Math.abs(shoulderCenterX - hipCenterX) * 320, 0, 100);

    const currentShoulderCenter = {
      x: shoulderCenterX,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    let stability = 92;
    if (this.previousShoulderCenter) {
      const dx = currentShoulderCenter.x - this.previousShoulderCenter.x;
      const dy = currentShoulderCenter.y - this.previousShoulderCenter.y;
      const movement = Math.sqrt(dx * dx + dy * dy);
      stability = clamp(100 - movement * 900, 0, 100);
    }
    this.previousShoulderCenter = currentShoulderCenter;

    const composite = alignment * 0.45 + symmetry * 0.3 + stability * 0.25;
    const riskLevel: RiskLevel =
      composite >= 80 ? "LOW" : composite >= 60 ? "MODERATE" : composite >= 40 ? "HIGH" : "SEVERE";

    return {
      alignment,
      stability,
      symmetry,
      riskLevel
    };
  }

  private createFallbackFrame(): PostureFrame {
    const t = (Date.now() - this.fallbackSeed) / 1000;
    const alignment = clamp(74 + Math.sin(t * 0.55) * 6, 0, 100);
    const symmetry = clamp(72 + Math.cos(t * 0.47) * 7, 0, 100);
    const stability = clamp(76 + Math.sin(t * 0.4 + 1.2) * 5, 0, 100);
    const composite = alignment * 0.45 + symmetry * 0.3 + stability * 0.25;
    const riskLevel: RiskLevel =
      composite >= 80 ? "LOW" : composite >= 60 ? "MODERATE" : composite >= 40 ? "HIGH" : "SEVERE";

    return {
      landmarks: [],
      metrics: {
        alignment,
        stability,
        symmetry,
        riskLevel
      },
      fallback: true
    };
  }
}
