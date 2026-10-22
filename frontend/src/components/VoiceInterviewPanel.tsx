import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  AlertCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import {
  RealtimeVoiceSession,
  type VoiceStatus,
  type TranscriptItem,
} from '../utils/realtimeVoice';

interface VoiceInterviewPanelProps {
  sessionId: string;
  questionNumber?: number;
  questionTopic?: string;
}

export const VoiceInterviewPanel: React.FC<VoiceInterviewPanelProps> = ({
  sessionId,
  questionNumber = 1,
  questionTopic = 'Technical Challenge',
}) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Voice mode idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const sessionRef = useRef<RealtimeVoiceSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcripts to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Clean up WebRTC session when component unmounts or sessionId changes
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.cleanup();
        sessionRef.current = null;
      }
    };
  }, [sessionId]);

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
    if (sessionRef.current) {
      sessionRef.current.cleanup();
      sessionRef.current = null;
    }

    const voiceSession = new RealtimeVoiceSession(
      sessionId,
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
      },
      questionNumber
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

  const isLive = status === 'ready' || status === 'listening' || status === 'speaking';
  const isConnecting = status === 'requesting_microphone' || status === 'connecting';

  return (
    <div className="w-full border border-[#E5DFD5] dark:border-[#3A0F34]/70 bg-white dark:bg-[#16061D] transition-all">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]/80 dark:bg-[#120516]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-6 w-6 rounded-none border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D]">
            <Radio className={`h-3.5 w-3.5 ${isLive ? 'text-[#EAAA00] animate-pulse' : 'text-[#7A7875] dark:text-slate-400'}`} />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#3A0F34] dark:text-[#EAAA00]">
            AI Voice Interactor • {questionTopic}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1] dark:bg-[#250C3D] text-[10px] font-mono">
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
                ? 'INTERVIEWER SPEAKING'
                : status === 'listening'
                ? 'LISTENING TO CANDIDATE'
                : status === 'ready'
                ? 'VOICE LIVE • READY'
                : status === 'requesting_microphone'
                ? 'REQUESTING MIC...'
                : status === 'connecting'
                ? 'CONNECTING...'
                : status === 'error'
                ? 'VOICE UNAVAILABLE'
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
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 border border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444] text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block mb-0.5">Voice Connection Notice:</span>
                <span>{errorMessage}</span>
                {errorMessage.includes('OPENAI_API_KEY') && (
                  <p className="mt-1.5 text-[11px] text-[#555555] dark:text-slate-300 font-sans">
                    Note: The Realtime Voice POC requires an OpenAI API key on the backend. You can continue your mock interview seamlessly using the standard text and code workspace below.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Active Voice Waveform & Status Visualizer */}
          {isLive && (
            <div className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/80 dark:bg-[#120516] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 border ${status === 'speaking' ? 'border-[#EAAA00] bg-[#EAAA00]/20 text-[#8A6500] dark:text-[#EAAA00]' : 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]'}`}>
                  {status === 'speaking' ? (
                    <Volume2 className="h-4 w-4 animate-bounce" />
                  ) : (
                    <Mic className="h-4 w-4 animate-pulse" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#7A7875] dark:text-slate-400 block">
                    Current Mode
                  </span>
                  <span className="text-xs font-mono font-bold text-[#111111] dark:text-[#F8F6F1]">
                    {statusMessage}
                  </span>
                </div>
              </div>

              {/* Dynamic waveform visual effect */}
              <div className="flex items-center gap-1 h-6">
                <span className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${status === 'speaking' ? 'h-6 animate-pulse' : status === 'listening' ? 'h-4 animate-pulse' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${status === 'speaking' ? 'h-4 animate-pulse' : status === 'listening' ? 'h-5 animate-pulse' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${status === 'speaking' ? 'h-5 animate-pulse' : status === 'listening' ? 'h-3 animate-pulse' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${status === 'speaking' ? 'h-3 animate-pulse' : status === 'listening' ? 'h-6 animate-pulse' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-150 ${status === 'speaking' ? 'h-6 animate-pulse' : status === 'listening' ? 'h-4 animate-pulse' : 'h-1.5'}`}></span>
              </div>
            </div>
          )}

          {/* Real-time Dialogue / Transcript Stream */}
          {transcripts.length > 0 && (
            <div className="border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/50 dark:bg-[#120516]/60 p-3 max-h-56 overflow-y-auto space-y-2.5 font-sans">
              <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#7A7875] dark:text-slate-400 uppercase pb-1 border-b border-[#E5DFD5] dark:border-[#3A0F34]/40">
                <MessageSquare className="h-3 w-3 text-[#EAAA00]" />
                <span>Live Dialogue Transcript</span>
              </div>

              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 text-xs border ${
                    item.speaker === 'interviewer'
                      ? 'border-[#3A0F34]/30 dark:border-[#EAAA00]/40 bg-white dark:bg-[#250C3D]/40 text-[#111111] dark:text-[#F8F6F1]'
                      : 'border-[#E5DFD5] dark:border-[#3A0F34]/40 bg-[#FAF8F5] dark:bg-[#16061D] text-[#333333] dark:text-slate-300 ml-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono">
                    <span className={`font-bold uppercase ${item.speaker === 'interviewer' ? 'text-[#3A0F34] dark:text-[#EAAA00]' : 'text-[#7A7875] dark:text-slate-400'}`}>
                      {item.speaker === 'interviewer' ? 'AI Interviewer' : 'Candidate (You)'}
                    </span>
                    <span className="text-[#7A7875] dark:text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] font-sans text-[#7A7875] dark:text-slate-400">
              {!isLive ? (
                <span>Speak with AI interviewer directly using microphone & low-latency WebRTC.</span>
              ) : (
                <span className="text-[#10B981] font-mono">● Bidirectional voice channel active (Question #{questionNumber})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLive ? (
                <button
                  type="button"
                  onClick={handleStartVoice}
                  disabled={isConnecting}
                  id="start-voice-interview-button"
                  className="px-4 py-2 border border-[#3A0F34] dark:border-[#EAAA00] bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#250C3D] dark:hover:bg-[#D49800] text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />
                  )}
                  <span>{isConnecting ? 'Connecting Voice...' : 'Start Voice Interview'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEndVoice}
                  id="end-voice-interview-button"
                  className="px-4 py-2 border border-[#EF4444] bg-white dark:bg-[#16061D] text-[#EF4444] hover:bg-[#EF4444]/10 text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer"
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
