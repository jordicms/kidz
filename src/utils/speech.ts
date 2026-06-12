/** Narración por voz con la Web Speech API (funciona también en iOS/Android vía WebView). */

export function speak(text: string, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.startsWith('es'));
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}
