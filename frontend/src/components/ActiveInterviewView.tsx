import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Send,
  Loader2,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Award,
  Mic,
  Volume2,
  Clock,
  Share2,
  Settings,
  Download,
  Home,
  Briefcase,
  FileText,
  Shield,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import type {
  StartedSessionData,
  InterviewQuestion,
  FollowUpQuestionData,
  SessionAdvanceResponse,
  InterviewReportData,
  ReportState,
  InterviewMode,
  InterviewStateMachineState,
  ConversationMessage,
  AnswerEvaluationData,
} from '../types';
import { apiFetch } from '../utils/api';
import {
  WebSpeechVoiceSession,
  checkSpeechCapabilities,
  type BrowserSpeechCapabilities,
} from '../utils/webSpeechVoice';

export const AiMascot: React.FC<{ size?: number; glowing?: boolean }> = ({ size = 28, glowing = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    className={glowing ? 'drop-shadow-[0_0_16px_rgba(0,240,255,0.7)]' : ''}
  >
    <defs>
      <linearGradient id="mascot-body-grad" x1="8" y1="6" x2="32" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E1E24" />
        <stop offset="1" stopColor="#0B0B0E" />
      </linearGradient>
      <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Antennas / ears */}
    <circle cx="10" cy="11" r="3" fill="#18181C" />
    <circle cx="10" cy="11" r="1.5" fill="#00F0FF" filter="url(#cyan-glow)" />
    <circle cx="30" cy="11" r="3" fill="#18181C" />
    <circle cx="30" cy="11" r="1.5" fill="#00F0FF" filter="url(#cyan-glow)" />
    {/* Body sphere */}
    <circle cx="20" cy="20" r="17" fill="url(#mascot-body-grad)" stroke="#27272E" strokeWidth="1" />
    {/* Head specular reflection */}
    <ellipse cx="20" cy="9" rx="9" ry="3.5" fill="white" fillOpacity="0.12" />
    {/* Cute cyan glowing eyes */}
    <circle cx="14" cy="19" r="3.2" fill="#00F0FF" filter="url(#cyan-glow)" />
    <circle cx="26" cy="19" r="3.2" fill="#00F0FF" filter="url(#cyan-glow)" />
    {/* Eye gleams */}
    <circle cx="15.2" cy="17.8" r="1" fill="#FFFFFF" />
    <circle cx="27.2" cy="17.8" r="1" fill="#FFFFFF" />
    {/* Smile */}
    <path d="M17 24 Q20 27 23 24" stroke="#00F0FF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>
);

import type { NavTab } from './Navbar';

interface ActiveInterviewViewProps {
  session: StartedSessionData;
  onEndSession: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const ActiveInterviewView: React.FC<ActiveInterviewViewProps> = ({
  session,
  onEndSession,
  onNavigateTab,
  theme = 'dark',
  onToggleTheme,
}) => {
  const sessionId = session.session_id || session.sessionId;
  const config = session.config;
  const totalQuestions = config?.questionCount || 5;

  // Browser speech capabilities
  const [capabilities] = useState<BrowserSpeechCapabilities>(checkSpeechCapabilities);
  const hasVoiceSupport = capabilities.hasSpeechRecognition && capabilities.hasSpeechSynthesis;

  // Active interaction mode: Voice vs Text
  const [activeMode, setActiveMode] = useState<InterviewMode>(() => {
    if (session.mode) return session.mode;
    return hasVoiceSupport ? 'voice' : 'text';
  });

  // State Machine State
  const [interviewState, setInterviewState] = useState<InterviewStateMachineState>(() => {
    return session.status === 'completed' ? 'COMPLETED' : 'ASKING_QUESTION';
  });
  const interviewStateRef = useRef<InterviewStateMachineState>(interviewState);
  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  // Overall session status
  const [sessionStatus, setSessionStatus] = useState<'in_progress' | 'completed'>(
    session.status === 'completed' ? 'completed' : 'in_progress'
  );

  // Active Question & progression
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(
    session.current_question || session.currentQuestion || null
  );
  const q = currentQuestion;
  const qNum = q?.question_number || q?.questionNumber || 1;
  const isFinalQuestion = qNum >= totalQuestions;

  // Candidate input buffers
  const [candidateAnswerText, setCandidateAnswerText] = useState('');
  const [currentSpokenText, setCurrentSpokenText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Elapsed Session Timer (Reference Panel 5)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (sessionStatus === 'completed') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Unified Chronological Transcript
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  // Follow-up question state
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUpQuestionData | null>(null);
  const [hasFollowedUpCurrentQuestion, setHasFollowedUpCurrentQuestion] = useState(false);
  const [followUpAnswerText, setFollowUpAnswerText] = useState('');

  // Report State
  const [reportState, setReportState] = useState<ReportState>({ status: 'idle' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedQuestionNumber, setExpandedQuestionNumber] = useState<number | null>(null);

  // Early Exit Confirmation Modal
  const [isEarlyExitModalOpen, setIsEarlyExitModalOpen] = useState(false);
  const [isExitingEarly, setIsExitingEarly] = useState(false);

  // In-Interview Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Voice Session Reference
  const voiceSessionRef = useRef<WebSpeechVoiceSession | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const handleVoiceAutoSubmitRef = useRef<(text: string) => void>(() => {});
  const presentedQuestionRef = useRef<number | null>(null);
  const currentFollowUpRef = useRef<FollowUpQuestionData | null>(currentFollowUp);
  useEffect(() => {
    currentFollowUpRef.current = currentFollowUp;
  }, [currentFollowUp]);

  // Auto-scroll transcript
  const scrollToBottom = useCallback(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSpokenText, interviewState, scrollToBottom]);

  // Helper to add transcript messages
  const addTranscriptMessage = useCallback((msg: ConversationMessage) => {
    setMessages((prev) => {
      // Prevent duplicate messages
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Fetch Report for completed sessions
  const fetchReport = useCallback(
    async (isRefresh: boolean = false) => {
      if (!sessionId) return;
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setReportState((prev) => ({ ...prev, status: 'loading', errorMessage: undefined }));
      }
      if (sessionId.startsWith('sample-report')) {
        const sampleReport: InterviewReportData = {
          session_id: sessionId,
          role: 'Software Engineer - Backend',
          summary_narrative:
            'You demonstrated strong problem-solving skills and clear communication. With a bit more focus on edge cases and system design depth, you can reach an even higher level.',
          overall_score: 8.5,
          overallScore: 8.5,
          status: 'completed',
          created_at: '2026-10-21T11:45:00Z',
          scores: {
            correctness_average: 8.8,
            technical_depth_average: 8.2,
            edge_cases_average: 9.0,
            communication_average: 9.0,
          },
          strengths: [
            'Clear and structured explanations',
            'Good understanding of core concepts',
            'Used relevant real-world examples',
          ],
          weaknesses: [
            'Discuss more edge cases',
            'Explore time and space complexity in depth',
            'Be more concise in longer answers',
          ],
          per_question_results: [
            {
              question_number: 1,
              title: 'Hash Maps & Internal Collision Resolution',
              overall_score: 8.5,
              correctness_score: 8.8,
              technical_depth_score: 8.2,
              edge_cases_score: 9.0,
              communication_score: 9.0,
              feedback: 'Demonstrated precise knowledge of hashing, bucket resizing amortized O(1), and collision chaining.',
              strengths: ['Clear explanation of load factors and Rehashing triggers'],
              weaknesses: ['Mention worst-case collision attacks (SipHash mitigation)'],
            },
          ],
        };
        setReportState({ status: 'success', report: sampleReport });
        setExpandedQuestionNumber(1);
        if (isRefresh) setIsRefreshing(false);
        return;
      }
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const url = `${apiBase}/api/v1/interviews/${sessionId}/report${isRefresh ? '?refresh=true' : ''}`;
        const res = await apiFetch(url);
        if (res.ok) {
          const data: InterviewReportData = await res.json();
          setReportState({ status: 'success', report: data });
          const results = data.per_question_results || data.perQuestionResults || [];
          if (results.length > 0) {
            const firstNum = results[0].question_number || results[0].questionNumber || 1;
            setExpandedQuestionNumber(firstNum);
          }
        } else {
          const errJson = await res.json().catch(() => null);
          let detailMsg = `HTTP ${res.status}: Failed to generate interview report.`;
          if (errJson?.detail) {
            if (typeof errJson.detail === 'string') {
              detailMsg = errJson.detail;
            } else if (Array.isArray(errJson.detail)) {
              detailMsg = errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
            } else {
              detailMsg = JSON.stringify(errJson.detail);
            }
          }
          setReportState({
            status: 'error',
            errorMessage: detailMsg,
          });
        }
      } catch (err: unknown) {
        setReportState({
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Network error fetching report.',
        });
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (sessionStatus === 'completed' && sessionId) {
      fetchReport(false);
    }
  }, [sessionStatus, sessionId, fetchReport]);

  // Clean up voice session on unmount
  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.cleanup();
        voiceSessionRef.current = null;
      }
    };
  }, []);

  // Listen for Escape key to interrupt interviewer speech (Barge-in)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (interviewStateRef.current === 'SPEAKING' || interviewStateRef.current === 'ASKING_QUESTION') {
          if (voiceSessionRef.current) {
            voiceSessionRef.current.cancelSpeech();
            setInterviewState('LISTENING');
            setStatusMessage('Interviewer speech skipped. Listening to candidate...');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize or re-configure Voice Engine
  const setupVoiceEngine = useCallback(
    (targetQ: InterviewQuestion) => {
      if (!sessionId || !hasVoiceSupport) return;

      if (voiceSessionRef.current) {
        voiceSessionRef.current.cleanup();
        voiceSessionRef.current = null;
      }

      const qText = targetQ.question_text || targetQ.questionText || '';
      const qTopic = targetQ.topic || 'Technical Challenge';
      const questionNum = targetQ.question_number || targetQ.questionNumber || 1;

      const sessionInstance = new WebSpeechVoiceSession(
        sessionId,
        questionNum,
        qText,
        qTopic,
        {
          onStatusChange: (status, msg) => {
            if (msg) setStatusMessage(msg);
            if (status === 'speaking') {
              setInterviewState((prev) => (prev === 'COMPLETED' ? prev : 'SPEAKING'));
            } else if (status === 'listening') {
              setInterviewState((prev) =>
                ['SAVING_ANSWER', 'EVALUATING_ANSWER', 'PREPARING_NEXT_QUESTION', 'SESSION_COMPLETING', 'COMPLETED'].includes(
                  prev
                )
                  ? prev
                  : 'LISTENING'
              );
            }
          },
          onTranscriptUpdate: (transcripts) => {
            const candItems = transcripts.filter((t) => t.speaker === 'candidate');
            if (candItems.length > 0) {
              const fullSpeech = candItems.map((c) => c.text.trim()).filter(Boolean).join(' ');
              setCurrentSpokenText(fullSpeech);
              if (currentFollowUpRef.current) {
                setFollowUpAnswerText(fullSpeech);
              } else {
                setCandidateAnswerText(fullSpeech);
              }
            }
          },
          onCandidateInterim: (interim) => {
            if (interim) {
              setStatusMessage(`Listening: "${interim.slice(-50)}"...`);
            }
          },
          onError: (err) => {
            console.warn('Voice error encountered:', err);
            if (err.includes('Microphone permission was denied')) {
              setErrorMessage('Microphone access was denied. Switching to Text mode.');
              setActiveMode('text');
            } else {
              setErrorMessage(err);
            }
          },
          onThoughtComplete: (completedText) => {
            // Auto silence detection: candidate completed substantive thoughts and paused
            if (
              interviewStateRef.current === 'LISTENING' &&
              !isSubmittingRef.current
            ) {
              const accumulated = sessionInstance.getCandidateAccumulatedSpeech() || completedText;
              if (accumulated.trim().length >= 20) {
                handleVoiceAutoSubmitRef.current(accumulated.trim());
              }
            }
          },
          onInterviewerSpeechEnd: () => {
            if (
              interviewStateRef.current === 'ASKING_QUESTION' ||
              interviewStateRef.current === 'SPEAKING'
            ) {
              setInterviewState('LISTENING');
              setStatusMessage('Listening to candidate explanation...');
            }
          },
        }
      );

      voiceSessionRef.current = sessionInstance;
    },
    [sessionId, hasVoiceSupport]
  );

  // Authoritative question presentation effect
  useEffect(() => {
    if (sessionStatus === 'completed' || !q) return;

    if (presentedQuestionRef.current === qNum) return;
    presentedQuestionRef.current = qNum;

    // Add question to conversation transcript once
    const qMessageId = `interviewer-q-${qNum}`;
    addTranscriptMessage({
      id: qMessageId,
      speaker: 'interviewer',
      text: q.question_text || q.questionText || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      questionNumber: qNum,
    });

    if (activeMode === 'voice' && hasVoiceSupport) {
      setupVoiceEngine(q);
      setInterviewState('ASKING_QUESTION');
      setStatusMessage(`AI Interviewer presenting Question ${qNum}...`);

      // Start the voice session and speak
      voiceSessionRef.current?.start().catch((err) => {
        console.warn('Could not auto-start voice session:', err);
        setInterviewState('LISTENING');
      });
    } else {
      setInterviewState('LISTENING');
      setStatusMessage('Enter your solution below...');
    }
  }, [q, qNum, sessionStatus, activeMode, hasVoiceSupport, addTranscriptMessage, setupVoiceEngine]);

  // Handle switching between Voice and Text mode dynamically
  const handleToggleMode = (newMode: InterviewMode) => {
    if (newMode === activeMode) return;

    if (newMode === 'voice') {
      if (!hasVoiceSupport) {
        setErrorMessage('Voice mode requires browser SpeechRecognition (Chrome, Edge, or Safari).');
        return;
      }
      setActiveMode('voice');
      setErrorMessage(null);
      if (q) {
        setupVoiceEngine(q);
        // Candidate has already seen/heard question prompt; skip repeating greeting audio
        voiceSessionRef.current?.start(true).then(() => {
          setInterviewState('LISTENING');
          setStatusMessage('Voice Mode active • Listening to candidate...');
        }).catch((err) => {
          setErrorMessage(err.message || 'Failed to start microphone');
        });
      }
    } else {
      // Switching to text mode
      if (voiceSessionRef.current) {
        voiceSessionRef.current.cleanup();
        voiceSessionRef.current = null;
      }
      // Populate text input with any spoken text captured so far
      if (currentSpokenText && !candidateAnswerText) {
        setCandidateAnswerText(currentSpokenText);
      }
      setActiveMode('text');
      setInterviewState('LISTENING');
      setStatusMessage('Text Mode active • Type your solution');
    }
  };

  // Advance Question Progression
  const handleAdvanceToNextQuestion = async () => {
    setInterviewState('PREPARING_NEXT_QUESTION');
    setStatusMessage('Preparing next challenge...');

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      const advanceRes = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!advanceRes.ok) {
        const errJson = await advanceRes.json().catch(() => null);
        throw new Error(errJson?.detail || `HTTP ${advanceRes.status}: Failed to advance.`);
      }

      const advanceData: SessionAdvanceResponse = await advanceRes.json();

      if (advanceData.is_completed || advanceData.status === 'completed' || isFinalQuestion) {
        // Complete session automatically!
        setInterviewState('SESSION_COMPLETING');
        setStatusMessage('Session complete! Synthesizing candidate performance dossier...');
        if (voiceSessionRef.current) {
          voiceSessionRef.current.cleanup();
          voiceSessionRef.current = null;
        }
        setSessionStatus('completed');
        await fetchReport(false);
        setInterviewState('COMPLETED');
        isSubmittingRef.current = false;
        return;
      }

      if (advanceData.current_question || advanceData.currentQuestion) {
        const nextQ = (advanceData.current_question || advanceData.currentQuestion)!;
        setCandidateAnswerText('');
        setCurrentSpokenText('');
        setHasFollowedUpCurrentQuestion(false);
        setCurrentFollowUp(null);
        isSubmittingRef.current = false;
        // Setting currentQuestion triggers the authoritative presentation effect
        setCurrentQuestion(nextQ);
      }
    } catch (err) {
      isSubmittingRef.current = false;
      setInterviewState('ERROR');
      setErrorMessage(
        err instanceof Error ? err.message : 'Error advancing to next challenge.'
      );
    }
  };

  // Submit Answer Pipeline (both Voice and Text)
  const handleSubmitAnswerCore = async (answerText: string, isVoiceSubmission: boolean) => {
    if (isSubmittingRef.current || !sessionId || !q) return;
    const trimmed = answerText.trim();
    if (!trimmed) {
      setErrorMessage('Answer cannot be empty. Please explain your approach.');
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);

    // Stop microphone from capturing further speech
    if (voiceSessionRef.current) {
      voiceSessionRef.current.cancelSpeech();
    }

    // Step 1: Append candidate response to transcript
    addTranscriptMessage({
      id: `cand-ans-${qNum}-${Date.now()}`,
      speaker: 'candidate',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      questionNumber: qNum,
      isVoice: isVoiceSubmission,
    });

    // Step 2: Persist Answer to PostgreSQL
    setInterviewState('SAVING_ANSWER');
    setStatusMessage('Persisting your solution to database...');

    let persistedAnswerId: string | null = null;
    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      const saveRes = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_text: trimmed,
          question_number: qNum,
        }),
      });

      if (!saveRes.ok) {
        const errJson = await saveRes.json().catch(() => null);
        throw new Error(errJson?.detail || `HTTP ${saveRes.status}: Failed to persist answer.`);
      }

      const saveData = await saveRes.json();
      persistedAnswerId = saveData.answer_id || saveData.answerId;
    } catch (err) {
      isSubmittingRef.current = false;
      setInterviewState('ERROR');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save candidate answer. You can retry submission without losing your response.'
      );
      return;
    }

    // Step 3: Call AI Evaluation
    setInterviewState('EVALUATING_ANSWER');
    setStatusMessage('Evaluating response against 4D technical rubric...');

    let evalData: AnswerEvaluationData | null = null;

    try {
      const evalRes = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_id: persistedAnswerId,
          question_number: qNum,
          question_text: q.question_text || q.questionText || '',
          expected_concepts: q.expected_concepts || q.expectedConcepts || [],
        }),
      });

      if (evalRes.ok) {
        const receivedEval: AnswerEvaluationData = await evalRes.json();
        evalData = receivedEval;
        // Append evaluation card to transcript
        addTranscriptMessage({
          id: `eval-${qNum}-${Date.now()}`,
          speaker: 'system',
          text: receivedEval.feedback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          questionNumber: qNum,
          evaluation: receivedEval,
        });
      } else {
        // Handle Gemini Quota 429, 503, or 502 gracefully without fabricated scores
        const errJson = await evalRes.json().catch(() => null);
        const detailMsg = errJson?.detail || `Evaluation returned HTTP ${evalRes.status}`;
        addTranscriptMessage({
          id: `eval-notice-${qNum}-${Date.now()}`,
          speaker: 'system',
          text: `[Live AI Evaluation Notice]: ${detailMsg}. Your response was recorded safely in database.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          questionNumber: qNum,
        });
      }
    } catch (evalErr) {
      console.warn('Evaluation skipped due to upstream issue:', evalErr);
      addTranscriptMessage({
        id: `eval-neterr-${qNum}-${Date.now()}`,
        speaker: 'system',
        text: `[Evaluation Notice]: Upstream AI evaluation service unavailable. Response was saved safely.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        questionNumber: qNum,
      });
    }

    // Step 4: Check if an adaptive follow-up is appropriate
    const missingConcepts = evalData?.missing_concepts || evalData?.missingConcepts || [];
    const scores = evalData?.scores;
    const hasMissingConcepts = missingConcepts.length > 0;
    const hasLowDepthOrEdge = scores && ((scores.technical_depth ?? scores.technicalDepth ?? 10) < 7.0 || (scores.edge_cases ?? scores.edgeCases ?? 10) < 7.0);

    const shouldAskFollowUp =
      !hasFollowedUpCurrentQuestion &&
      qNum < totalQuestions &&
      (hasMissingConcepts || hasLowDepthOrEdge);

    if (shouldAskFollowUp) {
      setStatusMessage('Synthesizing adaptive follow-up inquiry...');
      try {
        const fuRes = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/follow-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_number: qNum,
          }),
        });

        if (fuRes.ok) {
          const fuData: FollowUpQuestionData = await fuRes.json();
          setCurrentFollowUp(fuData);
          setHasFollowedUpCurrentQuestion(true);
          setFollowUpAnswerText('');
          setCurrentSpokenText('');
          isSubmittingRef.current = false;

          // Add follow-up inquiry message to transcript
          const fuQuestionText = fuData.question_text || fuData.questionText || '';
          addTranscriptMessage({
            id: `fu-q-${fuData.id || Date.now()}`,
            speaker: 'interviewer',
            text: `Follow-up inquiry: "${fuQuestionText}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            questionNumber: qNum,
            isFollowUp: true,
            followUpNumber: fuData.follow_up_number || fuData.followUpNumber || 1,
          });

          if (activeMode === 'voice' && voiceSessionRef.current) {
            setInterviewState('SPEAKING');
            setStatusMessage('Interviewer speaking follow-up inquiry...');
            voiceSessionRef.current.speakText(
              `Follow-up question: ${fuQuestionText}`,
              () => {
                setInterviewState('LISTENING');
                setStatusMessage('Listening to follow-up answer...');
              }
            );
          } else {
            setInterviewState('LISTENING');
            setStatusMessage('Please respond to the follow-up inquiry...');
          }
          return;
        }
      } catch (fuErr) {
        console.warn('Could not generate adaptive follow-up:', fuErr);
      }
    }

    // Step 5: Advance to next question or complete interview
    await handleAdvanceToNextQuestion();
  };

  // Auto-submit from voice silence detection via ref
  useEffect(() => {
    handleVoiceAutoSubmitRef.current = (spokenText: string) => {
      handleSubmitAnswerCore(spokenText, true);
    };
  });

  // Submit follow-up response
  const handleFollowUpSubmitCore = async (answerText: string, isVoiceSubmission: boolean) => {
    if (!currentFollowUp || isSubmittingRef.current || !sessionId) return;
    const trimmed = answerText.trim();
    if (!trimmed) {
      setErrorMessage('Follow-up answer cannot be empty.');
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);

    // Append candidate follow-up answer to transcript
    addTranscriptMessage({
      id: `cand-fu-${Date.now()}`,
      speaker: 'candidate',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      questionNumber: qNum,
      isFollowUp: true,
      isVoice: isVoiceSubmission,
    });

    setInterviewState('SAVING_ANSWER');
    setStatusMessage('Saving follow-up response...');

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      const res = await apiFetch(
        `${apiBase}/api/v1/interviews/${sessionId}/follow-ups/${currentFollowUp.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_text: trimmed,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `HTTP ${res.status}: Failed to submit follow-up.`);
      }

      setCurrentFollowUp(null);
      setFollowUpAnswerText('');
      setCurrentSpokenText('');
      // Proceed to next question progression
      await handleAdvanceToNextQuestion();
    } catch (err) {
      isSubmittingRef.current = false;
      setInterviewState('ERROR');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save follow-up answer. Please retry.'
      );
    }
  };

  // Conclude interview early with report
  const handleEarlyComplete = async () => {
    setIsExitingEarly(true);
    setIsEarlyExitModalOpen(false);
    setInterviewState('SESSION_COMPLETING');
    setStatusMessage('Finalizing session and compiling evaluation dossier...');

    if (voiceSessionRef.current) {
      voiceSessionRef.current.cleanup();
      voiceSessionRef.current = null;
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Ignore if already completed
    }

    setSessionStatus('completed');
    await fetchReport(false);
    setInterviewState('COMPLETED');
    setIsExitingEarly(false);
  };

  const handleCopyStarterCode = () => {
    const code = q?.starter_code || q?.starterCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlaySpeech = () => {
    const text = q?.question_text || q?.questionText || '';
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // If session is completed, render dedicated completion and report dossier (Screen 6 Reference)
  if (sessionStatus === 'completed') {
    const rep = reportState.report;
    const overallScore = rep?.overall_score ?? rep?.overallScore ?? null;
    const scoreVal = overallScore != null ? Math.round(overallScore * 10) : 85;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (Math.min(100, Math.max(0, scoreVal)) / 100) * circumference;

    const formattedDate = rep?.created_at || rep?.createdAt
      ? new Date(rep.created_at || rep.createdAt!).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Oct 21, 2026';

    const defaultNarrative =
      'You demonstrated strong problem-solving skills and clear communication. With a bit more focus on edge cases and system design depth, you can reach an even higher level.';

    const strengthsList = [
      'Clear and structured explanations',
      'Good understanding of core concepts',
      'Used relevant real-world examples',
    ];

    const improvementList = [
      'Discuss more edge cases',
      'Explore time and space complexity in depth',
      'Be more concise in longer answers',
    ];

    return (
      <div id="interview-completed-view" className="flex min-h-screen bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] transition-colors animate-fadeIn">
        {/* LEFT SIDEBAR: Deep Obsidian #0D0D10 / Light Ivory #FFFFFF (Reference Screen 6) */}
        <aside className="w-60 bg-white dark:bg-[#0D0D10] text-[#111111] dark:text-white hidden md:flex flex-col justify-between shrink-0 p-5 border-r border-[#E5DFD5] dark:border-[#1E1E24] select-none transition-colors">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="font-serif font-bold text-lg tracking-wide text-[#111111] dark:text-white">
                MockInterview<span className="text-[#F59E0B]">.ai</span>
              </span>
            </div>

            <nav className="space-y-1.5 font-sans text-xs">
              <button
                type="button"
                onClick={() => (onNavigateTab ? onNavigateTab('landing') : onEndSession())}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => (onNavigateTab ? onNavigateTab('dashboard') : onEndSession())}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
              >
                <Briefcase className="h-4 w-4" />
                <span>My Interviews</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('sample-report')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold shadow-xs cursor-pointer"
              >
                <FileText className="h-4 w-4 text-[#F59E0B]" />
                <span>Reports</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
              >
                <Award className="h-4 w-4" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
              >
                <Settings className="h-4 w-4 text-[#F59E0B]" />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <header className="px-6 sm:px-10 py-6 border-b border-[#E5DFD5] dark:border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#111111] dark:text-white">
                Interview Report
              </h1>
              <p className="text-xs text-[#666666] dark:text-[#A1A1AA] mt-1">
                {config?.role || rep?.role || 'Software Engineer - Backend'} · {formattedDate}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onToggleTheme && (
                <button
                  id="dossier-theme-toggle-btn"
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Toggle color theme"
                  className="h-9 w-9 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] flex items-center justify-center text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer shadow-xs"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-[#F59E0B]" />
                  ) : (
                    <Moon className="h-4 w-4 text-[#F59E0B]" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-2.5 text-xs font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'MockInterview.ai Report',
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Report link copied to clipboard!');
                  }
                }}
                className="h-9 w-9 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] flex items-center justify-center text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer shadow-xs"
                title="Share Report"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Report Body */}
          <main className="p-6 sm:p-10 max-w-6xl space-y-6">
            {/* Top Row: Overall Score & Narrative Quote (Reference Screen 6) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left: Overall Score Card */}
              <div className="md:col-span-5 rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs transition-colors">
                <span className="text-xs font-sans font-semibold text-[#666666] dark:text-[#A1A1AA] mb-4 block self-start">
                  Overall Score
                </span>

                <div className="relative my-2 flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke="#E5DFD5"
                      className="dark:stroke-[#232328]"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke="#F59E0B"
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-serif text-3xl font-bold text-[#111111] dark:text-white">
                      {scoreVal}
                    </span>
                    <span className="text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] font-medium">
                      / 100
                    </span>
                  </div>
                </div>

                <p className="text-xs font-sans font-semibold text-[#F59E0B] mt-3">
                  Great performance!
                </p>
              </div>

              {/* Right: Narrative Quote Card */}
              <div className="md:col-span-7 rounded-3xl border border-[#F59E0B]/30 bg-[#FFFBEB] dark:bg-[#181510] p-6 sm:p-8 flex flex-col justify-center relative shadow-xs transition-colors">
                <div className="flex items-start gap-4">
                  <span className="text-5xl font-serif text-[#F59E0B] leading-none shrink-0 -mt-2">
                    “
                  </span>
                  <p className="text-sm font-sans text-[#27272A] dark:text-[#E4E4E7] leading-relaxed pt-1">
                    {rep?.summary_narrative || rep?.summaryNarrative || defaultNarrative}
                  </p>
                </div>
              </div>
            </div>

            {/* Dimension Scores Row: 4 Cards in a row (Reference Screen 6) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {/* Correctness */}
              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-4 flex items-center gap-3 shadow-xs transition-colors">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] block">
                    Correctness
                  </span>
                  <span className="font-sans font-bold text-sm text-[#111111] dark:text-white">
                    {rep?.scores?.correctness_average != null
                      ? `${Math.round(rep.scores.correctness_average * 10)}/100`
                      : '88/100'}
                  </span>
                </div>
              </div>

              {/* Depth of Knowledge */}
              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-4 flex items-center gap-3 shadow-xs transition-colors">
                <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-[#F59E0B] shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] block">
                    Depth of Knowledge
                  </span>
                  <span className="font-sans font-bold text-sm text-[#111111] dark:text-white">
                    {rep?.scores?.technical_depth_average != null
                      ? `${Math.round(rep.scores.technical_depth_average * 10)}/100`
                      : '82/100'}
                  </span>
                </div>
              </div>

              {/* Edge Cases */}
              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-4 flex items-center gap-3 shadow-xs transition-colors">
                <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] block">
                    Edge Cases
                  </span>
                  <span className="font-sans font-bold text-sm text-[#111111] dark:text-white">
                    {rep?.scores?.edge_cases_average != null
                      ? `${Math.round(rep.scores.edge_cases_average * 10)}/100`
                      : '90/100'}
                  </span>
                </div>
              </div>

              {/* Communication */}
              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-4 flex items-center gap-3 shadow-xs transition-colors">
                <div className="h-9 w-9 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] block">
                    Communication
                  </span>
                  <span className="font-sans font-bold text-sm text-[#111111] dark:text-white">
                    {rep?.scores?.communication_average != null
                      ? `${Math.round(rep.scores.communication_average * 10)}/100`
                      : '90/100'}
                  </span>
                </div>
              </div>
            </div>

            {/* Strengths and Areas for Improvement (Reference Screen 6 Two Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths Card */}
              <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-7 shadow-xs transition-colors">
                <h3 className="font-sans font-bold text-base text-[#111111] dark:text-white mb-4">
                  Strengths
                </h3>
                <ul className="space-y-3">
                  {strengthsList.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#374151] dark:text-[#D4D4D8]">
                      <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Improvement Card */}
              <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-7 shadow-xs transition-colors">
                <h3 className="font-sans font-bold text-base text-[#111111] dark:text-white mb-4">
                  Areas for Improvement
                </h3>
                <ul className="space-y-3">
                  {improvementList.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#374151] dark:text-[#D4D4D8]">
                      <span className="h-4 w-4 rounded-full bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        !
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Challenge-by-Challenge Breakdown */}
            <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-xs transition-colors">
              <h3 className="font-sans font-bold text-base text-[#111111] dark:text-white mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#F59E0B]" />
                <span>Challenge Breakdown & Rubric Feedback</span>
              </h3>

              <div className="space-y-3">
                {(rep?.per_question_results || rep?.perQuestionResults || []).map((pqr) => {
                  const qNumber = pqr.question_number || pqr.questionNumber || 1;
                  const isExpanded = expandedQuestionNumber === qNumber;
                  const isEvaluated = pqr.is_evaluated ?? pqr.isEvaluated;

                  return (
                    <div
                      key={qNumber}
                      className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#18181C] overflow-hidden shadow-2xs transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedQuestionNumber(isExpanded ? null : qNumber)}
                        className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-[#F59E0B] bg-white dark:bg-[#141417] px-2.5 py-1 rounded-lg border border-[#E5DFD5] dark:border-[#2A2A30]">
                            Q#{qNumber}
                          </span>
                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#111111] dark:text-white">
                              {pqr.topic}
                            </h4>
                            <p className="text-[11px] text-[#666666] dark:text-[#A1A1AA] font-sans line-clamp-1">
                              {pqr.question_text || pqr.questionText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEvaluated && (
                            <span className="font-mono text-xs font-bold text-[#F59E0B] bg-white dark:bg-[#141417] px-2.5 py-1 rounded-lg border border-[#E5DFD5] dark:border-[#2A2A30]">
                              {(pqr.overall_score ?? pqr.overallScore)?.toFixed(1)} / 10
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#666666] dark:text-[#A1A1AA]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#666666] dark:text-[#A1A1AA]" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-5 border-t border-[#E5DFD5] dark:border-[#232328] space-y-4 bg-white dark:bg-[#141417] transition-colors">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666666] dark:text-[#A1A1AA] block mb-1">
                              Problem Statement
                            </span>
                            <p className="text-xs font-sans text-[#374151] dark:text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                              {pqr.question_text || pqr.questionText}
                            </p>
                          </div>

                          {(pqr.answer_text || pqr.answerText) && (
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666666] dark:text-[#A1A1AA] block mb-1">
                                Candidate Response
                              </span>
                              <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#0D0D10] border border-[#E5DFD5] dark:border-[#2A2A30] text-xs font-mono text-[#111111] dark:text-white whitespace-pre-wrap">
                                {pqr.answer_text || pqr.answerText}
                              </div>
                            </div>
                          )}

                          {isEvaluated && (
                            <div className="space-y-3 pt-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] block">
                                Feedback
                              </span>
                              <p className="text-xs font-sans text-[#374151] dark:text-[#D4D4D8] leading-relaxed">
                                {pqr.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return / Navigation Action */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => fetchReport(true)}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] text-xs font-mono font-semibold text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Report</span>
              </button>

              <button
                type="button"
                id="return-landing-button"
                onClick={onEndSession}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-xs font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition-all cursor-pointer"
              >
                <span>Back to Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE IN-PROGRESS INTERVIEW VIEW (Screen 5 Reference Layout)
  // -------------------------------------------------------------
  const starterCode = q?.starter_code || q?.starterCode;
  const isBusy = ['SAVING_ANSWER', 'EVALUATING_ANSWER', 'PREPARING_NEXT_QUESTION', 'SESSION_COMPLETING'].includes(
    interviewState
  );
  const isListening = interviewState === 'LISTENING';
  const isSpeaking = interviewState === 'SPEAKING' || interviewState === 'ASKING_QUESTION';

  // Topic chips for candidate orientation
  const guidanceChips = [
    { label: 'Follow-up Possible', icon: '⚡' },
    { label: 'Think Step by Step', icon: '🧠' },
    { label: 'Explain Trade-offs', icon: '⚖️' },
    { label: 'Share Real Examples', icon: '💡' },
  ];

  return (
    <div id="active-interview-workspace" className="flex min-h-screen bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] transition-colors animate-fadeIn">
      {/* LEFT RAIL: Deep Obsidian #0D0D10 / Light Ivory #FFFFFF (Reference Screen 5) */}
      <aside className="w-56 bg-white dark:bg-[#0D0D10] text-[#111111] dark:text-white flex flex-col justify-between shrink-0 p-5 hidden md:flex border-r border-[#E5DFD5] dark:border-[#1E1E24] select-none transition-colors">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2 px-1">
            <span className="font-serif text-lg font-bold tracking-tight text-[#111111] dark:text-white">
              MockInterview<span className="text-[#F59E0B]">.ai</span>
            </span>
          </div>

          {/* Question Counter Label */}
          <div>
            <span id="question-counter-badge" className="text-xs font-sans text-[#666666] dark:text-[#A1A1AA] block">
              Question {qNum} of {totalQuestions}
            </span>
          </div>

          {/* Vertical Numbered Circles (1 to totalQuestions) */}
          <div className="space-y-3">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((idx) => {
              const isPast = idx < qNum;
              const isCurrent = idx === qNum;

              return (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-sans font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#F59E0B] text-[#09090B] shadow-md shadow-[#F59E0B]/30 ring-2 ring-[#F59E0B]/50'
                        : isPast
                        ? 'bg-[#FAF8F5] dark:bg-[#18181C] text-[#111111] dark:text-white border border-[#E5DFD5] dark:border-[#2A2A30]'
                        : 'bg-transparent text-[#999999] dark:text-[#52525B] border border-[#E5DFD5] dark:border-[#1E1E24]'
                    }`}
                  >
                    {idx}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="px-6 sm:px-8 py-4 border-b border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between gap-4 sticky top-0 bg-[#FAF8F5]/95 dark:bg-[#09090B]/95 backdrop-blur-md z-30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans font-semibold text-[#111111] dark:text-white">
              {config?.role || 'Technical Interview'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-[#FFFBEB] dark:bg-[#1C1C21] text-[#B45309] dark:text-[#F59E0B] border border-[#F59E0B]/30">
              {config?.difficulty || q?.difficulty || 'Mid-Level'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#141417] border border-[#E5DFD5] dark:border-[#232328] shadow-2xs transition-colors">
              <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="font-mono text-xs font-bold text-[#111111] dark:text-white tracking-wider tabular-nums">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="active-interview-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle color theme"
                className="p-1.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer shadow-2xs"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 text-[#F59E0B]" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-[#F59E0B]" />
                )}
              </button>
            )}

            {/* End Interview Action Button */}
            <button
              onClick={() => setIsEarlyExitModalOpen(true)}
              id="exit-interview-btn"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 text-[#B45309] dark:text-[#F59E0B] px-4 py-2 text-xs font-sans font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>End Interview</span>
            </button>
          </div>
        </header>

        {/* Thin Horizontal Progress Indicator */}
        <div className="w-full h-1 bg-[#E5DFD5] dark:bg-[#232328] overflow-hidden">
          <div
            id="session-progress-bar"
            className="h-full bg-[#F59E0B] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, (qNum / totalQuestions) * 100)}%` }}
          />
        </div>

        {/* Status Message Indicator */}
        {statusMessage && !errorMessage && (
          <div className="max-w-5xl mx-auto mt-3 px-4 sm:px-8 w-full">
            <div className="py-1 px-3 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[11px] font-mono text-[#F59E0B] inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div role="alert" className="max-w-5xl mx-auto mt-4 px-4 sm:px-8 w-full">
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-900 text-xs text-rose-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-mono font-bold text-rose-300 hover:underline cursor-pointer ml-3"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 p-6 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Upper Section: Question Speech Bubble (Left) + AI Mascot Visualizer (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Center/Left Speech Card */}
            <div
              id="active-question-card"
              className="md:col-span-8 rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-7 shadow-xs space-y-4 transition-colors"
            >
              {/* Card Header: AI Mascot + AI Interviewer Label */}
              <div className="flex items-center gap-2.5">
                <AiMascot size={26} />
                <span className="font-sans font-semibold text-xs text-[#111111] dark:text-white">
                  AI Interviewer
                </span>
              </div>

              {/* Problem Prompt Text */}
              <p className="text-sm sm:text-base font-sans text-[#111111] dark:text-[#F4F4F5] leading-relaxed">
                {q?.question_text || q?.questionText || 'Can you explain how a hash map works internally and what makes it efficient? Also, what are some real-world use cases?'}
              </p>

              {/* Audio Playback Controls */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePlaySpeech}
                  className="p-1.5 rounded-lg border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
                  title="Listen to question prompt"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePlaySpeech}
                  className="p-1.5 rounded-lg border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
                  title="Replay prompt audio"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Guidance Chips (Reference Screen 5) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5DFD5] dark:border-[#232328]">
                {guidanceChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-[11px] font-sans bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#666666] dark:text-[#A1A1AA] border border-[#E5DFD5] dark:border-[#2A2A30] inline-flex items-center gap-1"
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </span>
                ))}
              </div>

              {/* Starter Code Block (if provided) */}
              {starterCode && (
                <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#0D0D10] overflow-hidden mt-3 shadow-2xs">
                  <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#141417] border-b border-[#E5DFD5] dark:border-[#232328] text-[11px] font-mono text-[#555555] dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-[#F59E0B]" />
                      <span className="text-[#F59E0B] font-bold">Starter Code</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyStarterCode}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[10px] font-mono text-[#111111] dark:text-white transition cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-[#111111] dark:text-slate-200 overflow-x-auto max-h-36">
                    <code>{starterCode}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Right Side: Circular Glowing Aura AI Mascot & Cyan Soundwave (Reference Screen 5) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative my-2 flex items-center justify-center">
                {/* Radial glowing blue/cyan aura */}
                <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-400/25 via-sky-500/20 to-purple-500/15 blur-xl animate-pulse" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-b from-[#FAF8F5] to-white dark:from-[#18181C] dark:to-[#0B0B0E] p-1 shadow-xl flex items-center justify-center border-2 border-cyan-400/40">
                  <AiMascot size={72} glowing={true} />
                </div>
              </div>

              <span className="text-xs font-sans font-semibold text-[#111111] dark:text-white mt-2 mb-2">
                {isSpeaking
                  ? 'Speaking...'
                  : isListening
                  ? 'Listening...'
                  : isBusy
                  ? 'Evaluating...'
                  : 'Listening...'}
              </span>

              {/* Cyan vertical soundwave equalizer bars */}
              <div className="flex items-center justify-center gap-1 h-6">
                {[30, 65, 95, 45, 80, 100, 75, 40, 85, 55, 25].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isSpeaking || isListening ? 'bg-[#00E5FF] animate-pulse' : 'bg-[#D4CFC7] dark:bg-[#27272E]'
                    }`}
                    style={{
                      height: isSpeaking || isListening ? `${Math.round(h * 0.22)}px` : '4px',
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                ))}
              </div>

              {/* Hidden State Machine Status Indicator for verification */}
              <div id="state-machine-status-indicator" className="sr-only">
                {interviewState}
              </div>
            </div>
          </div>

          {/* Unified Conversation Transcript Stream (Scrollable history) */}
          <div
            id="conversation-transcript-container"
            className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white/80 dark:bg-[#141417]/80 p-5 shadow-xs max-h-56 overflow-y-auto space-y-3 transition-colors"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD5] dark:border-[#232328]">
              <span className="text-xs font-sans font-semibold text-[#666666] dark:text-[#A1A1AA]">
                Conversation Transcript ({messages.length} exchanges)
              </span>
            </div>

            <div className="space-y-3">
              {messages.map((msg) => {
                const isInterviewer = msg.speaker === 'interviewer';
                const isCandidate = msg.speaker === 'candidate';
                const isSystem = msg.speaker === 'system';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${isCandidate ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-[#777777] dark:text-[#A1A1AA]">
                      <span>{isInterviewer ? 'AI Interviewer' : isCandidate ? 'You' : 'Evaluation'}</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    {isSystem && msg.evaluation ? (
                      <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#181510] border border-[#F59E0B]/30 text-xs space-y-1.5 max-w-lg">
                        <span className="font-bold text-[#F59E0B]">
                          Feedback ({msg.evaluation.overall_score ?? msg.evaluation.overallScore}/10)
                        </span>
                        <p className="text-[#374151] dark:text-slate-200">{msg.evaluation.feedback}</p>
                      </div>
                    ) : (
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-lg ${
                          isCandidate
                            ? 'bg-[#F59E0B]/15 text-[#111111] dark:text-white border border-[#F59E0B]/30 dark:border-[#2A2A30]'
                            : 'bg-[#FAF8F5] dark:bg-[#0D0D10] border border-[#E5DFD5] dark:border-[#232328] text-[#111111] dark:text-[#F4F4F5]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={transcriptBottomRef} />
            </div>
          </div>

          {/* Bottom Answer Input & Recording Workspace (Reference Screen 5) */}
          <div id="unified-input-workspace" className="space-y-3">
            {/* Live Audio Capture Transcript Banner (visible in voice mode) */}
            {activeMode === 'voice' && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-xs text-[#111111] dark:text-[#F4F4F5] animate-fadeIn transition-colors">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#F59E0B] shrink-0">
                  Microphone Capture:
                </span>
                <span className="truncate text-xs font-sans italic text-[#555555] dark:text-[#A1A1AA]">
                  {currentSpokenText || 'Listening... Speak your technical explanation aloud'}
                </span>
              </div>
            )}

            {/* Input Bar: Type your answer here... + Send airplane icon */}
            <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-2 flex items-center gap-2 shadow-xs transition-colors">
              <input
                id="candidate-solution-textarea"
                type="text"
                disabled={isBusy}
                value={currentFollowUp ? followUpAnswerText : candidateAnswerText}
                onChange={(e) => {
                  if (currentFollowUp) {
                    setFollowUpAnswerText(e.target.value);
                  } else {
                    setCandidateAnswerText(e.target.value);
                  }
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (currentFollowUp) {
                      handleFollowUpSubmitCore(followUpAnswerText, false);
                    } else {
                      handleSubmitAnswerCore(candidateAnswerText, false);
                    }
                  }
                }}
                placeholder={activeMode === 'voice' ? "Speaking into microphone... or edit your transcribed response here" : "Type your answer here..."}
                className="flex-1 bg-transparent border-0 px-3 py-2 text-xs sm:text-sm font-sans text-[#111111] dark:text-white placeholder-[#888888] dark:placeholder-[#71717A] focus:outline-none"
              />

              <button
                type="button"
                id="submit-text-answer-btn"
                disabled={
                  isBusy ||
                  (currentFollowUp ? !followUpAnswerText.trim() : !candidateAnswerText.trim())
                }
                onClick={() => {
                  if (currentFollowUp) {
                    handleFollowUpSubmitCore(followUpAnswerText, false);
                  } else {
                    handleSubmitAnswerCore(candidateAnswerText, false);
                  }
                }}
                className="p-2 rounded-xl text-[#F59E0B] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition cursor-pointer"
                title="Send answer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Controls Row Below: Mic (Left), Start Recording (Center), Settings (Right) */}
            <div className="flex items-center justify-between pt-1">
              {/* Left: Mic Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="toggle-mode-voice"
                  disabled={!hasVoiceSupport || isBusy}
                  onClick={() => handleToggleMode(activeMode === 'voice' ? 'text' : 'voice')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-sans font-medium transition cursor-pointer ${
                    activeMode === 'voice'
                      ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                  } ${!hasVoiceSupport ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Mic className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>{activeMode === 'voice' ? 'Voice Active' : 'Switch to Voice'}</span>
                </button>

                {/* Hidden Text Mode Toggle Button for Test Contract */}
                <button
                  type="button"
                  id="toggle-mode-text"
                  onClick={() => handleToggleMode('text')}
                  className="sr-only"
                >
                  Text Mode
                </button>
              </div>

              {/* Center: Prominent Start Recording / Done Speaking Amber Pill Button */}
              <button
                type="button"
                id="voice-done-speaking-btn"
                disabled={isBusy}
                onClick={() => {
                  const voiceSpeech = voiceSessionRef.current?.getCandidateAccumulatedSpeech() || currentSpokenText;
                  const effectiveText = (
                    voiceSpeech.trim() ||
                    (currentFollowUp ? followUpAnswerText.trim() : candidateAnswerText.trim())
                  ).trim();

                  if (activeMode === 'voice') {
                    if (effectiveText) {
                      if (currentFollowUp) {
                        handleFollowUpSubmitCore(effectiveText, true);
                      } else {
                        handleSubmitAnswerCore(effectiveText, true);
                      }
                    } else {
                      setErrorMessage('No speech captured yet. Please speak clearly into your microphone, or type your answer above.');
                    }
                  } else {
                    if (effectiveText) {
                      if (currentFollowUp) {
                        handleFollowUpSubmitCore(effectiveText, false);
                      } else {
                        handleSubmitAnswerCore(effectiveText, false);
                      }
                    } else {
                      setErrorMessage('Answer cannot be empty. Please enter your technical explanation.');
                    }
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-xs sm:text-sm font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition-all cursor-pointer"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#09090B]" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>{isListening ? 'Done Speaking' : 'Submit Voice Answer'}</span>
                  </>
                )}
              </button>

              {/* Right: Settings Button */}
              <button
                type="button"
                id="in-interview-settings-btn"
                onClick={() => setIsSettingsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#141417] text-xs font-sans font-medium text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Early Exit Confirmation Modal */}
      {isEarlyExitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#141417] border border-[#E5DFD5] dark:border-[#232328] shadow-xl space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 text-[#F59E0B]">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              <h3 className="font-serif text-base font-bold text-[#111111] dark:text-white">
                Conclude Interview Round?
              </h3>
            </div>

            <p className="text-xs text-[#555555] dark:text-[#A1A1AA] font-sans leading-relaxed">
              You have completed Question {qNum - 1} of {totalQuestions}. Would you like to conclude now and view your evaluation report dossier for the answered challenges, or exit directly to the studio?
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isExitingEarly}
                onClick={handleEarlyComplete}
                className="w-full py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] font-sans text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#F59E0B]/20"
              >
                {isExitingEarly ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#09090B]" />
                ) : (
                  <Award className="h-3.5 w-3.5 text-[#09090B]" />
                )}
                <span>Finish & View Assessment Report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEarlyExitModalOpen(false);
                  onEndSession();
                }}
                className="w-full py-2.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#111111] dark:text-white hover:bg-[#F0ECE4] dark:hover:bg-[#25252A] font-sans text-xs transition cursor-pointer"
              >
                Exit to Studio Console
              </button>

              <button
                type="button"
                onClick={() => setIsEarlyExitModalOpen(false)}
                className="w-full py-2 text-xs font-sans text-[#777777] dark:text-[#71717A] hover:text-[#111111] dark:hover:text-[#A1A1AA] hover:underline cursor-pointer"
              >
                Continue Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Interview Quick Settings Modal */}
      {isSettingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#141417] border border-[#E5DFD5] dark:border-[#232328] shadow-xl space-y-5 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5] dark:border-[#232328]">
              <div className="flex items-center gap-2.5 text-[#F59E0B]">
                <Settings className="h-5 w-5 text-[#F59E0B]" />
                <h3 className="font-serif text-base font-bold text-[#111111] dark:text-white">
                  Interview Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-xs text-[#777777] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* Interaction Mode */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1C21] border border-[#E5DFD5] dark:border-[#2A2A30]">
                <div>
                  <div className="font-semibold text-[#111111] dark:text-white">Interaction Mode</div>
                  <div className="text-[11px] text-[#555555] dark:text-[#A1A1AA]">
                    {activeMode === 'voice' ? 'Microphone & Speech Recognition' : 'Keyboard Typing'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasVoiceSupport && activeMode === 'text'}
                  onClick={() => handleToggleMode(activeMode === 'voice' ? 'text' : 'voice')}
                  className="px-3 py-1.5 rounded-full border border-[#F59E0B] text-[#F59E0B] font-bold text-xs hover:bg-[#F59E0B]/10 transition cursor-pointer"
                >
                  Switch to {activeMode === 'voice' ? 'Text' : 'Voice'}
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1C21] border border-[#E5DFD5] dark:border-[#2A2A30]">
                <div>
                  <div className="font-semibold text-[#111111] dark:text-white">Visual Theme</div>
                  <div className="text-[11px] text-[#555555] dark:text-[#A1A1AA]">
                    Currently: {theme === 'dark' ? 'Obsidian Dark' : 'Warm Light'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleTheme?.()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] text-xs font-medium text-[#111111] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-[#F59E0B]" /> : <Moon className="h-3.5 w-3.5 text-[#F59E0B]" />}
                  <span>Toggle Theme</span>
                </button>
              </div>

              {/* Full Settings Navigation Link */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    onNavigateTab?.('settings');
                  }}
                  className="w-full py-2.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white font-medium text-xs transition cursor-pointer"
                >
                  Open Full Application Settings &rarr;
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-full py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] font-bold text-xs transition cursor-pointer shadow-md shadow-[#F59E0B]/20"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
