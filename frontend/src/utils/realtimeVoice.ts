/**
 * OpenAI Realtime WebRTC Client for browser-based voice interview.
 * Handles microphone capture, peer connection lifecycle, and event streaming.
 */

import { apiFetch } from './api';

export type VoiceStatus =
  | 'idle'
  | 'requesting_microphone'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'speaking'
  | 'error'
  | 'ended';

export interface TranscriptItem {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  isFinal: boolean;
  timestamp: string;
}

export interface RealtimeVoiceCallbacks {
  onStatusChange: (status: VoiceStatus, message?: string) => void;
  onTranscriptUpdate: (transcripts: TranscriptItem[]) => void;
  onError: (errorMessage: string) => void;
}

export class RealtimeVoiceSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private transcripts: TranscriptItem[] = [];
  private callbacks: RealtimeVoiceCallbacks;
  private sessionId: string;
  private questionNumber?: number;
  private isConnected: boolean = false;
  private hasTriggeredInitialGreeting: boolean = false;
  private currentQuestionText: string = '';
  private currentQuestionNumber: number = 1;

  constructor(sessionId: string, callbacks: RealtimeVoiceCallbacks, questionNumber?: number) {
    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.questionNumber = questionNumber;
  }

  public async start(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // 1. Verify browser mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support WebRTC audio recording (getUserMedia).');
      }

      // 2. Request microphone permission and acquire media stream
      this.callbacks.onStatusChange('requesting_microphone', 'Requesting microphone permission...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 3. Request ephemeral client credentials from backend
      this.callbacks.onStatusChange('connecting', 'Minting ephemeral voice credentials...');
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${this.sessionId}/voice/session`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_number: this.questionNumber,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const detail = errJson?.detail || `HTTP ${response.status}: Failed to initiate voice session.`;
        throw new Error(detail);
      }

      const sessionData = await response.json();
      const ephemeralKey = sessionData.client_secret;
      this.currentQuestionText = sessionData.question_text || '';
      this.currentQuestionNumber = sessionData.question_number || this.questionNumber || 1;

      // 4. Create WebRTC Peer Connection
      this.pc = new RTCPeerConnection();

      // Set up incoming audio track playback
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.pc.ontrack = (event) => {
        if (this.audioElement && event.streams[0]) {
          this.audioElement.srcObject = event.streams[0];
        }
      };

      // Add local microphone audio track to peer connection
      this.mediaStream.getAudioTracks().forEach((track) => {
        if (this.pc && this.mediaStream) {
          this.pc.addTrack(track, this.mediaStream);
        }
      });

      // 5. Create Data Channel for events (transcripts & speech state)
      this.dc = this.pc.createDataChannel('oai-events');

      this.dc.onopen = () => {
        this.isConnected = true;
        this.callbacks.onStatusChange('ready', 'Connected to AI Interviewer');
        // Trigger initial question if not yet sent
        this.triggerInitialQuestionOnce();
      };

      this.dc.onclose = () => {
        this.callbacks.onStatusChange('ended', 'Voice session closed');
      };

      this.dc.onerror = () => {
        this.callbacks.onError('Real-time data channel communication error.');
      };

      this.dc.onmessage = (event) => {
        this.handleDataChannelMessage(event.data);
      };

      // 6. Generate local SDP Offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // 7. Send SDP Offer directly to official OpenAI Realtime WebRTC calls endpoint
      const sdpUrl = 'https://api.openai.com/v1/realtime/calls';
      const sdpResponse = await fetch(sdpUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text().catch(() => '');
        throw new Error(`OpenAI Realtime WebRTC handshake rejected (HTTP ${sdpResponse.status}): ${errorText}`);
      }

      // 8. Set OpenAI's SDP Answer on local peer connection
      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };
      await this.pc.setRemoteDescription(answer);

    } catch (err: unknown) {
      this.cleanup();
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to establish real-time voice interview connection.';
      this.callbacks.onError(msg);
      this.callbacks.onStatusChange('error', msg);
    }
  }

  /**
   * Triggers the opening interview question exactly once.
   * Guarded against duplicate executions across data channel open & server session events.
   */
  private triggerInitialQuestionOnce(): void {
    if (this.hasTriggeredInitialGreeting) {
      return;
    }
    if (!this.dc || this.dc.readyState !== 'open') {
      return;
    }
    this.hasTriggeredInitialGreeting = true;

    const initPrompt = {
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
        instructions: `Warmly and concisely greet the candidate, present Question #${this.currentQuestionNumber}: "${this.currentQuestionText}", and invite them to share their high-level technical approach.`,
      },
    };

    try {
      this.dc.send(JSON.stringify(initPrompt));
    } catch (err) {
      console.warn('Failed to send initial response.create over data channel:', err);
    }
  }

  private handleDataChannelMessage(rawMsg: string): void {
    try {
      const event = JSON.parse(rawMsg);
      const eventType = event.type;

      // Server session lifecycle events
      if (eventType === 'session.created' || eventType === 'session.updated') {
        this.triggerInitialQuestionOnce();
      }

      // Candidate speech detection & barge-in
      else if (eventType === 'input_audio_buffer.speech_started') {
        this.callbacks.onStatusChange('listening', 'Listening to candidate...');
        // On candidate interruption, finalize any unfinalized assistant transcript
        const lastItem = this.transcripts[this.transcripts.length - 1];
        if (lastItem && lastItem.speaker === 'interviewer' && !lastItem.isFinal) {
          lastItem.isFinal = true;
          this.callbacks.onTranscriptUpdate([...this.transcripts]);
        }
      } else if (eventType === 'input_audio_buffer.speech_stopped') {
        this.callbacks.onStatusChange('ready', 'Processing response...');
      }

      // Interviewer speech output delta (audio transcript or direct text)
      else if (
        eventType === 'response.audio_transcript.delta' ||
        eventType === 'response.text.delta'
      ) {
        this.callbacks.onStatusChange('speaking', 'Interviewer speaking...');
        if (event.delta) {
          this.appendTranscript('interviewer', event.delta, false);
        }
      }

      // Interviewer speech turn completed
      else if (
        eventType === 'response.audio_transcript.done' ||
        eventType === 'response.text.done'
      ) {
        this.callbacks.onStatusChange('ready', 'Waiting for candidate...');
        const fullText = event.transcript || event.text;
        if (fullText) {
          this.finalizeTranscript('interviewer', fullText);
        } else {
          const lastItem = this.transcripts[this.transcripts.length - 1];
          if (lastItem && lastItem.speaker === 'interviewer' && !lastItem.isFinal) {
            lastItem.isFinal = true;
            this.callbacks.onTranscriptUpdate([...this.transcripts]);
          }
        }
      }

      // Candidate speech streaming delta
      else if (eventType === 'conversation.item.input_audio_transcription.delta') {
        if (event.delta) {
          this.appendTranscript('candidate', event.delta, false);
        }
      }

      // Candidate speech transcription finalized
      else if (eventType === 'conversation.item.input_audio_transcription.completed') {
        if (event.transcript) {
          this.finalizeTranscript('candidate', event.transcript);
        }
      }

      // Assistant response cancelled (e.g. candidate barged in)
      else if (eventType === 'response.cancelled') {
        const lastItem = this.transcripts[this.transcripts.length - 1];
        if (lastItem && lastItem.speaker === 'interviewer' && !lastItem.isFinal) {
          lastItem.isFinal = true;
          this.callbacks.onTranscriptUpdate([...this.transcripts]);
        }
      }

      // Turn response finished
      else if (eventType === 'response.done') {
        this.callbacks.onStatusChange('ready', 'Interviewer ready');
      }

      // Server error event
      else if (eventType === 'error') {
        const errDetail = event.error?.message || 'OpenAI Realtime API error';
        this.callbacks.onError(errDetail);
      }
    } catch {
      // Ignore unparseable raw events
    }
  }

  private appendTranscript(speaker: 'interviewer' | 'candidate', delta: string, isFinal: boolean): void {
    const lastItem = this.transcripts[this.transcripts.length - 1];
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (lastItem && lastItem.speaker === speaker && !lastItem.isFinal) {
      lastItem.text += delta;
      lastItem.isFinal = isFinal;
    } else {
      this.transcripts.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker,
        text: delta,
        isFinal,
        timestamp: now,
      });
    }

    this.callbacks.onTranscriptUpdate([...this.transcripts]);
  }

  private finalizeTranscript(speaker: 'interviewer' | 'candidate', fullText: string): void {
    const lastItem = this.transcripts[this.transcripts.length - 1];
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (lastItem && lastItem.speaker === speaker && !lastItem.isFinal) {
      lastItem.text = fullText;
      lastItem.isFinal = true;
    } else {
      this.transcripts.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker,
        text: fullText,
        isFinal: true,
        timestamp: now,
      });
    }

    this.callbacks.onTranscriptUpdate([...this.transcripts]);
  }

  public cleanup(): void {
    this.isConnected = false;
    this.hasTriggeredInitialGreeting = false;

    // Stop local microphone media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    // Close data channel
    if (this.dc) {
      try {
        this.dc.close();
      } catch {
        // ignore
      }
      this.dc = null;
    }

    // Close peer connection
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    // Detach audio playback element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.srcObject = null;
        this.audioElement.remove();
      } catch {
        // ignore
      }
      this.audioElement = null;
    }
  }

  public end(): void {
    this.cleanup();
    this.callbacks.onStatusChange('ended', 'Voice session ended');
  }
}
