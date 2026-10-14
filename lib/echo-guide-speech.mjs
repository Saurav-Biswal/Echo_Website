import { classifySpeechRecognitionError } from './echo-guide-knowledge.mjs';

export const SPEECH_RESTART_DELAY_MS = 350;
export const MAX_SPEECH_RESTARTS = 5;
export const SPEECH_STOP_TIMEOUT_MS = 3000;

/** @typedef {'idle' | 'listening' | 'processing' | 'exhausted'} SpeechSessionStatus */
/** @typedef {{ category: string, message: string }} SpeechDiagnostic */

export function readSpeechResultSnapshot(results) {
  const finalSegments = [];
  const interimSegments = [];
  for (const result of Array.from(results ?? [])) {
    const text = String(result?.[0]?.transcript ?? '').trim();
    if (!text) continue;
    (result.isFinal ? finalSegments : interimSegments).push(text);
  }
  return { final: finalSegments.join(' '), interim: interimSegments.join(' ') };
}

export function joinSpeechSegments(...segments) {
  return segments.map((segment) => String(segment ?? '').trim()).filter(Boolean).join(' ');
}

/** One user-requested speech session, with at most one active browser recognizer. */
export class EchoSpeechSession {
  /**
   * @param {new () => {
   *   lang: string, continuous: boolean, interimResults: boolean,
   *   onresult: null | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void),
   *   onerror: null | ((event: { error: string }) => void), onend: null | (() => void),
   *   start: () => void, stop: () => void, abort: () => void
   * }} Recognition
   * @param {object} [options]
   * @param {string} [options.language]
   * @param {string} [options.initialTranscript]
   * @param {(transcript: string) => void} [options.onTranscript]
   * @param {(status: SpeechSessionStatus, transcript: string) => void} [options.onStatus]
   * @param {(diagnostic: SpeechDiagnostic) => void} [options.onError]
   * @param {(callback: () => void, delay: number) => ReturnType<typeof setTimeout>} [options.schedule]
   * @param {(timer: ReturnType<typeof setTimeout>) => void} [options.cancelSchedule]
   * @param {number} [options.restartDelayMs]
   * @param {number} [options.maxRestarts]
   */
  constructor(Recognition, {
    language = 'en-IN',
    initialTranscript = '',
    onTranscript = () => {},
    onStatus = () => {},
    onError = () => {},
    schedule = globalThis.setTimeout,
    cancelSchedule = globalThis.clearTimeout,
    restartDelayMs = SPEECH_RESTART_DELAY_MS,
    maxRestarts = MAX_SPEECH_RESTARTS,
  } = {}) {
    this.Recognition = Recognition;
    this.language = language;
    this.transcript = String(initialTranscript).trim();
    this.finalForRecognizer = '';
    this.interimForRecognizer = '';
    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
    this.onError = onError;
    this.schedule = schedule;
    this.cancelSchedule = cancelSchedule;
    this.restartDelayMs = restartDelayMs;
    this.maxRestarts = maxRestarts;
    this.active = false;
    this.recognition = null;
    this.restartTimer = null;
    this.stopTimer = null;
    this.restartCount = 0;
    this.stopping = false;
    this.starting = false;
  }

  start() {
    if (this.active || this.recognition || this.starting || typeof this.Recognition !== 'function') return false;
    this.active = true;
    this.stopping = false;
    this.restartCount = 0;
    this.startRecognizer();
    return this.active;
  }

  startRecognizer() {
    if (!this.active || this.recognition || this.starting) return;
    this.starting = true;
    let recognition;
    try {
      recognition = new this.Recognition();
      recognition.lang = this.language;
      recognition.continuous = true;
      recognition.interimResults = true;
      this.finalForRecognizer = '';
      this.interimForRecognizer = '';
      recognition.onresult = (event) => {
        if (this.recognition !== recognition || (!this.active && !this.stopping)) return;
        const snapshot = readSpeechResultSnapshot(event.results);
        this.finalForRecognizer = snapshot.final;
        this.interimForRecognizer = snapshot.interim;
        if (snapshot.final) this.restartCount = 0;
        this.emitTranscript();
      };
      recognition.onerror = (event) => {
        if (this.recognition !== recognition || (!this.active && !this.stopping)) return;
        const diagnostic = classifySpeechRecognitionError(event.error);
        // A no-speech event is commonly followed by an end event after a pause.
        // Let that end restart this still-requested session with a backoff.
        if (diagnostic.category === 'no-speech') {
          this.onError(diagnostic);
          return;
        }
        this.active = false;
        this.stopping = false;
        this.cancelStopTimeout();
        this.detach(recognition);
        try { recognition.abort(); } catch { /* The browser may already have ended it. */ }
        this.onStatus('idle', this.transcript);
        this.onError(diagnostic);
      };
      recognition.onend = () => this.handleEnd(recognition);
      this.recognition = recognition;
      recognition.start();
      this.onStatus('listening', this.transcript);
    } catch (startError) {
      if (recognition) this.detach(recognition);
      this.active = false;
      const category = startError instanceof globalThis.DOMException && startError.name === 'NotAllowedError' ? 'not-allowed' : 'other';
      this.onStatus('idle', this.transcript);
      this.onError(classifySpeechRecognitionError(category));
    } finally {
      this.starting = false;
    }
  }

  emitTranscript() {
    this.onTranscript(joinSpeechSegments(this.transcript, this.finalForRecognizer, this.interimForRecognizer).slice(0, 2000));
  }

  handleEnd(recognition) {
    if (this.recognition !== recognition) return;
    this.cancelStopTimeout();
    this.transcript = joinSpeechSegments(this.transcript, this.finalForRecognizer).slice(0, 2000);
    this.finalForRecognizer = '';
    this.interimForRecognizer = '';
    this.detach(recognition);
    if (!this.active || this.stopping) {
      this.active = false;
      this.stopping = false;
      this.onTranscript(this.transcript);
      this.onStatus('idle', this.transcript);
      return;
    }

    if (this.restartCount >= this.maxRestarts) {
      this.active = false;
      this.onTranscript(this.transcript);
      this.onStatus('exhausted', this.transcript);
      return;
    }
    this.restartCount += 1;
    this.restartTimer = this.schedule(() => {
      this.restartTimer = null;
      this.startRecognizer();
    }, this.restartDelayMs);
  }

  detach(recognition) {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    if (this.recognition === recognition) this.recognition = null;
  }

  stop() {
    if (!this.active && !this.recognition) return;
    this.active = false;
    this.stopping = true;
    this.cancelPendingRestart();
    const recognition = this.recognition;
    if (!recognition) {
      this.stopping = false;
      this.onStatus('idle', this.transcript);
      return;
    }
    this.onStatus('processing', this.transcript);
    try {
      recognition.stop();
      if (this.recognition === recognition && this.stopping) {
        this.stopTimer = this.schedule(() => {
          this.stopTimer = null;
          if (this.recognition !== recognition) return;
          this.transcript = joinSpeechSegments(this.transcript, this.finalForRecognizer).slice(0, 2000);
          this.detach(recognition);
          try { recognition.abort(); } catch { /* The browser may already have stopped it. */ }
          this.finalForRecognizer = '';
          this.interimForRecognizer = '';
          this.stopping = false;
          this.onTranscript(this.transcript);
          this.onStatus('idle', this.transcript);
        }, SPEECH_STOP_TIMEOUT_MS);
      }
    } catch {
      this.cancelStopTimeout();
      this.transcript = joinSpeechSegments(this.transcript, this.finalForRecognizer).slice(0, 2000);
      this.detach(recognition);
      try { recognition.abort(); } catch { /* Already stopped. */ }
      this.stopping = false;
      this.onTranscript(this.transcript);
      this.onStatus('idle', this.transcript);
    }
  }

  abort() {
    this.active = false;
    this.stopping = false;
    this.cancelPendingRestart();
    this.cancelStopTimeout();
    const recognition = this.recognition;
    if (recognition) {
      this.transcript = joinSpeechSegments(this.transcript, this.finalForRecognizer).slice(0, 2000);
      this.detach(recognition);
      try { recognition.abort(); } catch { /* Closing or sending always wins over cleanup errors. */ }
    }
    this.finalForRecognizer = '';
    this.interimForRecognizer = '';
  }

  cancelPendingRestart() {
    if (this.restartTimer !== null) this.cancelSchedule(this.restartTimer);
    this.restartTimer = null;
  }

  cancelStopTimeout() {
    if (this.stopTimer !== null) this.cancelSchedule(this.stopTimer);
    this.stopTimer = null;
  }
}
