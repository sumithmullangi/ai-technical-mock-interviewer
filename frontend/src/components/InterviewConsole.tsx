import React, { useState } from 'react';
import {
  Play,
  Sliders,
  ShieldCheck,
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type {
  InterviewConfig,
  ConfiguredSession,
  StartedSessionData,
} from '../types';

interface InterviewConsoleProps {
  onStartSession: (session: StartedSessionData) => void;
  onConfigSaved: (session: ConfiguredSession) => void;
  onOpenSetupModal: () => void;
  onNavigateTab: (tab: 'rubric' | 'workflow' | 'sample-report' | 'architecture') => void;
  healthOk: boolean;
}

const PRESET_ROLES = [
  'Backend Engineer (Distributed Systems)',
  'Systems Infrastructure & Reliability',
  'Full-Stack Web Architect',
  'Data & Analytics Pipeline Engineer',
] as const;

export const InterviewConsole: React.FC<InterviewConsoleProps> = ({
  onStartSession,
  onConfigSaved,
  onOpenSetupModal,
  onNavigateTab,
  healthOk,
}) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Backend Engineer (Distributed Systems)',
    difficulty: 'Senior',
    primaryLanguage: 'Python',
    questionCount: 5,
  });

  const [launchStage, setLaunchStage] = useState<'idle' | 'validating' | 'starting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume Existing Session state
  const [resumeId, setResumeId] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const handleLaunch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setLaunchStage('validating');

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      // Step 1: Validate and register configuration
      const configRes = await fetch(`${apiBase}/api/v1/interviews/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: config.role.trim(),
          difficulty: config.difficulty,
          primaryLanguage: config.primaryLanguage,
          questionCount: config.questionCount,
        }),
      });

      if (!configRes.ok) {
        const errJson = await configRes.json().catch(() => null);
        const detail = errJson?.detail
          ? typeof errJson.detail === 'string'
            ? errJson.detail
            : JSON.stringify(errJson.detail)
          : `Configuration error (HTTP ${configRes.status})`;
        setErrorMessage(detail);
        setLaunchStage('error');
        return;
      }

      const configData = await configRes.json();
      const sid = configData.session_id || configData.sessionId;

      const savedSession: ConfiguredSession = {
        status: configData.status || 'configured',
        sessionId: sid,
        session_id: sid,
        config: configData.config || config,
        message: configData.message || 'Configuration validated.',
        createdAt: configData.created_at || configData.createdAt,
      };

      onConfigSaved(savedSession);

      // Step 2: Launch session and obtain Question 1
      setLaunchStage('starting');

      const startRes = await fetch(`${apiBase}/api/v1/interviews/${sid}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!startRes.ok) {
        const errJson = await startRes.json().catch(() => null);
        const detail = errJson?.detail
          ? typeof errJson.detail === 'string'
            ? errJson.detail
            : JSON.stringify(errJson.detail)
          : `Launch error (HTTP ${startRes.status})`;
        setErrorMessage(detail);
        setLaunchStage('error');
        return;
      }

      const startData = await startRes.json();
      const startedSession: StartedSessionData = {
        status: startData.status || 'in_progress',
        session_id: sid,
        sessionId: sid,
        current_question: startData.current_question || startData.currentQuestion,
        currentQuestion: startData.current_question || startData.currentQuestion,
        message: startData.message || 'Session started.',
        started_at: startData.started_at || startData.startedAt || new Date().toISOString(),
        config: configData.config || config,
      };

      setLaunchStage('idle');
      onStartSession(startedSession);
    } catch (err) {
      setLaunchStage('error');
      setErrorMessage(
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Unable to reach the FastAPI backend server (http://127.0.0.1:8000). Please check if uvicorn is running.'
          : err instanceof Error
          ? err.message
          : 'Failed to start interview.'
      );
    }
  };

  const handleResume = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = resumeId.trim();
    if (!cleanId) {
      setResumeError('Please enter a valid session UUID.');
      return;
    }

    setResumeError(null);
    setResumeLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const res = await fetch(`${apiBase}/api/v1/interviews/${cleanId}`);

      if (!res.ok) {
        if (res.status === 404) {
          setResumeError(`Session "${cleanId}" not found in database.`);
        } else {
          setResumeError(`Failed to load session (HTTP ${res.status}).`);
        }
        setResumeLoading(false);
        return;
      }

      const data = await res.json();
      const sid = data.sessionId || data.session_id || cleanId;

      // If session is configured but not started, we start it
      if (data.status === 'configured') {
        const startRes = await fetch(`${apiBase}/api/v1/interviews/${sid}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (startRes.ok) {
          const startData = await startRes.json();
          onStartSession({
            status: 'in_progress',
            session_id: sid,
            sessionId: sid,
            current_question: startData.current_question || startData.currentQuestion,
            currentQuestion: startData.current_question || startData.currentQuestion,
            message: startData.message || 'Resumed session.',
            started_at: startData.started_at || new Date().toISOString(),
            config: data.config,
          });
          setResumeLoading(false);
          return;
        }
      }

      // If already in_progress or completed
      onStartSession({
        status: data.status,
        session_id: sid,
        sessionId: sid,
        current_question: {
          question_number: 1,
          topic: 'Technical Interview',
          difficulty: data.config?.difficulty || 'Senior',
          question_text: 'Technical interview session resumed.',
          expected_concepts: [],
        },
        message: data.message || 'Session loaded successfully.',
        started_at: data.createdAt || data.created_at || new Date().toISOString(),
        config: data.config,
      });

      setResumeLoading(false);
    } catch (err) {
      setResumeLoading(false);
      setResumeError(
        err instanceof Error ? err.message : 'Unable to connect to backend to resume session.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Application-First Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-slate-200/90 dark:border-slate-800/90 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Interactive Developer Console
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Milestone 4: PostgreSQL + Gemini</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Launch Technical Mock Interview
          </h1>
        </div>

        {/* Console Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium shadow-2xs">
            <span className={`h-2 w-2 rounded-full ${healthOk ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            <span>{healthOk ? 'API Server Online' : 'Connecting to API'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Static AST Review</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Gemini 2.5 Flash / Fallback</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Launcher (Left) + Specifications & Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Direct Interview Configuration & Launcher */}
        <section
          aria-labelledby="configure-session-heading"
          className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-7 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div>
              <h2 id="configure-session-heading" className="text-base font-bold text-slate-900 dark:text-white">
                Session Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set interview parameters to generate calibrated questions and evaluation rubric.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSetupModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
              title="Open full configuration dialog"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>Modal View</span>
            </button>
          </div>

          {/* Validation or Launch Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Launch Failure: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLaunch} className="space-y-5">
            {/* 1. Target Engineering Role */}
            <div>
              <label htmlFor="console-role" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Target Engineering Role
              </label>
              <select
                id="console-role"
                value={config.role}
                disabled={launchStage === 'validating' || launchStage === 'starting'}
                onChange={(e) => {
                  setConfig({ ...config, role: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50 transition"
              >
                {PRESET_ROLES.map((role) => (
                  <option key={role} value={role} className="dark:bg-slate-900 dark:text-white">
                    {role}
                  </option>
                ))}
              </select>

              {/* Quick Preset Pills */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_ROLES.map((role) => {
                  const shortLabel = role.replace(' (Distributed Systems)', '').replace('Systems ', '');
                  const isSelected = config.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={launchStage === 'validating' || launchStage === 'starting'}
                      onClick={() => setConfig({ ...config, role })}
                      className={`text-[11px] rounded-md px-2 py-0.5 font-medium transition ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Seniority Level */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Seniority Level
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Calibrates expected depth & rigor</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['Junior', 'Mid', 'Senior', 'Staff'] as const).map((level) => {
                  const isSelected = config.difficulty === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={launchStage === 'validating' || launchStage === 'starting'}
                      onClick={() => {
                        setConfig({ ...config, difficulty: level });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`rounded-xl py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        isSelected
                          ? 'border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Primary Coding Language */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Primary Coding Language
                </label>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Static Evaluation (No Execution)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['Python', 'Java', 'SQL'] as const).map((lang) => {
                  const isSelected = config.primaryLanguage === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      disabled={launchStage === 'validating' || launchStage === 'starting'}
                      onClick={() => {
                        setConfig({ ...config, primaryLanguage: lang });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`rounded-xl py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        isSelected
                          ? 'border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Question Depth Slider */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="console-questions" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Question Count
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                    {config.questionCount} Challenges
                  </span>
                  {config.questionCount === 5 && (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      (SRS Baseline)
                    </span>
                  )}
                </div>
              </div>
              <input
                id="console-questions"
                type="range"
                min="3"
                max="10"
                step="1"
                disabled={launchStage === 'validating' || launchStage === 'starting'}
                value={config.questionCount}
                onChange={(e) => {
                  setConfig({ ...config, questionCount: Number(e.target.value) });
                  if (errorMessage) setErrorMessage(null);
                }}
                className="mt-2.5 w-full accent-blue-600 cursor-pointer disabled:opacity-50"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>Min: 3 challenges</span>
                <span>Default: 5 challenges</span>
                <span>Max: 10 challenges</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Generates adaptive challenge & starter code</span>
              </div>

              <button
                type="submit"
                disabled={launchStage === 'validating' || launchStage === 'starting'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
              >
                {launchStage === 'validating' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Validating Parameters...</span>
                  </>
                ) : launchStage === 'starting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Starting Session & Generating Q1...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Technical Interview</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Session Blueprint & Developer Utilities */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Active Blueprint Summary Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Session Blueprint
              </h3>
              <span className="font-mono text-[10px] rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700 font-semibold">
                Pydantic v2
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Evaluation Engine</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">Gemini 2.5 Flash / Offline Catalog</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Execution Security</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Zero Execution (Static)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Scoring Model</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">Four-Dimensional Weighted (0–10)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Adaptive Drill-Downs</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Max 2 Follow-Ups per challenge</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Quota Resilience</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Exponential 429 Backoff</span>
              </div>
            </div>

            {/* Quick weights indicator */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Evaluation Rubric Weights:
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                <div className="rounded bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-500 dark:text-slate-400">Correct</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">40%</span>
                </div>
                <div className="rounded bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-500 dark:text-slate-400">Depth</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">25%</span>
                </div>
                <div className="rounded bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-500 dark:text-slate-400">Edge</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">20%</span>
                </div>
                <div className="rounded bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-500 dark:text-slate-400">Clarity</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Direct Resume In-Progress Session Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5">
              <RotateCcw className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Resume Existing Session
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Reconnect to a previously created or in-progress interview using its UUID.
            </p>

            {resumeError && (
              <div className="mb-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                {resumeError}
              </div>
            )}

            <form onSubmit={handleResume} className="flex gap-2">
              <input
                type="text"
                value={resumeId}
                onChange={(e) => {
                  setResumeId(e.target.value);
                  if (resumeError) setResumeError(null);
                }}
                placeholder="Paste Session UUID..."
                disabled={resumeLoading}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={resumeLoading || !resumeId.trim()}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 transition disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
              >
                {resumeLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Resume</span>
                )}
              </button>
            </form>
          </div>

          {/* 3. Secondary Documentation Cards */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Engineering Reference Docs
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Secondary Guides</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => onNavigateTab('rubric')}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-2xs transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>Four-D Rubric</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  Calibrated 0.0–10.0 grading formula across 4 dimensions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('workflow')}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-2xs transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>State Lifecycle</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  Server-authoritative state machine 01 to 04.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('sample-report')}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-2xs transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>Sample Report</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  Simulated 8.6 Strong Pass candidate deliverable.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('architecture')}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-2xs transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>Architecture</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  Milestone roadmap and full-stack specs.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
