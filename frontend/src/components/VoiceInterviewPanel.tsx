import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Info,
  Square,
  CheckCircle2,
} from 'lucide-react';
import {
  WebSpeechVoiceSession,
  checkSpeechCapabilities,
  type VoiceStatus,
  type TranscriptItem,
  type BrowserSpeechCapabilities,
} from '../utils/webSpeechVoice';

interface VoiceInterviewPanelProps {
  sessionId: string;
  questionNumber?: number;
  questionTopic?: string;
  questionText?: string;
  onInsertTranscript?: (transcript: string) => void;
}

export const VoiceInterviewPanel: React.FC<VoiceInterviewPanelProps> = ({
  sessionId,
  questionNumber = 1,
  questionTopic = 'Technical Challenge',
  questionText = 'Solve the technical problem statement.',
  onInsertTranscript,
}) => {
  const [capabilities] = useState<BrowserSpeechCapabilities>(checkSpeechCapabilities);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Free Voice Mode Standby (₹0 API Cost)');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [insertedNotice, setInsertedNotice] = useState<boolean>(false);

  const sessionRef = useRef<WebSpeechVoiceSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcripts to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Clean up session when component unmounts or sessionId changes
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.cleanup();
        sessionRef.current = null;
      }
    };
  }, [sessionId]);

  // Listen for Escape key to interrupt interviewer speech immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status === 'speaking' && sessionRef.current) {
        sessionRef.current.cancelSpeech();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Clean up and reset voice session if candidate advances to a new question
  const prevQNumRef = useRef(questionNumber);
  useEffect(() => {
    if (prevQNumRef.current !== questionNumber) {
      prevQNumRef.current = questionNumber;
      if (sessionRef.current) {
        sessionRef.current.end();
        sessionRef.current = null;
        setStatus('idle');
        setStatusMessage(`Question #${questionNumber} ready`);
        setErrorMessage(null);
      }
    }
  }, [questionNumber]);

  const handleStartVoice = async () => {
    setErrorMessage(null);
    setInsertedNotice(false);

    if (sessionRef.current) {
      sessionRef.current.cleanup();
      sessionRef.current = null;
    }

    const voiceSession = new WebSpeechVoiceSession(
      sessionId,
      questionNumber,
      questionText,
      questionTopic,
      {
        onStatusChange: (newStatus, msg) => {
          setStatus(newStatus);
          if (msg) setStatusMessage(msg);
        },
        onTranscriptUpdate: (newTranscripts) => {
          setTranscripts(newTranscripts);
        },
        onError: (err) => {
          setErrorMessage(err);
        },
        onThoughtComplete: (_completedText) => {
          // Thought completed callback (pause detected)
        },
      }
    );

    sessionRef.current = voiceSession;
    await voiceSession.start();
  };

  const handleEndVoice = () => {
    if (sessionRef.current) {
      sessionRef.current.end();
      sessionRef.current = null;
    }
    setStatus('ended');
    setStatusMessage('Voice interview ended');
  };

  const handleInterruptSpeaking = () => {
    if (sessionRef.current) {
      sessionRef.current.cancelSpeech();
    }
  };

  const handleAskFollowUp = async () => {
    if (!sessionRef.current) return;
    const candidateText = sessionRef.current.getCandidateFullTranscript();
    if (!candidateText.trim()) {
      setErrorMessage('Please speak your technical explanation before requesting a follow-up.');
      return;
    }
    await sessionRef.current.submitCandidateTurn(candidateText);
  };

  const handleCopyTranscript = () => {
    if (!sessionRef.current) return;
    const candidateText = sessionRef.current.getCandidateFullTranscript();
    if (candidateText.trim() && onInsertTranscript) {
      onInsertTranscript(candidateText);
      setInsertedNotice(true);
      setTimeout(() => setInsertedNotice(false), 3000);
    }
  };

  const isLive = status === 'ready' || status === 'listening' || status === 'speaking' || status === 'thinking';
  const isConnecting = status === 'requesting_microphone';
  const candidateHasSpoken = transcripts.some((t) => t.speaker === 'candidate' && t.text.trim().length > 0);
  const isBrowserSupported = capabilities.hasSpeechRecognition && capabilities.hasSpeechSynthesis;

  return (
    <div className="w-full rounded-2xl border border-[#E5DFD5] dark:border-[#3A0F34]/70 bg-white dark:bg-[#16061D] transition-all overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]/80 dark:bg-[#120516]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] shadow-2xs">
            <Radio className={`h-3.5 w-3.5 ${isLive ? 'text-[#EAAA00] animate-pulse' : 'text-[#7A7875] dark:text-slate-400'}`} />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#3A0F34] dark:text-[#EAAA00]">
            AI Voice Interactor (Zero-Cost Mode) • {questionTopic}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1] dark:bg-[#250C3D] text-[10px] font-mono shadow-2xs">
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
            ) : isConnecting ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#EAAA00]" />
            ) : status === 'error' ? (
              <span className="h-2 w-2 rounded-full bg-[#EF4444]"></span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-[#7A7875]"></span>
            )}
            <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">
              {status === 'speaking'
                ? 'INTERVIEWER SPEAKING (ESC TO INTERRUPT)'
                : status === 'listening'
                ? 'LISTENING TO CANDIDATE'
                : status === 'thinking'
                ? 'ANALYZING APPROACH...'
                : status === 'ready'
                ? 'VOICE LIVE • READY'
                : status === 'requesting_microphone'
                ? 'REQUESTING MIC...'
                : status === 'error'
                ? 'VOICE UNAVAILABLE'
                : !isBrowserSupported
                ? 'BROWSER NOT SUPPORTED'
                : 'VOICE STANDBY'}
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] underline cursor-pointer"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* Unsupported Browser Notice */}
          {!isBrowserSupported && (
            <div className="p-3.5 border border-[#EAAA00]/40 bg-[#EAAA00]/10 text-[#3A0F34] dark:text-[#EAAA00] text-xs font-mono flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block mb-0.5">Browser Compatibility Notice:</span>
                <span>
                  Browser speech recognition is natively supported in Google Chrome, Microsoft Edge, and Safari.
                  Firefox desktop does not currently support the Web Speech recognition API by default.
                  You can conduct your mock interview seamlessly using the standard text and code workspace below.
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444] text-xs font-mono flex items-start gap-2.5 animate-fadeIn shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block mb-0.5">Voice Notice:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Active Voice Waveform & Status Visualizer */}
          {isLive && (
            <div className="p-4 rounded-xl border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/80 dark:bg-[#120516] flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    status === 'speaking'
                      ? 'border-[#EAAA00] bg-[#EAAA00]/20 text-[#8A6500] dark:text-[#EAAA00]'
                      : 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]'
                  }`}
                >
                  {status === 'speaking' ? (
                    <Volume2 className="h-4 w-4 animate-bounce" />
                  ) : (
                    <Mic className="h-4 w-4 animate-pulse" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#7A7875] dark:text-slate-400 block">
                    Mode: Free Web Speech • Turn-Based (Echo Suppression Active)
                  </span>
                  <span className="text-xs font-mono font-bold text-[#111111] dark:text-[#F8F6F1]">
                    {statusMessage}
                  </span>
                </div>
              </div>

              {/* Right side controls: Interruption Button during playback + Waveform */}
              <div className="flex items-center gap-3">
                {status === 'speaking' && (
                  <button
                    type="button"
                    onClick={handleInterruptSpeaking}
                    className="px-3 py-1.5 rounded-xl border border-[#EF4444] bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] text-[10px] font-mono font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Stop interviewer playback and speak now (or press Escape)"
                  >
                    <Square className="h-2.5 w-2.5 fill-current" />
                    <span>Interrupt (Esc)</span>
                  </button>
                )}

                {/* Dynamic waveform visual effect */}
                <div className="flex items-center gap-1 h-6">
                  <span
                    className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${
                      status === 'speaking'
                        ? 'h-6 animate-pulse'
                        : status === 'listening'
                        ? 'h-4 animate-pulse'
                        : 'h-1.5'
                    }`}
                  ></span>
                  <span
                    className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${
                      status === 'speaking'
                        ? 'h-4 animate-pulse'
                        : status === 'listening'
                        ? 'h-5 animate-pulse'
                        : 'h-1.5'
                    }`}
                  ></span>
                  <span
                    className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${
                      status === 'speaking'
                        ? 'h-5 animate-pulse'
                        : status === 'listening'
                        ? 'h-3 animate-pulse'
                        : 'h-1.5'
                    }`}
                  ></span>
                  <span
                    className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${
                      status === 'speaking'
                        ? 'h-3 animate-pulse'
                        : status === 'listening'
                        ? 'h-6 animate-pulse'
                        : 'h-1.5'
                    }`}
                  ></span>
                  <span
                    className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${
                      status === 'speaking'
                        ? 'h-6 animate-pulse'
                        : status === 'listening'
                        ? 'h-4 animate-pulse'
                        : 'h-1.5'
                    }`}
                  ></span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Dialogue / Transcript Stream */}
          {transcripts.length > 0 && (
            <div className="rounded-xl border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/50 dark:bg-[#120516]/60 p-3.5 max-h-56 overflow-y-auto space-y-2.5 font-sans shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/40">
                <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#7A7875] dark:text-slate-400 uppercase">
                  <MessageSquare className="h-3 w-3 text-[#EAAA00]" />
                  <span>Live Spoken Dialogue</span>
                </div>
                {candidateHasSpoken && onInsertTranscript && (
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    className="text-[10px] font-mono text-[#3A0F34] dark:text-[#EAAA00] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span>{insertedNotice ? 'Copied to Workspace!' : 'Copy Thoughts to Editor'}</span>
                  </button>
                )}
              </div>

              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl text-xs border ${
                    item.speaker === 'interviewer'
                      ? 'border-[#3A0F34]/30 dark:border-[#EAAA00]/40 bg-white dark:bg-[#250C3D]/40 text-[#111111] dark:text-[#F8F6F1]'
                      : 'border-[#E5DFD5] dark:border-[#3A0F34]/40 bg-[#FAF8F5] dark:bg-[#16061D] text-[#333333] dark:text-slate-300 ml-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono">
                    <span
                      className={`font-bold uppercase ${
                        item.speaker === 'interviewer'
                          ? 'text-[#3A0F34] dark:text-[#EAAA00]'
                          : 'text-[#7A7875] dark:text-slate-400'
                      }`}
                    >
                      {item.speaker === 'interviewer' ? 'AI Interviewer' : 'Candidate (Spoken Thoughts)'}
                    </span>
                    <span className="text-[#7A7875] dark:text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>

                  {/* Interim Recognition Live Indicator */}
                  {item.speaker === 'candidate' && !item.isFinal && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#EAAA00] mt-1.5 animate-pulse">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EAAA00] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#EAAA00]"></span>
                      </span>
                      <span>Candidate speaking (interim transcript)...</span>
                    </div>
                  )}

                  {/* Thought Completed (Pause Detected) Badge */}
                  {item.speaker === 'candidate' && item.thoughtCompleted && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E5DFD5]/40 dark:border-[#3A0F34]/30">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Thought Completed (Pause Detected)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAskFollowUp}
                        disabled={status === 'thinking' || status === 'speaking'}
                        className="text-[10px] font-mono text-[#3A0F34] dark:text-[#EAAA00] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="h-2.5 w-2.5 text-[#EAAA00]" />
                        <span>Ask Technical Follow-up</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* Privacy & Network Disclosure */}
          <div className="text-[11px] font-sans text-[#7A7875] dark:text-slate-400 flex items-start gap-1.5 pt-1">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#EAAA00]" />
            <span>
              <strong>Privacy & Technical Notice:</strong> Voice mode uses your browser's native Web Speech API (₹0 API cost). Speech recognition runs through your browser vendor's speech engine (e.g. Google Speech on Chrome/Edge, Apple in Safari) and requires internet access; it is not fully offline. To eliminate echo feedback, the microphone is automatically paused during interviewer speech and resumes when playback completes or is interrupted.
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5DFD5]/70 dark:border-[#3A0F34]/40">
            <div className="text-[11px] font-sans text-[#7A7875] dark:text-slate-400">
              {!isLive ? (
                <span>Speak with the AI interviewer using your microphone and browser speech synthesis.</span>
              ) : (
                <span className="text-[#10B981] font-mono">
                  ● Free voice session active (Question #{questionNumber})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Barge-in Interruption Button */}
              {isLive && status === 'speaking' && (
                <button
                  type="button"
                  onClick={handleInterruptSpeaking}
                  className="px-3.5 py-2 rounded-xl border border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Square className="h-3 w-3 fill-current text-[#EF4444]" />
                  <span>Interrupt Speaking (Esc)</span>
                </button>
              )}

              {isLive && candidateHasSpoken && status !== 'speaking' && (
                <button
                  type="button"
                  onClick={handleAskFollowUp}
                  disabled={status === 'thinking'}
                  className="px-3.5 py-2 rounded-xl border border-[#3A0F34] dark:border-[#EAAA00] bg-white dark:bg-[#16061D] text-[#3A0F34] dark:text-[#EAAA00] hover:bg-[#FAF8F5] text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Sparkles className="h-3 w-3 text-[#EAAA00]" />
                  <span>Get Technical Follow-up</span>
                </button>
              )}

              {!isLive ? (
                <button
                  type="button"
                  onClick={handleStartVoice}
                  disabled={isConnecting || !isBrowserSupported}
                  id="start-voice-interview-button"
                  className="px-4 py-2.5 rounded-xl border border-[#3A0F34] dark:border-[#EAAA00] bg-gradient-to-r from-[#3A0F34] to-[#52174A] hover:from-[#2A0B26] hover:to-[#3E1137] dark:from-[#EAAA00] dark:to-[#F1C40F] dark:hover:from-[#D49800] dark:hover:to-[#E0B000] text-white dark:text-[#120516] text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs hover:shadow-md hover:scale-[1.02]"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />
                  )}
                  <span>{isConnecting ? 'Starting Mic...' : 'Start Free Voice Interview'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEndVoice}
                  id="end-voice-interview-button"
                  className="px-4 py-2.5 rounded-xl border border-[#EF4444] bg-white dark:bg-[#16061D] text-[#EF4444] hover:bg-[#EF4444]/10 text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <MicOff className="h-3.5 w-3.5 text-[#EF4444]" />
                  <span>End Voice Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

