export interface VoiceProfile {
  rate: number;
  pitch: number;
  volume: number;
}

export function resolveVoiceProfile(emotionTone: string): VoiceProfile {
  switch (emotionTone) {
    case "gentle":
      return { rate: 0.9, pitch: 0.96, volume: 0.95 };
    case "firm":
      return { rate: 0.94, pitch: 0.98, volume: 0.98 };
    case "upbeat":
      return { rate: 0.93, pitch: 1.02, volume: 0.95 };
    case "soothing":
      return { rate: 0.86, pitch: 0.94, volume: 0.92 };
    default:
      return { rate: 0.91, pitch: 0.97, volume: 0.95 };
  }
}

export function prepareSpeechText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?])/g, "$1")
    .replace(/:/g, ". ")
    .replace(/ - /g, ". ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

export function resolvePreferredVoice(locale = "en-US"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const localeVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)));
  const pool = localeVoices.length > 0 ? localeVoices : voices;

  const preferredNames = [
    "aria",
    "jenny",
    "sara",
    "samantha",
    "google us english",
    "neural",
    "natural"
  ];

  for (const hint of preferredNames) {
    const found = pool.find((voice) => voice.name.toLowerCase().includes(hint));
    if (found) return found;
  }

  const defaultVoice = pool.find((voice) => voice.default);
  return defaultVoice ?? pool[0] ?? null;
}
