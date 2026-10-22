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
  RefreshCw,
  ArrowRight,
  Trophy,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
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
import { apiFetch } from '../utils/api';

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
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(
    session.current_question || session.currentQuestion || null
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
  };

  useEffect(() => {
    if (sessionStatus === 'completed' && sessionId) {
      fetchReport(false);
    }
  }, [sessionStatus, sessionId]);

  // On mount or question change, retrieve existing follow-up questions for this primary question
  useEffect(() => {
    const fetchExistingFollowUps = async () => {
      if (!sessionId || !q) return;
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const questionId = q.question_number || q.questionNumber;
        const res = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}/questions/${questionId}/follow-ups`);
        if (res.ok) {
          const list: FollowUpQuestionData[] = await res.json();
          if (Array.isArray(list)) {
            setFollowUpState({ status: 'idle', followUps: list });
          }
        }
      } catch {
        // Silently continue if follow-ups cannot be retrieved
      }
    };

    fetchExistingFollowUps();
  }, [sessionId, q]);

  const handleCopyCode = () => {
    const code = q?.starter_code || q?.starterCode;
    if (code) {
      navigator.clipboard.writeText(code);
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
        errorMessage: 'Answer submission cannot be empty or whitespace only.',
      });
      return;
    }
    if (!sessionId) {
      setSubmissionState({
        status: 'error',
        errorMessage: 'Session ID is missing.',
      });
      return;
    }

    setSubmissionState({ status: 'submitting' });
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/answers`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_text: trimmed,
          question_number: qNum,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionState({
          status: 'submitted',
          response: data,
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
    if (!sessionId) {
      setEvaluationState({
        status: 'error',
        errorMessage: 'Session ID is missing.',
      });
      return;
    }
    setEvaluationState({ status: 'evaluating' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/evaluate`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_number: qNum,
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
      setFollowUpError('Session ID is missing.');
      return;
    }
    setFollowUpError(null);
    setFollowUpState((prev) => ({ ...prev, status: 'generating' }));

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/follow-up`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_number: qNum,
        }),
      });

      if (response.ok) {
        const data: FollowUpQuestionData = await response.json();
        setFollowUpState((prev) => ({
          status: 'idle',
          followUps: [...prev.followUps, data],
        }));
      } else {
        const errJson = await response.json().catch(() => null);
        let detailMsg = `HTTP ${response.status}: Failed to request follow-up inquiry.`;
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

      const response = await apiFetch(endpoint, {
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
        let detailMsg = `HTTP ${response.status}: Failed to submit follow-up answer.`;
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
        errorMessage: 'Session ID is missing.',
      });
      return;
    }

    setProgressionState({ status: 'advancing' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/advance`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data: SessionAdvanceResponse = await response.json();

        if (data.status === 'completed' || isFinalQuestion) {
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
      <div id="interview-completed-view" className="w-full relative z-10 animate-fadeIn">
        <div className="editorial-frame border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
          {/* Dossier Meta Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono tracking-[0.25em] uppercase text-[#7A7875] dark:text-slate-400 select-none bg-[#F8F6F1]/80 dark:bg-[#16061D]/90 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
              <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">SPECIMEN 04 / CANDIDATE EVALUATION DOSSIER</span>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span>STATUS: ARCHIVED</span>
              <span className="text-[#EAAA00]">+</span>
              <span>READ-ONLY</span>
            </div>
          </div>

          {/* Dossier Hero Section */}
          <section className="px-4 sm:px-8 lg:px-12 py-12 sm:py-16 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 relative overflow-hidden bg-transparent dark:bg-[#120516]">
            <div className="editorial-crosshair -top-3 -left-3 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
            <div className="editorial-crosshair -top-3 -right-3 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] text-[10px] font-mono tracking-widest uppercase text-[#3A0F34] dark:text-[#EAAA00] mb-4">
                <Trophy className="h-3.5 w-3.5 text-[#EAAA00]" />
                <span>INTERVIEW ROUND COMPLETED • OFFICIAL REPORT</span>
              </div>

              <h1 className="font-didone text-4xl sm:text-6xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95] mb-4">
                Final Performance & Assessment Report
              </h1>

              <p className="text-xs sm:text-sm text-[#555555] dark:text-slate-300 max-w-2xl leading-relaxed font-sans mb-8">
                Authoritative evaluation for <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">{config?.role || 'Technical Interview'}</span> ({config?.difficulty || 'Senior'} • {config?.primaryLanguage || 'Python'}). All responses and 4D rubric telemetry vectors are safely persisted.
              </p>

              {/* Quick Metrics Broadsheet Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
                <div className="p-3.5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/80 dark:bg-[#16061D]/80">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-0.5">Role</span>
                  <span className="text-xs sm:text-sm font-bold text-[#111111] dark:text-[#F8F6F1] truncate block">{config?.role || 'Engineer'}</span>
                </div>
                <div className="p-3.5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/80 dark:bg-[#16061D]/80">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-0.5">Seniority</span>
                  <span className="text-xs sm:text-sm font-bold text-[#3A0F34] dark:text-[#EAAA00] truncate block">{config?.difficulty || 'Senior'}</span>
                </div>
                <div className="p-3.5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/80 dark:bg-[#16061D]/80">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-0.5">Language</span>
                  <span className="text-xs sm:text-sm font-bold text-[#111111] dark:text-[#F8F6F1] truncate block">{config?.primaryLanguage || 'Python'}</span>
                </div>
                <div className="p-3.5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/80 dark:bg-[#16061D]/80">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-0.5">Progress</span>
                  <span className="text-xs sm:text-sm font-bold text-[#3A0F34] dark:text-[#EAAA00] truncate block font-mono">
                    {rep?.answered_questions ?? rep?.answeredQuestions ?? totalQuestions} / {totalQuestions} Done
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Loading State */}
          {reportState.status === 'loading' && (
            <div className="p-16 text-center border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/60 dark:bg-[#16061D]/60 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-[#3A0F34] dark:text-[#EAAA00] animate-spin" />
              <div>
                <h3 className="font-didone text-xl font-bold text-[#111111] dark:text-[#F8F6F1] mb-1">Synthesizing Final Assessment Dossier</h3>
                <p className="text-xs text-[#7A7875] dark:text-slate-400 font-sans">Aggregating 4D dimensional scores, algorithmic feedback, and evidence-grounded study recommendations...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {reportState.status === 'error' && (
            <div className="p-8 border-b border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/60 text-center flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              <div>
                <h3 className="text-base font-bold text-[#111111] dark:text-[#F8F6F1] mb-1">Unable to Load Final Report</h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mb-4">{reportState.errorMessage || 'An error occurred fetching the final assessment.'}</p>
                <button
                  onClick={() => fetchReport(false)}
                  className="px-5 py-2.5 bg-white dark:bg-[#250C3D] hover:bg-rose-100 dark:hover:bg-[#34114F] border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-mono font-bold transition flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Report Retrieval</span>
                </button>
              </div>
            </div>
          )}

          {/* Success State Report Body */}
          {reportState.status === 'success' && rep && (
            <div className="divide-y divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
              {/* Scorecard Broadsheet Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
                {/* Overall Score Dial */}
                <div className="lg:col-span-4 p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-[#FAF8F5]/60 dark:bg-[#16061D]/80">
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#7A7875] dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-[#EAAA00]" />
                    Overall Calibrated Score
                  </span>

                  <div className="my-2">
                    <div className="font-didone text-6xl sm:text-7xl font-black text-[#111111] dark:text-[#F8F6F1] tracking-tight">
                      {rep.overall_score != null || rep.overallScore != null
                        ? (rep.overall_score ?? rep.overallScore)!.toFixed(1)
                        : '—'}
                    </div>
                    <span className="text-xs font-mono text-[#7A7875] dark:text-slate-400 font-semibold block mt-1">Scale: 0.0 - 10.0</span>
                  </div>

                  <div className="mt-4 px-4 py-1.5 bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] text-xs font-mono font-bold">
                    {rep.performance_rating || rep.performanceRating || 'Completed'}
                  </div>

                  <div className="mt-4 text-[11px] font-mono text-[#7A7875] dark:text-slate-400">
                    {rep.evaluated_questions ?? rep.evaluatedQuestions ?? 0} of {rep.total_questions ?? rep.totalQuestions ?? totalQuestions} challenges evaluated
                  </div>
                </div>

                {/* 4 Dimension Breakdown */}
                <div className="lg:col-span-8 p-8 sm:p-10 flex flex-col justify-between bg-[#F8F6F1]/70 dark:bg-[#16061D]/60">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#EAAA00]" />
                      Evaluated Dimension Averages
                    </span>
                    <span className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400">Weighted 4D Model</span>
                  </div>

                  <div className="space-y-4">
                    {/* Correctness 40% */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#111111] dark:text-[#F8F6F1] flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                          Correctness <span className="text-[10px] text-[#7A7875] dark:text-slate-400 font-mono">(40% Weight)</span>
                        </span>
                        <span className="font-mono text-[#111111] dark:text-[#F8F6F1] font-bold">
                          {rep.scores?.correctness_average != null || rep.scores?.correctnessAverage != null
                            ? `${(rep.scores.correctness_average ?? rep.scores.correctnessAverage)!.toFixed(1)} / 10`
                            : 'Not Evaluated'}
                        </span>
                      </div>
                      <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                        <div
                          className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full"
                          style={{ width: `${((rep.scores?.correctness_average ?? rep.scores?.correctnessAverage ?? 0) / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Technical Depth 25% */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#111111] dark:text-[#F8F6F1] flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                          Technical Depth <span className="text-[10px] text-[#7A7875] dark:text-slate-400 font-mono">(25% Weight)</span>
                        </span>
                        <span className="font-mono text-[#111111] dark:text-[#F8F6F1] font-bold">
                          {rep.scores?.technical_depth_average != null || rep.scores?.technicalDepthAverage != null
                            ? `${(rep.scores.technical_depth_average ?? rep.scores.technicalDepthAverage)!.toFixed(1)} / 10`
                            : 'Not Evaluated'}
                        </span>
                      </div>
                      <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                        <div
                          className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full"
                          style={{ width: `${((rep.scores?.technical_depth_average ?? rep.scores?.technicalDepthAverage ?? 0) / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Edge Cases 20% */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#111111] dark:text-[#F8F6F1] flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#EAAA00]" />
                          Edge Cases & Scale <span className="text-[10px] text-[#7A7875] dark:text-slate-400 font-mono">(20% Weight)</span>
                        </span>
                        <span className="font-mono text-[#111111] dark:text-[#F8F6F1] font-bold">
                          {rep.scores?.edge_cases_average != null || rep.scores?.edgeCasesAverage != null
                            ? `${(rep.scores.edge_cases_average ?? rep.scores.edgeCasesAverage)!.toFixed(1)} / 10`
                            : 'Not Evaluated'}
                        </span>
                      </div>
                      <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                        <div
                          className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full"
                          style={{ width: `${((rep.scores?.edge_cases_average ?? rep.scores?.edgeCasesAverage ?? 0) / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Communication 15% */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#111111] dark:text-[#F8F6F1] flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                          Communication Clarity <span className="text-[10px] text-[#7A7875] dark:text-slate-400 font-mono">(15% Weight)</span>
                        </span>
                        <span className="font-mono text-[#111111] dark:text-[#F8F6F1] font-bold">
                          {rep.scores?.communication_average != null || rep.scores?.communicationAverage != null
                            ? `${(rep.scores.communication_average ?? rep.scores.communicationAverage)!.toFixed(1)} / 10`
                            : 'Not Evaluated'}
                        </span>
                      </div>
                      <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                        <div
                          className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full"
                          style={{ width: `${((rep.scores?.communication_average ?? rep.scores?.communicationAverage ?? 0) / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive AI Narrative Synthesis */}
              <div className="p-8 sm:p-10 bg-[#FAF8F5]/80 dark:bg-[#16061D]/80">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-[0.25em] text-[#3A0F34] dark:text-[#EAAA00] font-bold">
                  <Bot className="h-4 w-4 text-[#EAAA00]" />
                  <span>Executive Qualitative Assessment</span>
                </div>
                <p className="text-sm text-[#222222] dark:text-slate-300 leading-relaxed font-sans max-w-4xl">
                  {rep.summary_narrative || rep.summaryNarrative}
                </p>
              </div>

              {/* Insights Triplet (Strengths, Gaps, Recommendations) */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
                {/* Strengths */}
                <div className="p-6 sm:p-8 flex flex-col bg-[#F8F6F1]/70 dark:bg-[#16061D]/60">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider mb-4">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3A0F34] dark:text-[#EAAA00]" />
                    <span>Demonstrated Strengths</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {(rep.strengths || []).length > 0 ? (
                      (rep.strengths || []).map((s, idx) => (
                        <div key={idx} className="p-3 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#120516] text-xs text-[#222222] dark:text-slate-300 flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00] shrink-0 mt-0.5" />
                          <span className="font-sans leading-relaxed">{s}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#7A7875] dark:text-slate-400 italic">No specific strengths recorded.</p>
                    )}
                  </div>
                </div>

                {/* Growth Areas */}
                <div className="p-6 sm:p-8 flex flex-col bg-[#F8F6F1]/70 dark:bg-[#16061D]/60">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider mb-4">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#EAAA00]" />
                    <span>Growth Areas & Gaps</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {(rep.improvement_areas || rep.improvementAreas || []).length > 0 ? (
                      (rep.improvement_areas || rep.improvementAreas || []).map((m, idx) => (
                        <div key={idx} className="p-3 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#120516] text-xs text-[#222222] dark:text-slate-300 flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-[#EAAA00] shrink-0 mt-0.5" />
                          <span className="font-sans leading-relaxed">{m}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#7A7875] dark:text-slate-400 italic">No significant conceptual gaps identified.</p>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-6 sm:p-8 flex flex-col bg-[#F8F6F1]/70 dark:bg-[#16061D]/60">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider mb-4">
                    <GraduationCap className="h-4 w-4 shrink-0 text-[#3A0F34] dark:text-[#EAAA00]" />
                    <span>Study Recommendations</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {(rep.study_recommendations || rep.studyRecommendations || []).length > 0 ? (
                      (rep.study_recommendations || rep.studyRecommendations || []).map((rec, idx) => (
                        <div key={idx} className="p-3 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#120516] text-xs text-[#222222] dark:text-slate-300 flex items-start gap-2">
                          <Lightbulb className="h-3.5 w-3.5 text-[#EAAA00] shrink-0 mt-0.5" />
                          <span className="font-sans leading-relaxed">{rec}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#7A7875] dark:text-slate-400 italic">No study recommendations available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Question Detailed Breakdown */}
              <div className="p-8 sm:p-10 bg-white dark:bg-[#16061D]">
                <div className="mb-6">
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-1">
                    CHALLENGE DRILLDOWN
                  </span>
                  <h3 className="font-didone text-2xl font-bold text-[#111111] dark:text-[#F8F6F1]">
                    Per-Question Detailed Analysis
                  </h3>
                </div>

                <div className="space-y-3">
                  {(rep.per_question_results || rep.perQuestionResults || []).map((pq) => {
                    const num = pq.question_number || pq.questionNumber;
                    const isExpanded = expandedQuestionNumber === num;
                    const qScore = pq.overall_score ?? pq.overallScore;

                    return (
                      <div key={num} className="border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#FAF8F5]/80 dark:bg-[#120516]">
                        {/* Accordion Header */}
                        <button
                          onClick={() => setExpandedQuestionNumber(isExpanded ? null : (num ?? 1))}
                          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-white dark:hover:bg-[#250C3D]/30 transition cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="px-2.5 py-1 bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs font-bold">
                              Q#{num}
                            </span>
                            <span className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">{pq.topic}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-white dark:bg-[#250C3D] text-[#7A7875] dark:text-slate-300 border border-[#E5DFD5] dark:border-[#3A0F34]">
                              {pq.difficulty}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {qScore != null ? (
                              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34] text-[#3A0F34] dark:text-[#EAAA00]">
                                Score: {qScore.toFixed(1)} / 10
                              </span>
                            ) : (
                              <span className="text-xs text-[#7A7875] dark:text-slate-400 italic font-mono">Unevaluated</span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-[#7A7875] dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[#7A7875] dark:text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="p-5 pt-0 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 space-y-5 animate-fadeIn">
                            {/* Question Prompt */}
                            <div className="mt-4">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-1">
                                Problem Statement
                              </span>
                              <p className="text-xs sm:text-sm text-[#222222] dark:text-slate-300 leading-relaxed p-4 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]/60 font-sans">
                                {pq.question_text || pq.questionText}
                              </p>
                            </div>

                            {/* Candidate Answer */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7875] dark:text-slate-400">
                                  Submitted Candidate Solution
                                </span>
                                {(pq.answer_text || pq.answerText) && (
                                  <span className="text-[10px] text-[#7A7875] dark:text-slate-400 font-mono">
                                    {(pq.answer_text || pq.answerText)!.length} characters
                                  </span>
                                )}
                              </div>
                              {(pq.answer_text || pq.answerText) ? (
                                <pre className="p-4 bg-[#111111] border border-[#111111] dark:border-[#3A0F34] font-mono text-xs text-[#FAF8F5] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                  <code>{pq.answer_text || pq.answerText}</code>
                                </pre>
                              ) : (
                                <p className="text-xs text-[#7A7875] dark:text-slate-400 italic p-3 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]/60">
                                  No answer submitted for this question.
                                </p>
                              )}
                            </div>

                            {/* Question Evaluation Details */}
                            {(pq.feedback || qScore != null) && (
                              <div className="p-4 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]/60 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#3A0F34] dark:text-[#EAAA00] flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
                                    Evaluation Critique
                                  </span>
                                  {qScore != null && (
                                    <span className="text-xs font-mono font-bold text-[#111111] dark:text-[#F8F6F1]">
                                      Overall: {qScore.toFixed(1)} / 10
                                    </span>
                                  )}
                                </div>

                                {pq.feedback && (
                                  <p className="text-xs text-[#333333] dark:text-slate-300 leading-relaxed font-sans">{pq.feedback}</p>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[11px] font-mono">
                                  <div className="p-2 bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]">
                                    <span className="text-[#7A7875] dark:text-slate-400 block text-[10px]">Correctness</span>
                                    <span className="font-bold text-[#111111] dark:text-[#F8F6F1]">{pq.correctness_score ?? pq.correctnessScore ?? '—'}/10</span>
                                  </div>
                                  <div className="p-2 bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]">
                                    <span className="text-[#7A7875] dark:text-slate-400 block text-[10px]">Tech Depth</span>
                                    <span className="font-bold text-[#111111] dark:text-[#F8F6F1]">{pq.technical_depth_score ?? pq.technicalDepthScore ?? '—'}/10</span>
                                  </div>
                                  <div className="p-2 bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]">
                                    <span className="text-[#7A7875] dark:text-slate-400 block text-[10px]">Edge Cases</span>
                                    <span className="font-bold text-[#111111] dark:text-[#F8F6F1]">{pq.edge_cases_score ?? pq.edgeCasesScore ?? '—'}/10</span>
                                  </div>
                                  <div className="p-2 bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]">
                                    <span className="text-[#7A7875] dark:text-slate-400 block text-[10px]">Communication</span>
                                    <span className="font-bold text-[#111111] dark:text-[#F8F6F1]">{pq.communication_score ?? pq.communicationScore ?? '—'}/10</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Follow-up Inquiries */}
                            {(pq.follow_ups || []).length > 0 && (
                              <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                                  <CornerDownRight className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00]" />
                                  Follow-up Inquiries ({(pq.follow_ups || []).length})
                                </span>
                                <div className="space-y-2.5">
                                  {(pq.follow_ups || []).map((fu) => (
                                    <div key={fu.id} className="p-3.5 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]/60 text-xs space-y-2">
                                      <div className="flex items-center gap-2 text-[#3A0F34] dark:text-[#EAAA00] font-semibold">
                                        <MessageSquare className="h-3.5 w-3.5 text-[#EAAA00]" />
                                        <span>Follow-up #{fu.follow_up_number || fu.followUpNumber}: {fu.question_text || fu.questionText}</span>
                                      </div>
                                      {(fu.candidate_answer || fu.candidateAnswer) ? (
                                        <div className="p-2.5 bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34] text-[#222222] dark:text-[#F8F6F1] font-mono text-[11px] whitespace-pre-wrap">
                                          {fu.candidate_answer || fu.candidateAnswer}
                                        </div>
                                      ) : (
                                        <span className="text-[#7A7875] dark:text-slate-400 italic block">Unanswered follow-up inquiry.</span>
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

              {/* Bottom Actions Bar */}
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF8F5]/60 dark:bg-[#120516]">
                <button
                  onClick={() => fetchReport(true)}
                  disabled={isRefreshing}
                  className="px-5 py-2.5 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#16061D] text-[#111111] dark:text-[#F8F6F1] text-xs font-mono font-semibold transition flex items-center gap-2 cursor-pointer hover:bg-[#FAF8F5] dark:hover:bg-[#250C3D] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00] ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Re-synthesize / Refresh Dossier</span>
                </button>

                <button
                  onClick={onEndSession}
                  id="return-landing-button"
                  className="w-full sm:w-auto px-7 py-3 font-mono font-bold text-xs uppercase tracking-wider bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] border border-[#3A0F34] dark:border-[#EAAA00] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Return to Studio Console</span>
                  <ArrowRight className="h-4 w-4 text-[#EAAA00] dark:text-[#120516]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative z-10 animate-fadeIn">
      <div className="editorial-frame border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
        {/* Session Top Datum Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-4 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/90 dark:bg-[#16061D]/90 backdrop-blur-xs gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onEndSession}
              className="inline-flex items-center gap-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] px-3 py-1.5 text-xs font-mono font-semibold text-[#111111] dark:text-[#F8F6F1] hover:bg-[#F0EDE6] dark:hover:bg-[#34114F] transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
              <span>Exit Interview</span>
            </button>

            <span className="text-[#E5DFD5] dark:text-[#3A0F34] hidden sm:inline">|</span>

            {/* Role & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-didone font-bold text-[#111111] dark:text-[#F8F6F1] text-base">
                {config?.role || 'Technical Interview'}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516]">
                {config?.difficulty || q?.difficulty || 'Senior'}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-white dark:bg-[#250C3D] text-[#111111] dark:text-[#F8F6F1] border border-[#E5DFD5] dark:border-[#3A0F34]">
                {config?.primaryLanguage || 'Python'}
              </span>
              <span className="font-mono text-xs text-[#7A7875] dark:text-slate-400 bg-white dark:bg-[#250C3D] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">
                {sessionId}
              </span>
            </div>
          </div>

          {/* Live Status & Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 border border-[#EAAA00]/40 bg-[#EAAA00]/15 text-[#8A6500] dark:text-[#EAAA00] text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EAAA00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EAAA00]"></span>
              </span>
              <span>LIVE ROUND • IN PROGRESS</span>
            </div>

            <div className="px-3 py-1 bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34] text-xs font-mono font-bold text-[#111111] dark:text-[#F8F6F1] tabular-nums">
              Question {qNum} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* Dynamic Progress Stepper Line */}
        <div className="w-full h-1 bg-[#E5DFD5] dark:bg-[#250C3D] overflow-hidden">
          <div
            className="h-full bg-[#3A0F34] dark:bg-[#EAAA00] transition-all duration-700"
            style={{ width: `${Math.min(100, (qNum / totalQuestions) * 100)}%` }}
          />
        </div>

        {/* Main Grid: Problem Statement & Candidate Solution Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
          {/* Left Column: Problem Statement & Architecture Requirements */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col gap-6 bg-[#F8F6F1]/70 dark:bg-[#120516]">
            {/* Question Specimen Block */}
            <div className="relative">
              <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.25em] text-[#3A0F34] dark:text-[#EAAA00] uppercase mb-2">
                <Cpu className="h-3.5 w-3.5 text-[#EAAA00]" />
                <span>CHALLENGE SPECIMEN • QUESTION {qNum} OF {totalQuestions}</span>
              </div>

              <h2 className="font-didone text-2xl sm:text-4xl font-bold text-[#111111] dark:text-[#F8F6F1] mb-6 leading-tight">
                {q?.topic || 'Distributed Systems & Concurrency'}
              </h2>

              {/* Problem Statement Box */}
              <div className="p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] text-[#222222] dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line font-sans mb-6">
                {q?.question_text || q?.questionText}
              </div>

              {/* Expected Core Concepts */}
              {expectedConcepts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono tracking-[0.25em] font-semibold text-[#7A7875] dark:text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Layers className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00]" />
                    <span>Architectural Concepts to Address</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {expectedConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-white dark:bg-[#16061D] text-[#111111] dark:text-[#F8F6F1] border border-[#E5DFD5] dark:border-[#3A0F34]"
                      >
                        <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00]" />
                        <span>{concept}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Safety & Evaluation Notice */}
            <div className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5] dark:bg-[#16061D] text-xs text-[#555555] dark:text-slate-300 flex items-start gap-3 mt-auto">
              <ShieldCheck className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Non-Execution Safety Policy: </span>
                <span>Candidate code is evaluated via static AST semantic analysis. No server execution is performed.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Starter Code, Candidate Workspace, Evaluation & Follow-ups */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col gap-6 bg-[#FAF8F5]/80 dark:bg-[#140718]">
            {/* Starter Code Block */}
            {starterCode ? (
              <div className="border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#16061D] border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#111111] dark:text-[#F8F6F1]">
                    <Terminal className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                    <span>Starter Stub • {config?.primaryLanguage || 'Code'}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#250C3D] hover:bg-[#FAF8F5] dark:hover:bg-[#34114F] text-[11px] font-mono font-semibold text-[#111111] dark:text-[#F8F6F1] border border-[#E5DFD5] dark:border-[#3A0F34] transition cursor-pointer"
                    title="Copy starter code to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00]" />
                        <span className="text-[#3A0F34] dark:text-[#EAAA00]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-[#111111] overflow-x-auto max-h-56">
                  <pre className="font-mono text-xs text-[#FAF8F5] leading-relaxed">
                    <code>{starterCode}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] text-center text-xs text-[#7A7875] dark:text-slate-400 font-mono">
                <Code2 className="h-5 w-5 text-[#7A7875] dark:text-slate-400 mx-auto mb-1.5" />
                <span>Conceptual System Design Challenge (No code stub required).</span>
              </div>
            )}

            {/* Candidate Primary Answer Workspace */}
            <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] flex flex-col gap-4">
              <div className="editorial-crosshair -top-2 -right-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00]" />
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Candidate Solution</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF8F5] dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34] text-[#3A0F34] dark:text-[#EAAA00] font-semibold">
                  Q#{qNum} of {totalQuestions}
                </span>
              </div>

              <p className="text-xs text-[#666666] dark:text-slate-300 leading-relaxed font-sans">
                Formulate your architectural approach, complexity trade-offs, and code solution below:
              </p>

              <form onSubmit={handleSubmitAnswer} className="flex flex-col gap-3">
                <textarea
                  id="candidate-answer-textarea"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  disabled={isSubmitting || isEvaluating}
                  placeholder="Explain your approach, design considerations, trade-offs, and paste or type your code solution..."
                  rows={8}
                  className="w-full rounded-none border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#120516] p-4 font-mono text-xs sm:text-sm text-[#111111] dark:text-[#F8F6F1] placeholder-[#8A8782] dark:placeholder:text-slate-500 focus:border-[#3A0F34] dark:focus:border-[#EAAA00] focus:outline-none transition disabled:opacity-50 min-h-[160px]"
                />

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-mono text-xs text-[#7A7875] dark:text-slate-400">
                    {answerText.length} characters
                  </span>

                  <button
                    type="submit"
                    id="submit-answer-button"
                    disabled={isSubmitting || !isAnswerValid || isEvaluating}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-bold transition cursor-pointer ${
                      isSubmitting || !isAnswerValid || isEvaluating
                        ? 'bg-[#E5DFD5] dark:bg-[#250C3D] text-[#7A7875] dark:text-slate-500 cursor-not-allowed border border-[#E5DFD5] dark:border-[#3A0F34]'
                        : 'bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] border border-[#3A0F34] dark:border-[#EAAA00]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white dark:text-[#120516]" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />
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
                  className="p-3 border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-fadeIn"
                >
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Submission Error</p>
                    <p className="font-sans leading-relaxed">{submissionState.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Success Feedback & Evaluation Trigger */}
              {submissionState.status === 'submitted' && submissionState.response && (
                <div
                  id="answer-success-banner"
                  className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#120516] text-xs text-[#222222] dark:text-[#F8F6F1] flex flex-col gap-3 animate-fadeIn"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Answer Persisted to PostgreSQL</p>
                        <span className="font-mono text-[10px] text-[#7A7875] dark:text-slate-400">
                          ID: {submissionState.response.answer_id || submissionState.response.answerId}
                        </span>
                      </div>
                      <p className="text-[#555555] dark:text-slate-300 font-sans">
                        {submissionState.response.message || 'Solution recorded successfully.'}
                      </p>
                    </div>
                  </div>

                  {/* AI Evaluation Trigger Bar */}
                  <div className="pt-2 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-[#555555] dark:text-slate-300 font-sans">
                      Ready for 4D rubric evaluation.
                    </span>

                    <button
                      type="button"
                      id="request-evaluation-button"
                      onClick={handleRequestEvaluation}
                      disabled={isEvaluating}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold transition cursor-pointer ${
                        isEvaluating
                          ? 'bg-[#E5DFD5] dark:bg-[#250C3D] text-[#7A7875] dark:text-slate-500 cursor-not-allowed border border-[#E5DFD5] dark:border-[#3A0F34]'
                          : 'bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] border border-[#3A0F34] dark:border-[#EAAA00]'
                      }`}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white dark:text-[#120516]" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />
                          <span>Request AI Evaluation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Evaluation Scorecard Card */}
              {evaluationState.status === 'evaluated' && evalData && (
                <div
                  id="evaluation-report-card"
                  className="p-5 border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#120516] flex flex-col gap-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
                    <div>
                      <h4 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Evaluation Scorecard</h4>
                      <p className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400">Weighted 4D Rubric Assessment</p>
                    </div>
                    <div className="font-didone text-2xl font-bold text-[#3A0F34] dark:text-[#EAAA00]">
                      {evalData.overall_score || evalData.overallScore} / 10
                    </div>
                  </div>

                  {/* Dimension breakdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#111111] dark:text-[#F8F6F1]">Correctness (40%)</span>
                        <span className="font-bold text-[#3A0F34] dark:text-[#EAAA00]">{evalData.scores.correctness}/10</span>
                      </div>
                      <div className="h-1 bg-[#E5DFD5] dark:bg-[#250C3D]">
                        <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00]" style={{ width: `${Math.min(100, evalData.scores.correctness * 10)}%` }} />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#111111] dark:text-[#F8F6F1]">Depth (25%)</span>
                        <span className="font-bold text-[#3A0F34] dark:text-[#EAAA00]">{evalData.scores.technical_depth ?? evalData.scores.technicalDepth}/10</span>
                      </div>
                      <div className="h-1 bg-[#E5DFD5] dark:bg-[#250C3D]">
                        <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00]" style={{ width: `${Math.min(100, (evalData.scores.technical_depth ?? evalData.scores.technicalDepth ?? 0) * 10)}%` }} />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#111111] dark:text-[#F8F6F1]">Edge Cases (20%)</span>
                        <span className="font-bold text-[#3A0F34] dark:text-[#EAAA00]">{evalData.scores.edge_cases ?? evalData.scores.edgeCases}/10</span>
                      </div>
                      <div className="h-1 bg-[#E5DFD5] dark:bg-[#250C3D]">
                        <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00]" style={{ width: `${Math.min(100, (evalData.scores.edge_cases ?? evalData.scores.edgeCases ?? 0) * 10)}%` }} />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#111111] dark:text-[#F8F6F1]">Clarity (15%)</span>
                        <span className="font-bold text-[#3A0F34] dark:text-[#EAAA00]">{evalData.scores.communication}/10</span>
                      </div>
                      <div className="h-1 bg-[#E5DFD5] dark:bg-[#250C3D]">
                        <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00]" style={{ width: `${Math.min(100, evalData.scores.communication * 10)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Feedback summary */}
                  <div className="p-3 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34] text-xs font-sans text-[#333333] dark:text-slate-300 leading-relaxed">
                    {evalData.feedback}
                  </div>
                </div>
              )}
            </div>

            {/* Adaptive Follow-up Section */}
            <div
              id="follow-up-section"
              className="p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] flex flex-col gap-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00]" />
                  <h3 className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">
                    Adaptive Follow-up Inquiries ({followUpCount}/2)
                  </h3>
                </div>
                {isMaxFollowUpsReached && (
                  <span className="text-[10px] font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-[#3A0F34]/10 dark:bg-[#EAAA00]/20 px-2 py-0.5 border border-[#3A0F34]/20 dark:border-[#EAAA00]/40">
                    Max Reached
                  </span>
                )}
              </div>

              {followUpError && (
                <div className="p-3 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-mono">
                  {followUpError}
                </div>
              )}

              {/* Thread of follow-up questions */}
              {followUps.map((fu, idx) => {
                const fuNum = fu.follow_up_number || fu.followUpNumber || idx + 1;
                const isAnswered = Boolean(fu.candidate_answer || fu.candidateAnswer);
                const isSubmittingThis = submittingFollowUpId === fu.id;
                const currentAnswerInput = followUpInputs[fu.id] || '';
                const hasInput = currentAnswerInput.trim().length > 0;

                return (
                  <div key={fu.id} className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#FAF8F5] dark:bg-[#120516] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00]">
                        Follow-up #{fuNum}
                      </span>
                      {isAnswered ? (
                        <span className="text-[10px] font-mono text-[#3A0F34] dark:text-[#EAAA00]">✓ Answer Recorded</span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#EAAA00]">Response Required</span>
                      )}
                    </div>

                    <p className="text-xs font-sans text-[#222222] dark:text-slate-300 leading-relaxed">
                      {fu.question_text || fu.questionText}
                    </p>

                    {isAnswered ? (
                      <div className="p-3 bg-white dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34] font-mono text-xs text-[#111111] dark:text-[#F8F6F1] whitespace-pre-wrap">
                        {fu.candidate_answer || fu.candidateAnswer}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={currentAnswerInput}
                          onChange={(e) => setFollowUpInputs({ ...followUpInputs, [fu.id]: e.target.value })}
                          disabled={isSubmittingThis}
                          placeholder="Address follow-up inquiry..."
                          className="w-full border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#16061D] p-3 font-mono text-xs text-[#111111] dark:text-[#F8F6F1] placeholder-[#8A8782] dark:placeholder:text-slate-500 focus:border-[#3A0F34] dark:focus:border-[#EAAA00] focus:outline-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitFollowUpAnswer(fu.id)}
                            disabled={isSubmittingThis || !hasInput}
                            className="px-4 py-2 bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs uppercase font-bold hover:bg-[#2A0B26] dark:hover:bg-[#D49800] transition disabled:opacity-50 cursor-pointer"
                          >
                            {isSubmittingThis ? 'Submitting...' : 'Submit Follow-up'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Request Follow-Up Action Bar */}
              {hasPrimaryAnswer && !isMaxFollowUpsReached && (
                <div className="pt-2 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 flex items-center justify-between">
                  <span className="text-xs text-[#666666] dark:text-slate-300 font-sans">
                    {followUpCount === 0 ? 'Request an adaptive inquiry.' : 'Request second follow-up.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestFollowUp}
                    disabled={!canRequestFollowUp}
                    className="px-4 py-2 border border-[#3A0F34] dark:border-[#EAAA00] bg-white dark:bg-[#250C3D] text-[#3A0F34] dark:text-[#EAAA00] font-mono text-xs uppercase font-bold hover:bg-[#FAF8F5] dark:hover:bg-[#34114F] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingFollowUp ? 'Generating...' : `Request Follow-up (${followUpCount + 1}/2)`}
                  </button>
                </div>
              )}
            </div>

            {/* Question Progression Station */}
            <div
              id="question-progression-card"
              className="p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">Progression State</h4>
                  <p className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                    {isFinalQuestion ? 'Final Challenge' : `Next: Question #${qNum + 1}`}
                  </p>
                </div>
                <span className="font-mono text-xs text-[#3A0F34] dark:text-[#EAAA00] font-bold">
                  {Math.round((qNum / totalQuestions) * 100)}% Complete
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="advance-question-button"
                  onClick={handleAdvanceQuestion}
                  disabled={!canAdvance}
                  className={`w-full py-3.5 font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    !canAdvance
                      ? 'bg-[#E5DFD5] dark:bg-[#250C3D] text-[#7A7875] dark:text-slate-500 cursor-not-allowed border border-[#E5DFD5] dark:border-[#3A0F34]'
                      : 'bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] border border-[#3A0F34] dark:border-[#EAAA00]'
                  }`}
                >
                  {progressionState.status === 'advancing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white dark:text-[#120516]" />
                      <span>{isFinalQuestion ? 'Finalizing Session...' : 'Generating Next Challenge...'}</span>
                    </>
                  ) : isFinalQuestion ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#EAAA00] dark:text-[#120516]" />
                      <span>Complete & Synthesize Dossier ✓</span>
                    </>
                  ) : (
                    <>
                      <span>Advance to Challenge #{qNum + 1}</span>
                      <ArrowRight className="h-4 w-4 text-[#EAAA00] dark:text-[#120516]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
