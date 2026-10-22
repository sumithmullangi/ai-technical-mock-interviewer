/**
 * Zero-Cost Web Speech API Voice Engine for MockInterview.ai
 * Uses native browser SpeechRecognition and SpeechSynthesis (₹0 API cost).
 * Prevents echo/feedback loops by pausing recognition during synthesis.
 */

import { apiFetch } from './api.ts';

export type VoiceStatus =
  | 'idle'
  | 'requesting_microphone'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'ended';

export interface TranscriptItem {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  isFinal: boolean;
  timestamp: string;
  thoughtCompleted?: boolean;
}

export interface WebSpeechVoiceCallbacks {
  onStatusChange: (status: VoiceStatus, message?: string) => void;
  onTranscriptUpdate: (transcripts: TranscriptItem[]) => void;
  onError: (errorMessage: string) => void;
  onThoughtComplete?: (thoughtText: string) => void;
}

export interface BrowserSpeechCapabilities {
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  recognitionEngine?: 'SpeechRecognition' | 'webkitSpeechRecognition';
}

/**
 * Checks browser support for native speech recognition and synthesis.
 */
export function checkSpeechCapabilities(): BrowserSpeechCapabilities {
  const hasSynthesis =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
  const hasStandard = 'SpeechRecognition' in win;
  const hasWebkit = 'webkitSpeechRecognition' in win;
  const hasRecognition = hasStandard || hasWebkit;

  return {
    hasSpeechRecognition: hasRecognition,
    hasSpeechSynthesis: hasSynthesis,
    recognitionEngine: hasStandard
      ? 'SpeechRecognition'
      : hasWebkit
      ? 'webkitSpeechRecognition'
      : undefined,
  };
}

// Type definitions for Web Speech API recognition instances
export interface SpeechRecognitionResultItem {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
  length: number;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export class WebSpeechVoiceSession {
  private sessionId: string;
  private questionNumber: number;
  private questionText: string;
  private questionTopic: string;
  private callbacks: WebSpeechVoiceCallbacks;

  private isSessionActive: boolean = false;
  private isSpeaking: boolean = false;
  private recognition: SpeechRecognitionInstance | null = null;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private transcripts: TranscriptItem[] = [];
  private currentCandidateTranscriptId: string | null = null;
  private lastCandidateTranscriptId: string | null = null;

  constructor(
    sessionId: string,
    questionNumber: number,
    questionText: string,
    questionTopic: string,
    callbacks: WebSpeechVoiceCallbacks
  ) {
    this.sessionId = sessionId;
    this.questionNumber = questionNumber;
    this.questionText = questionText;
    this.questionTopic = questionTopic;
    this.callbacks = callbacks;
  }


  public async start(): Promise<void> {
    if (this.isSessionActive) {
      return;
    }

    const caps = checkSpeechCapabilities();
    if (!caps.hasSpeechRecognition || !caps.hasSpeechSynthesis) {
      const missing = [];
      if (!caps.hasSpeechRecognition) missing.push('Speech Recognition');
      if (!caps.hasSpeechSynthesis) missing.push('Speech Synthesis');
      const err = `Your browser does not support ${missing.join(' & ')}. Web Speech is natively supported in Google Chrome, Microsoft Edge, and Safari.`;
      this.callbacks.onError(err);
      this.callbacks.onStatusChange('error', err);
      return;
    }

    try {
      this.callbacks.onStatusChange('requesting_microphone', 'Checking microphone permission...');
      // Verify audio recording permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release immediate test stream; SpeechRecognition uses native audio engine
          stream.getTracks().forEach((track) => track.stop());
        } catch (mediaErr: unknown) {
          if (
            mediaErr instanceof Error &&
            (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError')
          ) {
            const msg = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
            this.callbacks.onError(msg);
            this.callbacks.onStatusChange('error', 'Microphone access denied');
            return;
          }
          throw mediaErr;
        }
      }

      this.isSessionActive = true;
      this.callbacks.onStatusChange('ready', 'Free Voice Mode active');

      // Initialize speech recognition
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      const SpeechRecConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecConstructor) {
        throw new Error('Speech recognition constructor unavailable');
      }

      this.recognition = new SpeechRecConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.setupRecognitionListeners();

      // Start initial interviewer greeting & challenge statement
      const greeting =
        `Welcome to question ${this.questionNumber} on ${this.questionTopic}. ` +
        `Here is your challenge: "${this.questionText}". ` +
        `When you're ready, please explain your technical approach, data structures, and trade-offs.`;

      this.speakText(greeting);

    } catch (err: unknown) {
      this.cleanup();
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to initialize browser speech voice session.';
      this.callbacks.onError(msg);
      this.callbacks.onStatusChange('error', msg);
    }
  }

  private setupRecognitionListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      // CRITICAL ECHO PREVENTION: Discard speech recognition results if the interviewer is speaking
      if (this.isSpeaking) {
        return;
      }

      let allFinal = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          if (result.isFinal) {
            allFinal += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
      }

      const activeText = (allFinal + interim).trim();
      if (!activeText) return;

      const isFinal = interim.trim().length === 0 && allFinal.trim().length > 0;

      this.callbacks.onStatusChange(
        'listening',
        isFinal ? 'Listening to candidate...' : 'Listening to candidate (speaking)...'
      );
      this.upsertCandidateTranscript(activeText, isFinal);

      // Schedule meaningful pause & completed thought detection (2.2s silence threshold)
      this.schedulePauseDetection(activeText);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'no-speech') {
        // Normal silence timeout in continuous mode; do not surface error
        return;
      }
      if (event.error === 'aborted') {
        // Deliberate abort during synthesis or cancel; do not surface error
        return;
      }
      if (event.error === 'not-allowed') {
        this.callbacks.onError('Microphone permission was denied. Please allow microphone access in your browser.');
        this.callbacks.onStatusChange('error', 'Microphone access denied');
        return;
      }
      if (event.error === 'audio-capture') {
        this.callbacks.onError('No microphone detected. Please ensure an audio input device is connected.');
        this.callbacks.onStatusChange('error', 'No microphone detected');
        return;
      }
      if (event.error === 'network') {
        this.callbacks.onError('Network connectivity required for browser speech recognition service.');
        this.callbacks.onStatusChange('error', 'Speech recognition offline');
        return;
      }
      console.warn('SpeechRecognition error:', event.error);
    };

    this.recognition.onend = () => {
      // In Chromium, continuous SpeechRecognition can stop after long pauses.
      // Re-start safely if session remains active and interviewer is not speaking.
      if (this.isSessionActive && !this.isSpeaking) {
        this.restartTimeout = setTimeout(() => {
          if (this.isSessionActive && !this.isSpeaking && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // Ignore already started errors
            }
          }
        }, 200);
      }
    };
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  private schedulePauseDetection(text: string): void {
    this.clearPauseTimer();

    // Only detect completed thoughts on substantive explanations (>= 18 characters & >= 3 words)
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (text.length >= 18 && words.length >= 3) {
      this.pauseTimer = setTimeout(() => {
        if (this.isSessionActive && !this.isSpeaking) {
          this.markThoughtAsCompleted(text);
        }
      }, 2200);
    }
  }

  private markThoughtAsCompleted(text: string): void {
    const targetId = this.currentCandidateTranscriptId || this.lastCandidateTranscriptId;
    if (targetId) {
      const item = this.transcripts.find((t) => t.id === targetId);
      if (item) {
        item.thoughtCompleted = true;
        item.isFinal = true;
        this.callbacks.onTranscriptUpdate([...this.transcripts]);
      }
    }
    this.callbacks.onThoughtComplete?.(text);
    this.callbacks.onStatusChange(
      'ready',
      'Completed thought detected • Click "Get Technical Follow-up" or continue speaking'
    );
  }


  /**
   * Synthesizes interviewer speech aloud via window.speechSynthesis.
   * Completely pauses SpeechRecognition to prevent audio feedback / echo.
   */
  public speakText(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // 1. Triple protection: Pause speech recognition immediately
    this.isSpeaking = true;
    this.clearPauseTimer();

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }

    // 2. Clear current candidate transcription item so candidate starts fresh next turn
    this.currentCandidateTranscriptId = null;

    // 3. Cancel any in-flight utterance
    window.speechSynthesis.cancel();

    // 4. Record interviewer transcript
    this.appendInterviewerTranscript(text);
    this.callbacks.onStatusChange('speaking', 'AI Interviewer speaking...');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Guy'))) ||
        v.lang === 'en-US'
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.isSessionActive) {
        this.callbacks.onStatusChange('listening', 'Waiting for candidate explanation...');
        // Debounced restart of speech recognition
        this.restartTimeout = setTimeout(() => {
          if (this.isSessionActive && !this.isSpeaking && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // ignore
            }
          }
        }, 250);
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (this.isSessionActive) {
        this.callbacks.onStatusChange('listening', 'Ready for candidate explanation...');
        this.restartTimeout = setTimeout(() => {
          if (this.isSessionActive && !this.isSpeaking && this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // ignore
            }
          }
        }, 200);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Interrupts and cancels active interviewer speech synthesis immediately (Barge-in).
   * Restores speech recognition for candidate.
   */
  public cancelSpeech(): void {
    if (!this.isSessionActive) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.isSpeaking = false;
    this.clearPauseTimer();

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.callbacks.onStatusChange('listening', 'Interviewer interrupted. Listening to candidate...');

    // Restart speech recognition immediately
    this.restartTimeout = setTimeout(() => {
      if (this.isSessionActive && !this.isSpeaking && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // ignore already started
        }
      }
    }, 100);
  }

  /**
   * Submits candidate spoken thoughts to backend for a relevant technical follow-up.
   * Free & resilient: uses Gemini free quota if available, or offline fallback if quota exhausted.
   * NOTE: This is NEVER called on partial/interim transcripts to avoid wasteful requests.
   */
  public async submitCandidateTurn(spokenText: string): Promise<void> {
    if (!spokenText.trim() || !this.isSessionActive) {
      return;
    }

    this.clearPauseTimer();
    this.callbacks.onStatusChange('thinking', 'AI analyzing technical approach...');

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${this.sessionId}/voice/interact`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_number: this.questionNumber,
          candidate_speech: spokenText,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `HTTP ${response.status}: Failed to get voice feedback.`);
      }

      const data = await response.json();
      const reply = data.interviewer_reply;
      if (reply) {
        this.speakText(reply);
      }
    } catch (err: unknown) {
      console.warn('Voice interaction fallback:', err);
      // Local fallback in case network to backend failed
      const localReply =
        "Understood. How would you handle potential edge cases or scale bottlenecks in this approach?";
      this.speakText(localReply);
    }
  }

  private upsertCandidateTranscript(text: string, isFinal: boolean): void {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!this.currentCandidateTranscriptId) {
      this.currentCandidateTranscriptId = `tx-cand-${Date.now()}`;
      this.transcripts.push({
        id: this.currentCandidateTranscriptId,
        speaker: 'candidate',
        text,
        isFinal,
        timestamp: now,
        thoughtCompleted: false,
      });
    } else {
      const item = this.transcripts.find((t) => t.id === this.currentCandidateTranscriptId);
      if (item) {
        item.text = text;
        item.isFinal = isFinal;
      } else {
        this.transcripts.push({
          id: this.currentCandidateTranscriptId,
          speaker: 'candidate',
          text,
          isFinal,
          timestamp: now,
          thoughtCompleted: false,
        });
      }
    }

    if (isFinal) {
      this.lastCandidateTranscriptId = this.currentCandidateTranscriptId;
      this.currentCandidateTranscriptId = null;
    }

    this.callbacks.onTranscriptUpdate([...this.transcripts]);
  }

  private appendInterviewerTranscript(text: string): void {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.transcripts.push({
      id: `tx-ai-${Date.now()}`,
      speaker: 'interviewer',
      text,
      isFinal: true,
      timestamp: now,
    });
    this.callbacks.onTranscriptUpdate([...this.transcripts]);
  }

  public cleanup(): void {
    this.isSessionActive = false;
    this.isSpeaking = false;
    this.clearPauseTimer();

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public end(): void {
    this.cleanup();
    this.callbacks.onStatusChange('ended', 'Voice session ended');
  }

  public getCandidateFullTranscript(): string {
    return this.transcripts
      .filter((t) => t.speaker === 'candidate')
      .map((t) => t.text)
      .join('\n\n');
  }
}

