import React, { useState } from 'react';
import {
  X,
  Sliders,
  Info,
  ShieldCheck,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type {
  InterviewConfig,
  SubmissionState,
  StartedSessionData,
  LaunchSessionState,
} from '../types';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (sessionData: SubmissionState['sessionData']) => void;
  onSessionStarted?: (startedSession: StartedSessionData) => void;
}

export const InterviewSetupModal: React.FC<InterviewSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  onSessionStarted,
}) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Backend Engineer (Distributed Systems)',
    difficulty: 'Senior',
    primaryLanguage: 'Python',
    questionCount: 5,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });
  const [launchState, setLaunchState] = useState<LaunchSessionState>({ status: 'idle' });

  if (!isOpen) return null;

  const validateConfig = (): boolean => {
    if (!config.role.trim() || config.role.trim().length < 2) {
      setValidationError('Please select or specify a valid engineering role (minimum 2 characters).');
      return false;
    }
    if (!['Junior', 'Mid', 'Senior', 'Staff'].includes(config.difficulty)) {
      setValidationError('Invalid seniority level selected.');
      return false;
    }
    if (!['Python', 'Java', 'SQL'].includes(config.primaryLanguage)) {
      setValidationError('Invalid coding language selected.');
      return false;
    }
    if (config.questionCount < 3 || config.questionCount > 10) {
      setValidationError('Question count must be between 3 and 10.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateConfig()) return;

    setSubmission({ status: 'submitting' });

    try {
      const payload = {
        role: config.role.trim(),
        difficulty: config.difficulty,
        primaryLanguage: config.primaryLanguage,
        questionCount: config.questionCount,
      };

      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/config`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const sessionData = {
          status: data.status || 'configured',
          sessionId: data.session_id || data.sessionId,
          config: data.config,
          message: data.message || 'Interview configuration validated successfully.',
          createdAt: data.created_at || data.createdAt,
        };

        setSubmission({
          status: 'success',
          sessionData,
        });

        if (onConfigSaved) {
          onConfigSaved(sessionData);
        }
      } else {
        const errorData = await response.json().catch(() => null);
        const detailMsg = errorData?.detail
          ? typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail)
          : `HTTP error ${response.status}: Failed to register configuration.`;

        setSubmission({
          status: 'error',
          errorMessage: detailMsg,
        });
      }
    } catch (err: unknown) {
      setSubmission({
        status: 'error',
        errorMessage:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'Unable to connect to the backend server. Please verify that both the FastAPI backend (uvicorn) and Vite development server are running.'
            : err instanceof Error
            ? err.message
            : 'Unable to connect to FastAPI backend server.',
      });
    }
  };

  const handleReset = () => {
    setSubmission({ status: 'idle' });
    setLaunchState({ status: 'idle' });
    setValidationError(null);
  };

  const handleLaunchSession = async () => {
    const sessionId = submission.sessionData?.sessionId || submission.sessionData?.session_id;
    if (!sessionId) {
      setLaunchState({
        status: 'error',
        errorMessage: 'Cannot launch session: No validated session ID found. Please validate configuration first.',
      });
      return;
    }

    setLaunchState({ status: 'starting' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/start`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const startedData: StartedSessionData = {
          status: data.status || 'in_progress',
          session_id: data.session_id || data.sessionId,
          sessionId: data.session_id || data.sessionId,
          current_question: data.current_question || data.currentQuestion,
          currentQuestion: data.current_question || data.currentQuestion,
          message: data.message || 'Interview session started successfully.',
          started_at: data.started_at || data.startedAt || new Date().toISOString(),
          config: submission.sessionData?.config || config,
        };

        setLaunchState({ status: 'started', startedSession: startedData });
        if (onSessionStarted) {
          onSessionStarted(startedData);
        }
        onClose();
      } else {
        const errorData = await response.json().catch(() => null);
        const detailMsg = errorData?.detail
          ? typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail)
          : `HTTP error ${response.status}: Failed to launch interview session.`;

        setLaunchState({
          status: 'error',
          errorMessage: detailMsg,
        });
      }
    } catch (err: unknown) {
      setLaunchState({
        status: 'error',
        errorMessage:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
            : err instanceof Error
            ? err.message
            : 'Unable to connect to FastAPI backend server.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-white">
                Interview Configuration
              </h3>
              <p className="text-xs text-slate-400">Milestone 2 — Backend Validated Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Milestone Boundary Notice */}
        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3.5">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-0.5">
              <span className="font-semibold text-white">Milestone 2 Scope: </span>
              <span>
                Configuration is sent to and validated by the FastAPI backend (`POST /api/v1/interviews/config`). Live Gemini question streaming is deferred to Milestone 3.
              </span>
            </div>
          </div>
        </div>

        {/* Validation or Submission Errors */}
        {(validationError || submission.status === 'error') && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-rose-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Validation Error: </span>
              <span>{validationError || submission.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Confirmation Card */}
        {submission.status === 'success' && submission.sessionData && (
          <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-300 text-sm">
                    Configuration Verified & Saved
                  </p>
                  <span className="font-mono text-[11px] rounded bg-emerald-900/60 px-2 py-0.5 text-emerald-200 border border-emerald-700/50">
                    {submission.sessionData.sessionId}
                  </span>
                </div>
                <p className="mt-1 text-slate-300">
                  {submission.sessionData.message}
                </p>

                <div className="mt-3 rounded-lg bg-slate-900/80 p-3 border border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Role:</span>{' '}
                    <span className="font-semibold text-white">{submission.sessionData.config.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Seniority:</span>{' '}
                    <span className="font-semibold text-white">{submission.sessionData.config.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Language:</span>{' '}
                    <span className="font-semibold text-cyan-300">{submission.sessionData.config.primaryLanguage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Question Count:</span>{' '}
                    <span className="font-semibold text-indigo-300">{submission.sessionData.config.questionCount} Questions</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-500/20">
                  <span className="text-[11px] text-slate-400">
                    Ready for Milestone 3 session start.
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Change Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form Controls */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Target Engineering Role */}
          <div>
            <label htmlFor="role-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Target Engineering Role
            </label>
            <select
              id="role-select"
              value={config.role}
              disabled={submission.status === 'submitting'}
              onChange={(e) => {
                setConfig({ ...config, role: e.target.value });
                if (validationError) setValidationError(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="Backend Engineer (Distributed Systems)">
                Backend Engineer (Distributed Systems)
              </option>
              <option value="Systems Infrastructure & Reliability">
                Systems Infrastructure & Reliability
              </option>
              <option value="Full-Stack Web Architect">
                Full-Stack Web Architect
              </option>
              <option value="Data & Analytics Pipeline Engineer">
                Data & Analytics Pipeline Engineer
              </option>
            </select>
          </div>

          {/* Seniority Level */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Seniority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Junior', 'Mid', 'Senior', 'Staff'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={submission.status === 'submitting'}
                  onClick={() => {
                    setConfig({ ...config, difficulty: level });
                    if (validationError) setValidationError(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-medium transition disabled:opacity-50 ${
                    config.difficulty === level
                      ? 'border border-indigo-500 bg-indigo-600/25 text-indigo-300 font-bold shadow-sm'
                      : 'border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Coding Language */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Primary Coding Language
              </label>
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <ShieldCheck className="h-3 w-3" /> Static Review Only (No Exec)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Python', 'Java', 'SQL'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  disabled={submission.status === 'submitting'}
                  onClick={() => {
                    setConfig({ ...config, primaryLanguage: lang });
                    if (validationError) setValidationError(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-medium transition disabled:opacity-50 ${
                    config.primaryLanguage === lang
                      ? 'border border-cyan-500 bg-cyan-600/25 text-cyan-300 font-bold shadow-sm'
                      : 'border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Questions Slider (3-10, default 5) */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="question-range" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Question Count (Configurable 3–10)
              </label>
              <span className="text-xs font-bold text-indigo-400 font-mono tabular-nums">
                {config.questionCount} Questions {config.questionCount === 5 ? '(SRS Default)' : ''}
              </span>
            </div>
            <input
              id="question-range"
              type="range"
              min="3"
              max="10"
              step="1"
              disabled={submission.status === 'submitting'}
              value={config.questionCount}
              onChange={(e) => {
                setConfig({ ...config, questionCount: Number(e.target.value) });
                if (validationError) setValidationError(null);
              }}
              className="mt-2 w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
              <span>Min: 3</span>
              <span>SRS Default: 5</span>
              <span>Max: 10</span>
            </div>
          </div>

          {/* Launch Error Alert */}
          {launchState.status === 'error' && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Session Launch Error:</span>{' '}
                <span>{launchState.errorMessage}</span>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submission.status === 'submitting' || launchState.status === 'starting'}
              className="w-full sm:w-auto rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            >
              Close
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Submit to Backend Button */}
              <button
                type="submit"
                disabled={submission.status === 'submitting' || launchState.status === 'starting'}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {submission.status === 'submitting' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Save & Validate Config</span>
                  </>
                )}
              </button>

              {/* Connected Launch Button */}
              {submission.status === 'success' && submission.sessionData?.sessionId ? (
                <button
                  type="button"
                  onClick={handleLaunchSession}
                  disabled={launchState.status === 'starting'}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50"
                  title="Launch verified interview session and generate Question 1."
                >
                  {launchState.status === 'starting' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Q1...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Launch Session</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed border border-slate-700/50"
                  title="Validate and save configuration first to enable session launch."
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Launch Session (Validate First)</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
