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
import { apiFetch } from '../utils/api';

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

      const response = await apiFetch(endpoint, {
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
        let detailMsg = `HTTP error ${response.status}: Failed to save configuration.`;
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
            ? 'Unable to connect to the backend server. Please verify that the FastAPI backend is running.'
            : err instanceof Error
            ? err.message
            : 'Connection to backend failed.',
      });
    }
  };

  const handleReset = () => {
    setSubmission({ status: 'idle' });
    setLaunchState({ status: 'idle' });
    setValidationError(null);
  };

  const handleLaunchSession = async () => {
    const sessionId = submission.sessionData?.sessionId;
    if (!sessionId) {
      setLaunchState({
        status: 'error',
        errorMessage: 'Cannot launch session: Session ID is missing.',
      });
      return;
    }

    setLaunchState({ status: 'starting' });

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const endpoint = `${apiBase}/api/v1/interviews/${sessionId}/start`;

      const response = await apiFetch(endpoint, {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111111]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#16061D] p-6 shadow-2xl sm:p-8 text-[#111111] dark:text-[#F8F6F1]">
        <div className="editorial-crosshair -top-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -top-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -bottom-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -bottom-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#3A0F34] dark:bg-[#250C3D] text-white">
              <Sliders className="h-4 w-4 text-[#EAAA00]" />
            </div>
            <div>
              <h3 id="modal-title" className="font-didone text-xl font-bold text-[#111111] dark:text-[#F8F6F1]">
                Interview Configuration
              </h3>
              <p className="text-xs text-[#7A7875] dark:text-slate-400 font-mono">Calibrated Assessment Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] text-[#7A7875] dark:text-slate-400 hover:bg-white dark:hover:bg-[#250C3D] hover:text-[#111111] dark:hover:text-[#F8F6F1] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Session Notice */}
        <div className="mt-4 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#120516] p-3.5 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] shrink-0 mt-0.5" />
            <div className="text-xs text-[#555555] dark:text-slate-300 space-y-0.5 font-sans leading-relaxed">
              <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Dynamic Assessment Engine: </span>
              <span>
                Challenges and adaptive follow-up drill-downs will be calibrated to your selected role and seniority level.
              </span>
            </div>
          </div>
        </div>

        {/* Validation or Submission Errors */}
        {(validationError || submission.status === 'error') && (
          <div
            role="alert"
            className="mt-4 border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/60 p-3.5 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-mono">
              <span className="font-semibold">Validation Error: </span>
              <span>{validationError || submission.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Confirmation Card */}
        {submission.status === 'success' && submission.sessionData && (
          <div className="mt-5 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#3A0F34] dark:text-[#EAAA00] shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#3A0F34] dark:text-[#EAAA00] text-sm">
                    Configuration Verified & Saved
                  </p>
                  <span className="font-mono text-[11px] bg-[#FAF8F5] dark:bg-[#250C3D] px-2 py-0.5 text-[#111111] dark:text-[#F8F6F1] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    {submission.sessionData.sessionId}
                  </span>
                </div>
                <p className="mt-1 text-[#555555] dark:text-slate-300">
                  {submission.sessionData.message}
                </p>

                <div className="mt-3 bg-[#FAF8F5] dark:bg-[#250C3D]/50 p-3 border border-[#E5DFD5] dark:border-[#3A0F34] grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-[#7A7875] dark:text-slate-400">Role:</span>{' '}
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">{submission.sessionData.config.role}</span>
                  </div>
                  <div>
                    <span className="text-[#7A7875] dark:text-slate-400">Seniority:</span>{' '}
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">{submission.sessionData.config.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-[#7A7875] dark:text-slate-400">Language:</span>{' '}
                    <span className="font-semibold text-[#3A0F34] dark:text-[#EAAA00]">{submission.sessionData.config.primaryLanguage}</span>
                  </div>
                  <div>
                    <span className="text-[#7A7875] dark:text-slate-400">Question Count:</span>{' '}
                    <span className="font-semibold text-[#3A0F34] dark:text-[#EAAA00]">{submission.sessionData.config.questionCount} Questions</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50">
                  <span className="text-[11px] text-[#7A7875] dark:text-slate-400">
                    Parameters verified. Ready to launch interview.
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#3A0F34] dark:text-[#EAAA00] hover:underline transition-colors cursor-pointer"
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
            <label htmlFor="role-select" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400">
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
              className="mt-1.5 w-full border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] px-3.5 py-2.5 text-sm text-[#111111] dark:text-[#F8F6F1] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] disabled:opacity-50 font-sans"
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
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400 mb-1.5">
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
                  className={`py-2 text-xs font-mono font-medium transition cursor-pointer disabled:opacity-50 ${
                    config.difficulty === level
                      ? 'border border-[#3A0F34] bg-[#3A0F34] text-white dark:border-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516] font-bold'
                      : 'border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#555555] dark:text-slate-300 hover:bg-[#F0EDE6] dark:hover:bg-[#250C3D] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
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
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400">
                Primary Coding Language
              </label>
              <span className="flex items-center gap-1 text-[11px] font-mono text-[#3A0F34] dark:text-[#EAAA00]">
                <ShieldCheck className="h-3 w-3 text-[#EAAA00]" /> Static Review Only (No Exec)
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
                  className={`py-2 text-xs font-mono font-medium transition cursor-pointer disabled:opacity-50 ${
                    config.primaryLanguage === lang
                      ? 'border border-[#3A0F34] bg-[#3A0F34] text-white dark:border-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516] font-bold'
                      : 'border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#555555] dark:text-slate-300 hover:bg-[#F0EDE6] dark:hover:bg-[#250C3D] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
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
              <label htmlFor="question-range" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#7A7875] dark:text-slate-400">
                Question Count (Configurable 3–10)
              </label>
              <span className="text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00] font-mono tabular-nums">
                {config.questionCount} Questions {config.questionCount === 5 ? '(Standard)' : ''}
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
              className="mt-2 w-full accent-[#3A0F34] dark:accent-[#EAAA00] cursor-pointer disabled:opacity-50"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[#7A7875] dark:text-slate-400 font-mono tabular-nums">
              <span>Min: 3</span>
              <span>Standard: 5</span>
              <span>Max: 10</span>
            </div>
          </div>

          {/* Launch Error Alert */}
          {launchState.status === 'error' && (
            <div className="mt-4 flex items-start gap-2.5 border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/60 p-3.5 text-xs text-rose-800 dark:text-rose-200 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-900 dark:text-rose-300">Session Launch Error:</span>{' '}
                <span>{launchState.errorMessage}</span>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submission.status === 'submitting' || launchState.status === 'starting'}
              className="w-full sm:w-auto border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] px-4 py-2 text-xs font-mono font-medium text-[#111111] dark:text-[#F8F6F1] hover:bg-[#F0EDE6] dark:hover:bg-[#250C3D] transition disabled:opacity-50 uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end font-mono">
              {/* Submit to Backend Button */}
              <button
                type="submit"
                disabled={submission.status === 'submitting' || launchState.status === 'starting'}
                className="inline-flex items-center justify-center gap-1.5 bg-[#3A0F34] dark:bg-[#250C3D] border border-[#3A0F34] dark:border-[#EAAA00] px-4 py-2 text-xs font-bold text-white dark:text-[#F8F6F1] shadow-xs hover:bg-[#2A0B26] dark:hover:bg-[#34114F] transition disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {submission.status === 'submitting' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EAAA00]" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
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
                  className="inline-flex items-center justify-center gap-1.5 bg-[#3A0F34] dark:bg-[#EAAA00] border border-[#3A0F34] dark:border-[#EAAA00] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] px-4 py-2 text-xs font-bold text-white dark:text-[#120516] shadow-xs transition disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                  title="Launch verified interview session and generate Question 1."
                >
                  {launchState.status === 'starting' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Q1...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516] fill-current" />
                      <span>Launch Session</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#120516] px-4 py-2 text-xs font-semibold text-[#7A7875] dark:text-slate-500 cursor-not-allowed border border-[#E5DFD5] dark:border-[#3A0F34] uppercase tracking-wider"
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
