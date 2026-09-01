export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

type RecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function speechRecognitionSupported(): boolean {
  return Boolean(getRecognitionCtor());
}

export function startSpeechRecognition(options: {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): { stop: () => void } | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let transcript = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) isFinal = true;
    }
    options.onResult(transcript.trim(), isFinal);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    options.onError?.(event.error || 'speech recognition error');
  };
  recognition.onend = () => {
    options.onEnd?.();
  };

  recognition.start();
  return {
    stop: () => recognition.stop(),
  };
}
