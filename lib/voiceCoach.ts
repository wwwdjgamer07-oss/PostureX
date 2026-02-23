let synth: SpeechSynthesis | null = null;
if (typeof window !== "undefined") {
  synth = window.speechSynthesis;
}

export function speak(text: string, interrupt = false) {
  if (!synth) return;
  if (interrupt) synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (!synth) return;
  synth.cancel();
}