export interface PlaygroundState {
  sdkReady: boolean;
  busyModule: string | null;
  error: string;
}

export interface PlaygroundHistoryItem {
  module: "text" | "image" | "analysis" | "stream" | "tts";
  prompt: string;
  status: "success" | "error";
  createdAt: string;
}

export interface PlaygroundOutputs {
  text: string;
  imageUrl: string;
  analysis: string;
  stream: string;
  ttsAudioUrl: string;
}

export type TextGenerateInput = {
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type ImageGenerateInput = {
  prompt: string;
  model: string;
};

export type ImageAnalyzeInput = {
  prompt: string;
  imageUrl: string;
  model: string;
};

export type StreamInput = {
  prompt: string;
  model: string;
};

export type TtsInput = {
  text: string;
};
