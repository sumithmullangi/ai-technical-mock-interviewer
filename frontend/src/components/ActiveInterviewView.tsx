import React, { useState, useEffect } from 'react';
import {
  Code2,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Terminal,
  Layers,
  Send,
  Loader2,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Bot,
  BarChart3,
  Lightbulb,
  CornerDownRight,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Trophy,
  Flag,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  FileText,
} from 'lucide-react';
import type {
  StartedSessionData,
  InterviewQuestion,
  AnswerSubmissionState,
  EvaluationState,
  FollowUpQuestionData,
  FollowUpState,
  SessionAdvanceResponse,
  ProgressionState,
  InterviewReportData,
  ReportState,
} from '../types';

interface ActiveInterviewViewProps {
  session: StartedSessionData;
  onEndSession: () => void;
}

export const ActiveInterviewView: React.FC<ActiveInterviewViewProps> = ({
  session,
  onEndSession,
}) => {
  const [copied, setCopied] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion>(
    session.current_question || session.currentQuestion
  );
  const [sessionStatus, setSessionStatus] = useState<'in_progress' | 'completed'>(
    session.status === 'completed' ? 'completed' : 'in_progress'
  );
  const [submissionState, setSubmissionState] = useState<AnswerSubmissionState>({
    status: 'idle',
  });
  const [evaluationState, setEvaluationState] = useState<EvaluationState>({
    status: 'idle',
  });
  const [followUpState, setFollowUpState] = useState<FollowUpState>({
    status: 'idle',
    followUps: [],
  });
  const [progressionState, setProgressionState] = useState<ProgressionState>({
    status: 'idle',
  });
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});
  const [submittingFollowUpId, setSubmittingFollowUpId] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const [reportState, setReportState] = useState<ReportState>({
    status: 'idle',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedQuestionNumber, setExpandedQuestionNumber] = useState<number | null>(null);

  const q = currentQuestion;
  const config = session.config;
  const sessionId = session.session_id || session.sessionId;
  const qNum = q?.question_number || q?.questionNumber || 1;
  const totalQuestions = config?.questionCount || 5;
  const isFinalQuestion = qNum >= totalQuestions;

  const fetchReport = async (isRefresh: boolean = false) => {
    if (!sessionId) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setReportState((prev) => ({ ...prev, status: 'loading', errorMessage: undefined }));
    }
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const url = `${apiBase}/api/v1/interviews/${sessionId}/report${isRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
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
  };

  useEffect(() => {
    if (sessionStatus === 'completed' && sessionId) {
      fetchReport(false);
    }
  }, [sessionStatus, sessionId]);


  // On mount or question change, retrieve existing follow-up questions for this primary question
  useEffect(() => {
    let isMounted = true;
    const fetchFollowUps = async () => {
      if (!sessionId) return;
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const res = await fetch(`${apiBase}/api/v1/interviews/${sessionId}/questions/${qNum}/follow-ups`);
        if (res.ok) {
          const data: FollowUpQuestionData[] = await res.json();
          if (isMounted) {
            setFollowUpState((prev) => ({
              ...prev,
              followUps: data,
            }));
          }
        }
      } catch {
        // Non-blocking fetch on mount
      }
    };
    fetchFollowUps();
    return () => {
      isMounted = false;
    };
  }, [sessionId, qNum]);

  const handleCopyCode = async () => {
    if (q?.starter_code || q?.starterCode) {
      await navigator.clipboard.writeText(q.starter_code || q.starterCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = answerText.trim();
    if (!trimmed) {
      setSubmissionState({
        status: 'error',
        errorMessage: 'Answer cannot be empty or whitespace only.',
      });
      return;
    }

    if (!sessionId) {
      setSubmissionState({
        status: 'error',
        errorMessage: 'Session ID is missing. Please restart the interview.',
      });
      return;
    }

    setSubmissionState({ status: 'submitting' });
    setEvaluationState({ status: 'idle' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/answer`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_number: qNum,
          answer_text: trimmed,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionState({
          status: 'submitted',
          response: {
            status: data.status || 'submitted',
            answer_id: data.answer_id || data.answerId,
            answerId: data.answer_id || data.answerId,
            session_id: data.session_id || data.sessionId,
            sessionId: data.session_id || data.sessionId,
            question_number: data.question_number || data.questionNumber || 1,
            questionNumber: data.question_number || data.questionNumber || 1,
            message: data.message || 'Answer recorded and persisted successfully.',
            submitted_at: data.submitted_at || data.submittedAt || new Date().toISOString(),
            submittedAt: data.submitted_at || data.submittedAt || new Date().toISOString(),
          },
        });
      } else {
        const errorData = await response.json().catch(() => null);
        let detailMsg = `HTTP error ${response.status}: Failed to submit answer.`;
        if (errorData?.detail) {
          if (typeof errorData.detail === 'string') {
            detailMsg = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            detailMsg = errorData.detail
              .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
              .join(', ');
          } else {
            detailMsg = JSON.stringify(errorData.detail);
          }
        }
        setSubmissionState({
          status: 'error',
          errorMessage: detailMsg,
        });
      }
    } catch (err: unknown) {
      setSubmissionState({
        status: 'error',
        errorMessage:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
            : err instanceof Error
            ? err.message
            : 'Connection to backend failed.',
      });
    }
  };

  const handleRequestEvaluation = async () => {
    const answerId = submissionState.response?.answer_id || submissionState.response?.answerId;
    if (!sessionId || !answerId) {
      setEvaluationState({
        status: 'error',
        errorMessage: 'Missing session ID or persisted answer ID for evaluation.',
      });
      return;
    }

    setEvaluationState({ status: 'evaluating' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/answers/${answerId}/evaluate`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: q?.question_text || q?.questionText || '',
          topic: q?.topic || '',
          expected_concepts: expectedConcepts,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEvaluationState({
          status: 'evaluated',
          evaluation: data,
        });
      } else {
        const errorData = await response.json().catch(() => null);
        let detailMsg = `HTTP error ${response.status}: Failed to evaluate answer.`;
        if (errorData?.detail) {
          if (typeof errorData.detail === 'string') {
            detailMsg = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            detailMsg = errorData.detail
              .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
              .join(', ');
          } else {
            detailMsg = JSON.stringify(errorData.detail);
          }
        }
        setEvaluationState({
          status: 'error',
          errorMessage: detailMsg,
        });
      }
    } catch (err: unknown) {
      setEvaluationState({
        status: 'error',
        errorMessage:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
            : err instanceof Error
            ? err.message
            : 'Connection to backend failed.',
      });
    }
  };

  const handleRequestFollowUp = async () => {
    if (!sessionId) {
      setFollowUpError('Session ID is missing. Please restart the interview.');
      return;
    }

    setFollowUpError(null);
    setFollowUpState((prev) => ({ ...prev, status: 'generating' }));

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/questions/${qNum}/follow-up`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_question_number: qNum,
          question_text: q?.question_text || q?.questionText || '',
          candidate_answer: answerText.trim() || undefined,
          evaluation_feedback: evalData?.feedback || undefined,
          missing_concepts: evalData?.missing_concepts || evalData?.missingConcepts || undefined,
        }),
      });

      if (response.ok) {
        const data: FollowUpQuestionData = await response.json();
        setFollowUpState((prev) => {
          const exists = prev.followUps.some((f) => f.id === data.id);
          const nextList = exists
            ? prev.followUps.map((f) => (f.id === data.id ? data : f))
            : [...prev.followUps, data];
          return {
            status: 'idle',
            followUps: nextList.sort(
              (a, b) =>
                (a.follow_up_number || a.followUpNumber || 0) - (b.follow_up_number || b.followUpNumber || 0)
            ),
          };
        });
      } else {
        const errJson = await response.json().catch(() => null);
        let detailMsg = `HTTP error ${response.status}: Failed to generate follow-up question.`;
        if (errJson?.detail) {
          if (typeof errJson.detail === 'string') {
            detailMsg = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            detailMsg = errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
          } else {
            detailMsg = JSON.stringify(errJson.detail);
          }
        }
        setFollowUpError(detailMsg);
        setFollowUpState((prev) => ({ ...prev, status: 'error', errorMessage: detailMsg }));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
          : err instanceof Error
          ? err.message
          : 'Failed to request follow-up question.';
      setFollowUpError(msg);
      setFollowUpState((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
    }
  };

  const handleSubmitFollowUpAnswer = async (followUpId: string) => {
    const rawAnswer = followUpInputs[followUpId] || '';
    const trimmed = rawAnswer.trim();
    if (!trimmed) {
      setFollowUpError('Follow-up answer cannot be empty or whitespace only.');
      return;
    }
    if (!sessionId) {
      setFollowUpError('Session ID is missing.');
      return;
    }

    setFollowUpError(null);
    setSubmittingFollowUpId(followUpId);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/follow-ups/${followUpId}/answer`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_text: trimmed,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowUpState((prev) => ({
          ...prev,
          status: 'idle',
          followUps: prev.followUps.map((fu) =>
            fu.id === followUpId
              ? {
                  ...fu,
                  candidate_answer: data.candidate_answer,
                  candidateAnswer: data.candidate_answer,
                  answered_at: data.answered_at,
                  answeredAt: data.answered_at,
                }
              : fu
          ),
        }));
        setFollowUpInputs((prev) => {
          const next = { ...prev };
          delete next[followUpId];
          return next;
        });
      } else {
        const errJson = await response.json().catch(() => null);
        let detailMsg = `HTTP error ${response.status}: Failed to submit follow-up answer.`;
        if (errJson?.detail) {
          if (typeof errJson.detail === 'string') {
            detailMsg = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            detailMsg = errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
          } else {
            detailMsg = JSON.stringify(errJson.detail);
          }
        }
        setFollowUpError(detailMsg);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
          : err instanceof Error
          ? err.message
          : 'Failed to submit follow-up answer.';
      setFollowUpError(msg);
    } finally {
      setSubmittingFollowUpId(null);
    }
  };

  const handleAdvanceQuestion = async () => {
    if (!sessionId) {
      setProgressionState({
        status: 'error',
        errorMessage: 'Session ID is missing. Please restart the interview.',
      });
      return;
    }

    setProgressionState({ status: 'advancing' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/next`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data: SessionAdvanceResponse = await response.json();
        if (data.is_completed || data.isCompleted || data.status === 'completed') {
          setSessionStatus('completed');
          setProgressionState({ status: 'idle' });
        } else if (data.current_question || data.currentQuestion) {
          const nextQ = (data.current_question || data.currentQuestion)!;
          setCurrentQuestion(nextQ);
          setAnswerText('');
          setSubmissionState({ status: 'idle' });
          setEvaluationState({ status: 'idle' });
          setFollowUpState({ status: 'idle', followUps: [] });
          setFollowUpInputs({});
          setFollowUpError(null);
          setProgressionState({ status: 'idle' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        const errorData = await response.json().catch(() => null);
        let detailMsg = `HTTP error ${response.status}: Failed to advance question.`;
        if (errorData?.detail) {
          if (typeof errorData.detail === 'string') {
            detailMsg = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            detailMsg = errorData.detail
              .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
              .join(', ');
          } else {
            detailMsg = JSON.stringify(errorData.detail);
          }
        }
        setProgressionState({
          status: 'error',
          errorMessage: detailMsg,
        });
      }
    } catch (err: unknown) {
      setProgressionState({
        status: 'error',
        errorMessage:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
            : err instanceof Error
            ? err.message
            : 'Connection to backend failed.',
      });
    }
  };

  const starterCode = q?.starter_code || q?.starterCode;
  const expectedConcepts = q?.expected_concepts || q?.expectedConcepts || [];
  const isSubmitting = submissionState.status === 'submitting';
  const isAnswerValid = answerText.trim().length > 0;
  const isEvaluating = evaluationState.status === 'evaluating';
  const evalData = evaluationState.evaluation;

  // Follow-up calculations
  const followUps = followUpState.followUps;
  const followUpCount = followUps.length;
  const isMaxFollowUpsReached = followUpCount >= 2;
  const isGeneratingFollowUp = followUpState.status === 'generating';
  const hasPrimaryAnswer = submissionState.status === 'submitted';

  const firstFuAnswered =
    followUpCount >= 1 &&
    Boolean(followUps[0].candidate_answer || followUps[0].candidateAnswer);

  const canRequestFollowUp =
    hasPrimaryAnswer &&
    !isMaxFollowUpsReached &&
    (followUpCount === 0 || firstFuAnswered) &&
    !isGeneratingFollowUp;

  // Progression calculations
  const hasPendingFollowUps = followUps.some(
    (fu) => !fu.candidate_answer && !fu.candidateAnswer
  );
  const canAdvance =
    hasPrimaryAnswer &&
    !hasPendingFollowUps &&
    progressionState.status !== 'advancing' &&
    sessionStatus === 'in_progress';

  // If session is completed, render dedicated completion and report screen
  if (sessionStatus === 'completed') {
    const rep = reportState.report;

    return (
      <div id="interview-completed-view" className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full animate-fadeIn">
        {/* Header Hero */}
        <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 sm:p-10 shadow-2xl backdrop-blur-md mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <div className="relative p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 text-emerald-400">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Interview Completed • Archived as Read-Only</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Final Performance & Assessment Report
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed mb-6">
            Comprehensive evaluation for <span className="font-semibold text-cyan-400">{config?.role || 'Technical Interview'}</span> ({config?.difficulty || 'Senior'} • {config?.primaryLanguage || 'Python'}). All responses and evaluation metrics are persisted.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Role</span>
              <span className="text-xs sm:text-sm font-bold text-white truncate block">{config?.role || 'Engineer'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Track / Seniority</span>
              <span className="text-xs sm:text-sm font-bold text-indigo-300 truncate block">{config?.difficulty || 'Senior'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Language</span>
              <span className="text-xs sm:text-sm font-bold text-cyan-300 truncate block">{config?.primaryLanguage || 'Python'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Progress</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate block font-mono">
                {rep?.answered_questions ?? rep?.answeredQuestions ?? totalQuestions} / {totalQuestions} Done
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {reportState.status === 'loading' && (
          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-12 text-center flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
            <div>
              <h3 className="text-base font-bold text-white mb-1">Synthesizing Final Assessment Report</h3>
              <p className="text-xs text-slate-400">Aggregating dimensional evaluations, scoring algorithms, and evidence-grounded study recommendations...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {reportState.status === 'error' && (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center flex flex-col items-center justify-center gap-4 mb-8">
            <AlertCircle className="h-10 w-10 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white mb-1">Unable to Load Final Report</h3>
              <p className="text-xs text-rose-300 mb-4">{reportState.errorMessage || 'An error occurred fetching the final assessment.'}</p>
              <button
                onClick={() => fetchReport(false)}
                className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Report Retrieval</span>
              </button>
            </div>
          </div>
        )}

        {/* Success State Report Body */}
        {reportState.status === 'success' && rep && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Scorecard & Dimension Meters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Score Badge */}
              <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-cyan-400" />
                  Overall Performance Score
                </span>

                <div className="relative my-2">
                  <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 font-mono tracking-tight">
                    {rep.overall_score != null || rep.overallScore != null
                      ? (rep.overall_score ?? rep.overallScore)!.toFixed(1)
                      : '—'}
                  </div>
                  <span className="text-xs text-slate-500 font-bold block mt-1">Scale: 0.0 - 10.0</span>
                </div>

                <div className={`mt-4 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                  (rep.performance_rating || rep.performanceRating || '').includes('Excellent') || (rep.performance_rating || rep.performanceRating || '').includes('Strong')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : (rep.performance_rating || rep.performanceRating || '').includes('Proficient') || (rep.performance_rating || rep.performanceRating || '').includes('Pass')
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : (rep.performance_rating || rep.performanceRating || '').includes('Developing')
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {rep.performance_rating || rep.performanceRating || 'Completed'}
                </div>

                <div className="mt-4 text-[11px] text-slate-400">
                  {rep.evaluated_questions ?? rep.evaluatedQuestions ?? 0} of {rep.total_questions ?? rep.totalQuestions ?? totalQuestions} questions evaluated
                </div>
              </div>

              {/* 4 Dimension Breakdown */}
              <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    Evaluated Dimension Averages
                  </span>
                  <span className="text-[11px] text-slate-500">Authoritative Backend Weighted Model</span>
                </div>

                <div className="space-y-4">
                  {/* Correctness 40% */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Correctness <span className="text-[10px] text-slate-500 font-mono">(40% Weight)</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {rep.scores?.correctness_average != null || rep.scores?.correctnessAverage != null
                          ? `${(rep.scores.correctness_average ?? rep.scores.correctnessAverage)!.toFixed(1)} / 10`
                          : 'Not Evaluated'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${((rep.scores?.correctness_average ?? rep.scores?.correctnessAverage ?? 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Technical Depth 25% */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                        Technical Depth <span className="text-[10px] text-slate-500 font-mono">(25% Weight)</span>
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {rep.scores?.technical_depth_average != null || rep.scores?.technicalDepthAverage != null
                          ? `${(rep.scores.technical_depth_average ?? rep.scores.technicalDepthAverage)!.toFixed(1)} / 10`
                          : 'Not Evaluated'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${((rep.scores?.technical_depth_average ?? rep.scores?.technicalDepthAverage ?? 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Edge Cases 20% */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-violet-400" />
                        Edge Cases & Scale <span className="text-[10px] text-slate-500 font-mono">(20% Weight)</span>
                      </span>
                      <span className="font-mono text-violet-400 font-bold">
                        {rep.scores?.edge_cases_average != null || rep.scores?.edgeCasesAverage != null
                          ? `${(rep.scores.edge_cases_average ?? rep.scores.edgeCasesAverage)!.toFixed(1)} / 10`
                          : 'Not Evaluated'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-violet-500 to-violet-400 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${((rep.scores?.edge_cases_average ?? rep.scores?.edgeCasesAverage ?? 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Communication 15% */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                        Communication Clarity <span className="text-[10px] text-slate-500 font-mono">(15% Weight)</span>
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {rep.scores?.communication_average != null || rep.scores?.communicationAverage != null
                          ? `${(rep.scores.communication_average ?? rep.scores.communicationAverage)!.toFixed(1)} / 10`
                          : 'Not Evaluated'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${((rep.scores?.communication_average ?? rep.scores?.communicationAverage ?? 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive AI Narrative Synthesis */}
            <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Bot className="h-4 w-4" />
                <span>Executive Qualitative Assessment</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {rep.summary_narrative || rep.summaryNarrative}
              </p>
            </div>

            {/* Insights Triplet (Strengths, Gaps, Recommendations) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Strengths */}
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-5 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Demonstrated Strengths</span>
                </div>
                <div className="space-y-2 flex-1">
                  {(rep.strengths || []).length > 0 ? (
                    (rep.strengths || []).map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No specific strengths recorded.</p>
                  )}
                </div>
              </div>

              {/* Areas for Growth */}
              <div className="rounded-2xl border border-amber-500/20 bg-slate-950/80 p-5 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Growth Areas & Omissions</span>
                </div>
                <div className="space-y-2 flex-1">
                  {(rep.improvement_areas || rep.improvementAreas || []).length > 0 ? (
                    (rep.improvement_areas || rep.improvementAreas || []).map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No significant conceptual gaps identified.</p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  <span>Study Recommendations</span>
                </div>
                <div className="space-y-2 flex-1">
                  {(rep.study_recommendations || rep.studyRecommendations || []).length > 0 ? (
                    (rep.study_recommendations || rep.studyRecommendations || []).map((rec, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No study recommendations available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Per-Question Detailed Breakdown */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <span>Per-Question Detailed Drilldown</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explore problem statements, submitted code, evaluation critiques, and follow-up turns.</p>
                </div>
              </div>

              <div className="space-y-4">
                {(rep.per_question_results || rep.perQuestionResults || []).map((pq) => {
                  const num = pq.question_number || pq.questionNumber;
                  const isExpanded = expandedQuestionNumber === num;
                  const qScore = pq.overall_score ?? pq.overallScore;

                  return (
                    <div key={num} className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden transition">
                      {/* Accordion Header */}
                      <button
                        onClick={() => setExpandedQuestionNumber(isExpanded ? null : (num ?? 1))}
                        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-900/40 transition"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold">
                            Question #{num}
                          </span>
                          <span className="text-sm font-bold text-white">{pq.topic}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {pq.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {qScore != null ? (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              Score: {qScore.toFixed(1)} / 10
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unevaluated</span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-5 pt-0 border-t border-slate-800/80 space-y-5 animate-fadeIn">
                          {/* Question Prompt */}
                          <div className="mt-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Problem Statement
                            </span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 font-sans">
                              {pq.question_text || pq.questionText}
                            </p>
                          </div>

                          {/* Candidate Answer */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Submitted Candidate Answer
                              </span>
                              {(pq.answer_text || pq.answerText) && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {(pq.answer_text || pq.answerText)!.length} characters
                                </span>
                              )}
                            </div>
                            {(pq.answer_text || pq.answerText) ? (
                              <pre className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                <code>{pq.answer_text || pq.answerText}</code>
                              </pre>
                            ) : (
                              <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                                No answer submitted for this question.
                              </p>
                            )}
                          </div>

                          {/* Question Evaluation Details */}
                          {(pq.feedback || qScore != null) && (
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Question Evaluation Critique
                                </span>
                                {qScore != null && (
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    Overall: {qScore.toFixed(1)} / 10
                                  </span>
                                )}
                              </div>

                              {pq.feedback && (
                                <p className="text-xs text-slate-300 leading-relaxed">{pq.feedback}</p>
                              )}

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Correctness</span>
                                  <span className="font-mono text-emerald-400 font-bold">{pq.correctness_score ?? pq.correctnessScore ?? '—'}/10</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Tech Depth</span>
                                  <span className="font-mono text-indigo-400 font-bold">{pq.technical_depth_score ?? pq.technicalDepthScore ?? '—'}/10</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Edge Cases</span>
                                  <span className="font-mono text-violet-400 font-bold">{pq.edge_cases_score ?? pq.edgeCasesScore ?? '—'}/10</span>
                                </div>
                                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Communication</span>
                                  <span className="font-mono text-cyan-400 font-bold">{pq.communication_score ?? pq.communicationScore ?? '—'}/10</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Follow-up Inquiries */}
                          {(pq.follow_ups || []).length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
                                <CornerDownRight className="h-3 w-3 text-cyan-400" />
                                Follow-up Inquiries ({(pq.follow_ups || []).length})
                              </span>
                              <div className="space-y-2.5">
                                {(pq.follow_ups || []).map((fu) => (
                                  <div key={fu.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-2">
                                    <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>Follow-up #{fu.follow_up_number || fu.followUpNumber}: {fu.question_text || fu.questionText}</span>
                                    </div>
                                    {(fu.candidate_answer || fu.candidateAnswer) ? (
                                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 font-mono text-[11px] whitespace-pre-wrap">
                                        {fu.candidate_answer || fu.candidateAnswer}
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 italic block">Unanswered follow-up inquiry.</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <button
                onClick={() => fetchReport(true)}
                disabled={isRefreshing}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Re-synthesize / Refresh Report</span>
              </button>

              <button
                onClick={onEndSession}
                id="return-landing-button"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 border border-emerald-400/30 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                <span>Return to Landing / Start New Session</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fadeIn">
      {/* Session Top Bar */}
      <div className="mb-6 flex flex-col gap-3 p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onEndSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit Interview</span>
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            {/* Role & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-base">
                {config?.role || 'Technical Interview'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {config?.difficulty || q?.difficulty || 'Senior'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {config?.primaryLanguage || 'Python'}
              </span>
              <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                {sessionId}
              </span>
            </div>
          </div>

          {/* Live Status & Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Session • In Progress</span>
            </div>

            <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white">
              Question {qNum} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* Dynamic Progress Stepper Bar */}
        <div className="w-full pt-1">
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (qNum / totalQuestions) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Problem Statement & Candidate Solution Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Problem Statement & Architecture Requirements */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Question Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Technical Challenge • Question {qNum} of {totalQuestions}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
              {q?.topic || 'Distributed Systems & Concurrency'}
            </h2>

            {/* Problem Statement Box */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5 mb-6 text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line font-sans">
              {q?.question_text || q?.questionText}
            </div>

            {/* Expected Core Concepts */}
            {expectedConcepts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Key Architectural Concepts to Address</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {expectedConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700/70"
                    >
                      <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                      <span>{concept}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Safety & Evaluation Notice */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-4 text-xs text-slate-300 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Execution Safety Policy:</span>
              <p className="mt-0.5 text-slate-400">
                Candidate code is strictly prohibited from executing. All technical solutions are reviewed via static AI structural analysis against algorithmic accuracy and system design principles.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Starter Code, Candidate Workspace, Evaluation, Follow-ups, and Progression */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Starter Code Block */}
          {starterCode ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono font-medium text-slate-300">
                    Starter Stub • {config?.primaryLanguage || 'Code'}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                  title="Copy starter code to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-950/90 overflow-x-auto max-h-56">
                <pre className="font-mono text-xs text-emerald-400/90 leading-relaxed">
                  <code>{starterCode}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400">
              <Code2 className="h-6 w-6 text-slate-600 mx-auto mb-1.5" />
              <span>Conceptual System Design Question (No code stub required).</span>
            </div>
          )}

          {/* Candidate Primary Answer Workspace */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Your Technical Solution</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                Question {qNum} of {totalQuestions}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Formulate your response below. You can include your architectural reasoning, algorithm design, complexity trade-offs, and code implementation.
            </p>

            <form onSubmit={handleSubmitAnswer} className="flex flex-col gap-3">
              <div className="relative">
                <textarea
                  id="candidate-answer-textarea"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  disabled={isSubmitting || isEvaluating}
                  placeholder="Explain your approach, design considerations, trade-offs, and paste or type your code solution..."
                  rows={8}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[160px]"
                />
              </div>

              {/* Textarea Bottom Meta: Char Count & Submit Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="font-mono text-xs text-slate-500">
                  {answerText.length} characters
                </span>

                <button
                  type="submit"
                  id="submit-answer-button"
                  disabled={isSubmitting || !isAnswerValid || isEvaluating}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg ${
                    isSubmitting || !isAnswerValid || isEvaluating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 border border-indigo-400/30 hover:shadow-indigo-500/20 active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                      <span>Submitting Answer...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Feedback */}
            {submissionState.status === 'error' && (
              <div
                id="answer-error-banner"
                className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-start gap-3 animate-fadeIn"
              >
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-300">Submission Error</p>
                  <p className="text-slate-300 leading-relaxed">{submissionState.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success Feedback & Evaluation Trigger */}
            {submissionState.status === 'submitted' && submissionState.response && (
              <div
                id="answer-success-banner"
                className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex flex-col gap-3 animate-fadeIn"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-emerald-300">Answer Recorded & Persisted</p>
                      <span className="font-mono text-[10px] text-emerald-400/80">
                        ID: {submissionState.response.answer_id || submissionState.response.answerId}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {submissionState.response.message || 'Your solution was safely saved to PostgreSQL.'}
                    </p>
                  </div>
                </div>

                {/* AI Evaluation Trigger Bar */}
                <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                    <span>Ready for AI evaluation across all 4 architectural dimensions.</span>
                  </span>

                  <button
                    type="button"
                    id="request-evaluation-button"
                    onClick={handleRequestEvaluation}
                    disabled={isEvaluating}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition shadow-md ${
                      isEvaluating
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:from-cyan-400 hover:to-indigo-400 border border-cyan-400/30 active:scale-[0.98]'
                    }`}
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" />
                        <span>Evaluating with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        <span>Request AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Evaluation Error Banner */}
            {evaluationState.status === 'error' && (
              <div
                id="evaluation-error-banner"
                className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs text-rose-200 flex flex-col gap-2.5 animate-fadeIn"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-rose-300">AI Evaluation Error</p>
                    <p className="text-slate-300 leading-relaxed">{evaluationState.errorMessage}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRequestEvaluation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-semibold transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Retry Evaluation</span>
                  </button>
                </div>
              </div>
            )}

            {/* Evaluation Scorecard & Detailed Feedback Report */}
            {evaluationState.status === 'evaluated' && evalData && (
              <div
                id="evaluation-report-card"
                className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 animate-fadeIn"
              >
                {/* Header with Overall Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Evaluation Scorecard</h4>
                      <p className="text-[11px] text-slate-400">
                        Weighted assessment across the 4 technical dimensions
                      </p>
                    </div>
                  </div>

                  {/* Overall Score Dial */}
                  <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Overall Score
                      </span>
                      <span className="text-xs text-slate-500 font-mono">Weighted</span>
                    </div>
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 font-mono">
                      {evalData.overall_score || evalData.overallScore} / 10
                    </div>
                  </div>
                </div>

                {/* Dimension Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Correctness (40%) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Correctness (40%)</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {evalData.scores.correctness} / 10
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, evalData.scores.correctness * 10))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Technical Depth (25%) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Technical Depth (25%)</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {evalData.scores.technical_depth ?? evalData.scores.technicalDepth} / 10
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, (evalData.scores.technical_depth ?? evalData.scores.technicalDepth ?? 0) * 10)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Edge Cases (20%) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Edge Cases (20%)</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {evalData.scores.edge_cases ?? evalData.scores.edgeCases} / 10
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, (evalData.scores.edge_cases ?? evalData.scores.edgeCases ?? 0) * 10)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Communication & Clarity (15%) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Communication (15%)</span>
                      <span className="font-mono font-bold text-amber-400">
                        {evalData.scores.communication} / 10
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, evalData.scores.communication * 10))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Qualitative Feedback Text */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
                    Qualitative Assessment
                  </span>
                  <p>{evalData.feedback}</p>
                </div>

                {/* Strengths & Missing Concepts Side by Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {evalData.strengths && evalData.strengths.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col gap-2">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Key Strengths</span>
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {evalData.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Concepts */}
                  {((evalData.missing_concepts && evalData.missing_concepts.length > 0) ||
                    (evalData.missingConcepts && evalData.missingConcepts.length > 0)) && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 flex flex-col gap-2">
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Missing Concepts / Gaps</span>
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {(evalData.missing_concepts || evalData.missingConcepts || []).map((m, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actionable Improvement Suggestions */}
                {evalData.suggestions && evalData.suggestions.length > 0 && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col gap-2">
                    <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Actionable Recommendations for Improvement</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {evalData.suggestions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Adaptive Follow-up Section */}
          <div
            id="follow-up-section"
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col gap-5 animate-fadeIn"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Adaptive Follow-up Inquiries</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-cyan-400">
                      {followUpCount} / 2
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Probing deeper into edge cases, scalability, and system trade-offs
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              {isMaxFollowUpsReached ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Max Limit Reached</span>
                </span>
              ) : null}
            </div>

            {/* Info notice if primary answer not yet submitted */}
            {!hasPrimaryAnswer && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 flex items-start gap-3">
                <HelpCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  Submit your primary technical solution above to unlock adaptive AI follow-up questions tailored to your solution.
                </p>
              </div>
            )}

            {/* Follow-up Error Banner */}
            {followUpError && (
              <div
                id="followup-error-banner"
                className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs text-rose-200 flex flex-col gap-2 animate-fadeIn"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-rose-300">Follow-up Error</p>
                    <p className="text-slate-300 leading-relaxed">{followUpError}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFollowUpError(null)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Dismiss
                  </button>
                  {canRequestFollowUp && (
                    <button
                      type="button"
                      onClick={handleRequestFollowUp}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-semibold transition"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Retry Request</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Thread: Ordered list of follow-up questions */}
            {followUps.length > 0 && (
              <div className="space-y-5">
                {followUps.map((fu, idx) => {
                  const fuNum = fu.follow_up_number || fu.followUpNumber || idx + 1;
                  const isAnswered = Boolean(fu.candidate_answer || fu.candidateAnswer);
                  const isSubmittingThis = submittingFollowUpId === fu.id;
                  const currentAnswerInput = followUpInputs[fu.id] || '';
                  const hasInput = currentAnswerInput.trim().length > 0;

                  return (
                    <div
                      key={fu.id}
                      id={`followup-card-${fu.id}`}
                      className="rounded-xl border border-indigo-500/30 bg-slate-950/70 p-5 flex flex-col gap-3.5 shadow-lg animate-fadeIn"
                    >
                      {/* Follow-up Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Follow-up #{fuNum} of 2
                          </span>
                          {fu.probing_reason || fu.probingReason ? (
                            <span className="text-[11px] text-cyan-400 font-medium italic">
                              Focus: {fu.probing_reason || fu.probingReason}
                            </span>
                          ) : null}
                        </div>

                        {isAnswered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <Check className="h-3 w-3" />
                            <span>Answer Recorded</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <CornerDownRight className="h-3 w-3" />
                            <span>Response Required</span>
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
                        {fu.question_text || fu.questionText}
                      </div>

                      {/* Expected Concepts */}
                      {((fu.expected_concepts && fu.expected_concepts.length > 0) ||
                        (fu.expectedConcepts && fu.expectedConcepts.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mr-1">
                            Key Concepts:
                          </span>
                          {(fu.expected_concepts || fu.expectedConcepts || []).map((concept, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Candidate Answer Workspace for Follow-up */}
                      {isAnswered ? (
                        <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-400">Your Follow-up Answer:</span>
                            {(fu.answered_at || fu.answeredAt) && (
                              <span className="font-mono text-[10px] text-slate-500">
                                {new Date(fu.answered_at || fu.answeredAt || '').toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <div className="p-3 rounded bg-slate-950 font-mono text-xs text-emerald-300/90 whitespace-pre-wrap leading-relaxed border border-slate-800">
                            {fu.candidate_answer || fu.candidateAnswer}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2.5">
                          <textarea
                            id={`followup-answer-textarea-${fu.id}`}
                            rows={4}
                            value={currentAnswerInput}
                            onChange={(e) =>
                              setFollowUpInputs((prev) => ({
                                ...prev,
                                [fu.id]: e.target.value,
                              }))
                            }
                            disabled={isSubmittingThis}
                            placeholder={`Address the follow-up question #${fuNum}: discuss trade-offs, edge cases, or code adjustments...`}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition disabled:opacity-50"
                          />

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-slate-500">
                              {currentAnswerInput.length} characters
                            </span>

                            <button
                              type="button"
                              id={`submit-followup-answer-${fu.id}`}
                              onClick={() => handleSubmitFollowUpAnswer(fu.id)}
                              disabled={isSubmittingThis || !hasInput}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition shadow-md ${
                                isSubmittingThis || !hasInput
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                  : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 border border-indigo-400/30 active:scale-[0.98]'
                              }`}
                            >
                              {isSubmittingThis ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin text-cyan-200" />
                                  <span>Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  <span>Submit Follow-up Answer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Request Follow-Up Action Bar */}
            {hasPrimaryAnswer && !isMaxFollowUpsReached && (
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {followUpCount === 0
                    ? 'Request an AI follow-up question to probe deeper into your solution.'
                    : !firstFuAnswered
                    ? 'Submit an answer for Follow-up #1 before requesting Follow-up #2.'
                    : 'Request the second and final follow-up question for this problem.'}
                </span>

                <button
                  type="button"
                  id="request-follow-up-button"
                  onClick={handleRequestFollowUp}
                  disabled={!canRequestFollowUp}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition shadow-md ${
                    !canRequestFollowUp
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 border border-indigo-400/30 hover:shadow-indigo-500/20 active:scale-[0.98]'
                  }`}
                >
                  {isGeneratingFollowUp ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" />
                      <span>Generating Follow-up #{followUpCount + 1}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                      <span>Request Follow-up Question ({followUpCount + 1}/2)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Max Limit Reached Confirmation Banner */}
            {isMaxFollowUpsReached && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-slate-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    All adaptive follow-up inquiries completed for Question {qNum}.
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                  2/2 Complete
                </span>
              </div>
            )}
          </div>

          {/* Question Progression Action Section */}
          <div
            id="question-progression-card"
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col gap-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Question Progression</h4>
                  <p className="text-[11px] text-slate-400">
                    Step {qNum} of {totalQuestions} • {isFinalQuestion ? 'Final Question' : `Next: Question ${qNum + 1}`}
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                {Math.round((qNum / totalQuestions) * 100)}% Complete
              </div>
            </div>

            {/* Eligibility notices */}
            {!hasPrimaryAnswer ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Submit your primary technical solution above before advancing.</span>
              </div>
            ) : hasPendingFollowUps ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>All requested follow-up inquiries must be answered before advancing.</span>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  {isFinalQuestion
                    ? 'All requirements completed. You are ready to finalize and complete this interview session.'
                    : `Question #${qNum} complete. You can advance to Question #${qNum + 1}.`}
                </span>
              </div>
            )}

            {/* Error Banner */}
            {progressionState.status === 'error' && (
              <div
                id="progression-error-banner"
                className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs text-rose-200 flex flex-col gap-2 animate-fadeIn"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-rose-300">Progression Error</p>
                    <p className="text-slate-300 leading-relaxed">{progressionState.errorMessage}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAdvanceQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-semibold transition"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry Progression</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advance Button */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                id="advance-question-button"
                onClick={handleAdvanceQuestion}
                disabled={!canAdvance}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-lg ${
                  !canAdvance
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : isFinalQuestion
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 border border-emerald-400/30 hover:shadow-emerald-500/20 active:scale-[0.98]'
                    : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 border border-indigo-400/30 hover:shadow-indigo-500/20 active:scale-[0.98]'
                }`}
              >
                {progressionState.status === 'advancing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                    <span>{isFinalQuestion ? 'Finalizing Interview...' : 'Generating Next Challenge...'}</span>
                  </>
                ) : isFinalQuestion ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete Interview Session ✓</span>
                  </>
                ) : (
                  <>
                    <span>Advance to Question {qNum + 1}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
