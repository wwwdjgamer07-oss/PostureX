export type PostureSource = "camera" | "sensor";

export type PostureMode = "camera" | "sensor" | "auto";

export interface PostureFrame {
  score: number;
  forwardLean: boolean;
  sideTilt: boolean;
  unstable: boolean;
  source: PostureSource;
  ts: number;
}

