import React, { useState } from 'react';
import {
  Play,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Loader2,
  Server,
  Cpu,
  Globe,
  Database,
  CheckCircle2,
  X,
} from 'lucide-react';
import type {
  InterviewConfig,
  ConfiguredSession,
  StartedSessionData,
} from '../types';
import { apiFetch } from '../utils/api';

interface InterviewConsoleProps {
  onStartSession: (session: StartedSessionData) => void;
  onConfigSaved: (session: ConfiguredSession) => void;
  onOpenSetupModal?: () => void;
  onNavigateTab: (tab: 'rubric' | 'workflow' | 'sample-report' | 'architecture' | 'challenges') => void;
  healthOk: boolean;
}

const TRACKS = [
  {
    id: 'Backend Engineer (Distributed Systems)',
    name: 'Distributed Systems',
    subtitle: 'Concurrency, event brokers, consensus & high-throughput architectures',
    icon: Server,
  },
  {
    id: 'Systems Infrastructure & Reliability',
    name: 'Systems & Infrastructure',
    subtitle: 'Kernel I/O, memory safety, fault tolerance & failover semantics',
    icon: Cpu,
  },
  {
    id: 'Full-Stack Web Architect',
    name: 'Full-Stack Architecture',
    subtitle: 'Client-server sync, caching layers, high-scale APIs & web protocols',
    icon: Globe,
  },
  {
    id: 'Data & Analytics Pipeline Engineer',
    name: 'Data & Pipeline Systems',
    subtitle: 'Stream processing, backpressure control, analytical storage & ETL',
    icon: Database,
  },
] as const;

const QUESTION_PRESETS = [
  { count: 3, label: '3 Questions', desc: 'Quick session (~20 min)', badge: 'Quick' },
  { count: 5, label: '5 Questions', desc: 'Standard interview (~45 min)', badge: 'Standard' },
  { count: 8, label: '8 Questions', desc: 'In-depth evaluation (~75 min)', badge: 'Deep Loop' },
] as const;

export const InterviewConsole: React.FC<InterviewConsoleProps> = ({
  onStartSession,
  onConfigSaved,
  onNavigateTab,
  healthOk: _healthOk,
}) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Backend Engineer (Distributed Systems)',
    difficulty: 'Senior',
    primaryLanguage: 'Python',
    questionCount: 5,
  });

  const [launchStage, setLaunchStage] = useState<'idle' | 'validating' | 'starting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume Drawer state
  const [showResumeDrawer, setShowResumeDrawer] = useState(false);
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
      const configRes = await apiFetch(`${apiBase}/api/v1/interviews/config`, {
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
          : `Failed to configure interview (${configRes.status})`;
        throw new Error(detail);
      }

      const configuredData: ConfiguredSession = await configRes.json();
      onConfigSaved(configuredData);

      // Step 2: Initialize session and fetch Question 1
      setLaunchStage('starting');
      const startRes = await apiFetch(`${apiBase}/api/v1/interviews/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: configuredData.sessionId || configuredData.session_id,
        }),
      });

      if (!startRes.ok) {
        const errJson = await startRes.json().catch(() => null);
        const detail = errJson?.detail
          ? typeof errJson.detail === 'string'
            ? errJson.detail
            : JSON.stringify(errJson.detail)
          : `Failed to start session (${startRes.status})`;
        throw new Error(detail);
      }

      const startedData: StartedSessionData = await startRes.json();
      onStartSession(startedData);
    } catch (err: unknown) {
      setLaunchStage('error');
      setErrorMessage(
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Unable to connect to FastAPI backend server. Please verify backend is running on port 8000.'
          : err instanceof Error
          ? err.message
          : 'Failed to launch interview session.'
      );
    }
  };

  const handleResume = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = resumeId.trim();
    if (!sid) {
      setResumeError('Please enter a session UUID to resume.');
      return;
    }

    setResumeLoading(true);
    setResumeError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      const res = await apiFetch(`${apiBase}/api/v1/interviews/${sid}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Session ${sid} not found.`);
      }

      const data = await res.json();
      const currentStatus = data.status || 'in_progress';

      if (currentStatus === 'completed') {
        onStartSession({
          status: 'completed',
          session_id: sid,
          sessionId: sid,
          message: 'Viewing completed session evaluation report.',
          started_at: data.createdAt || data.created_at || new Date().toISOString(),
          config: data.config,
        });
        setResumeLoading(false);
        return;
      }

      let questionData = data.currentQuestion || data.current_question;
      if (!questionData && currentStatus === 'in_progress') {
        const qRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/question`);
        if (qRes.ok) {
          questionData = await qRes.json();
        }
      }

      onStartSession({
        status: 'in_progress',
        session_id: sid,
        sessionId: sid,
        current_question: questionData,
        currentQuestion: questionData,
        message: 'Resuming active technical interview round.',
        started_at: data.started_at || data.startedAt || new Date().toISOString(),
        config: data.config,
      });

      setResumeLoading(false);
    } catch (err) {
      setResumeLoading(false);
      setResumeError(
        err instanceof Error ? err.message : 'Unable to connect to resume session.'
      );
    }
  };

  const selectedTrack = TRACKS.find((t) => t.id === config.role);

  return (
    <div className="w-full relative z-10 animate-fadeIn py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3A0F34]/20 dark:border-[#EAAA00]/30 bg-white/80 dark:bg-[#250C3D] text-[10px] font-mono tracking-widest uppercase text-[#3A0F34] dark:text-[#EAAA00] mb-3 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
            <span>INTERVIEW PRACTICE SETUP</span>
          </div>
          <h1 className="font-didone text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1]">
            Configure Your Practice Session
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#555555] dark:text-slate-300 max-w-lg mx-auto font-sans leading-relaxed">
            Select your technical domain, seniority, and preferences below to start an interactive AI mock interview.
          </p>

          {/* Quick Resume Link */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowResumeDrawer(!showResumeDrawer)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#7A7875] dark:text-slate-400 hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 text-[#EAAA00]" />
              <span>{showResumeDrawer ? 'Close resume box' : 'Have a previous session UUID? Resume here'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Resume Session Box */}
        {showResumeDrawer && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#1A0826] border border-[#E5DFD5] dark:border-[#3A0F34] shadow-md animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00]" />
                <h3 className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">
                  Resume Existing Session
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeDrawer(false)}
                className="p-1 rounded-full text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#555555] dark:text-slate-300 mb-3 font-sans">
              Enter your session UUID to continue where you left off or review completed results.
            </p>
            {resumeError && (
              <div className="mb-3 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-800 dark:text-rose-200">
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
                placeholder="Paste session UUID (e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6)..."
                disabled={resumeLoading}
                className="flex-1 rounded-xl border border-slate-300 dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#120516] px-3.5 py-2 text-xs font-mono text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:border-[#3A0F34] dark:focus:border-[#EAAA00] focus:outline-none"
              />
              <button
                type="submit"
                disabled={resumeLoading || !resumeId.trim()}
                className="rounded-xl bg-[#3A0F34] hover:bg-[#2E0B29] dark:bg-[#EAAA00] dark:hover:bg-[#D49800] px-4 py-2 text-xs font-mono font-bold text-white dark:text-[#120516] transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {resumeLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EAAA00] dark:text-[#120516]" />
                ) : (
                  <span>Resume</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Global Error Notice */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Notice: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Unified, Clean Options Panel */}
        <div className="bg-white dark:bg-[#1A0826] border border-[#E5DFD5] dark:border-[#3A0F34] rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleLaunch} className="space-y-7">
            {/* 1. Track Selection (4 Simple Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#3A0F34] dark:text-[#EAAA00]">
                  1. Technical Domain
                </span>
                <span className="text-[11px] font-mono text-[#7A7875] dark:text-slate-400">
                  Select your specialty
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRACKS.map((track) => {
                  const Icon = track.icon;
                  const isSelected = config.role === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      disabled={launchStage === 'validating' || launchStage === 'starting'}
                      onClick={() => {
                        setConfig({ ...config, role: track.id });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-[#3A0F34] ring-2 ring-[#3A0F34] dark:border-[#EAAA00] dark:ring-[#EAAA00] bg-[#FAF8F5] dark:bg-[#250C3D]/80 shadow-xs'
                          : 'border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#16061D]/50 hover:border-slate-400 dark:hover:border-[#EAAA00]/40 hover:bg-[#FAF8F5]/60 dark:hover:bg-[#20092E]/60'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#3A0F34] text-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516]'
                            : 'bg-[#FAF8F5] text-[#3A0F34] border border-[#E5DFD5] dark:bg-[#120516] dark:text-[#EAAA00] dark:border-[#3A0F34]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <h3 className="font-semibold text-sm text-[#111111] dark:text-[#F8F6F1]">
                            {track.name}
                          </h3>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#555555] dark:text-slate-300 mt-1 line-clamp-2 font-sans leading-relaxed">
                          {track.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Seniority & Coding Language (Side by side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-[#E5DFD5]/80 dark:border-[#3A0F34]/50">
              {/* Seniority */}
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#3A0F34] dark:text-[#EAAA00] block mb-2.5">
                  2. Seniority Level
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-[#FAF8F5] dark:bg-[#120516] p-1.5 rounded-2xl border border-[#E5DFD5] dark:border-[#3A0F34]/60">
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
                        className={`py-2 text-xs font-mono rounded-xl transition-all cursor-pointer font-semibold ${
                          isSelected
                            ? 'bg-[#3A0F34] text-white dark:bg-[#EAAA00] dark:text-[#120516] shadow-xs'
                            : 'text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#3A0F34] dark:text-[#EAAA00] block mb-2.5">
                  3. Coding Language
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#FAF8F5] dark:bg-[#120516] p-1.5 rounded-2xl border border-[#E5DFD5] dark:border-[#3A0F34]/60">
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
                        className={`py-2 text-xs font-mono rounded-xl transition-all cursor-pointer font-semibold ${
                          isSelected
                            ? 'bg-[#3A0F34] text-white dark:bg-[#EAAA00] dark:text-[#120516] shadow-xs'
                            : 'text-[#555555] dark:text-slate-300 hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Number of Questions */}
            <div className="pt-5 border-t border-[#E5DFD5]/80 dark:border-[#3A0F34]/50">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#3A0F34] dark:text-[#EAAA00] block mb-2.5">
                4. Session Length
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUESTION_PRESETS.map((preset) => {
                  const isSelected = config.questionCount === preset.count;
                  return (
                    <button
                      key={preset.count}
                      type="button"
                      disabled={launchStage === 'validating' || launchStage === 'starting'}
                      onClick={() => {
                        setConfig({ ...config, questionCount: preset.count });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[#3A0F34] ring-2 ring-[#3A0F34] dark:border-[#EAAA00] dark:ring-[#EAAA00] bg-[#FAF8F5] dark:bg-[#250C3D]/80 shadow-xs'
                          : 'border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#16061D]/50 hover:border-slate-400 dark:hover:border-[#EAAA00]/40 hover:bg-[#FAF8F5]/60 dark:hover:bg-[#20092E]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#111111] dark:text-[#F8F6F1]">
                          {preset.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            preset.badge === 'Standard'
                              ? 'bg-[#EAAA00]/20 text-[#3A0F34] dark:text-[#EAAA00] font-bold border border-[#EAAA00]/40'
                              : 'text-[#7A7875] dark:text-slate-400 bg-black/5 dark:bg-white/5'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#555555] dark:text-slate-300 font-sans">
                        {preset.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Launch Action & Summary */}
            <div className="pt-6 border-t border-[#E5DFD5] dark:border-[#3A0F34]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-[#555555] dark:text-slate-300 text-center sm:text-left">
                <span className="text-[#7A7875] dark:text-slate-400">Target: </span>
                <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">
                  {config.difficulty} • {selectedTrack?.name || config.role} • {config.primaryLanguage} • {config.questionCount} Questions
                </span>
              </div>

              <button
                type="submit"
                disabled={launchStage === 'validating' || launchStage === 'starting'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#3A0F34] hover:bg-[#2E0B29] dark:bg-[#EAAA00] dark:hover:bg-[#D49800] px-7 py-3 text-xs font-mono uppercase tracking-wider font-bold text-white dark:text-[#120516] shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
              >
                {launchStage === 'validating' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#EAAA00] dark:text-[#120516]" />
                    <span>Validating...</span>
                  </>
                ) : launchStage === 'starting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#EAAA00] dark:text-[#120516]" />
                    <span>Preparing Interview...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current text-[#EAAA00] dark:text-[#120516]" />
                    <span>Start Practice Interview</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5] text-[#EAAA00] dark:text-[#120516]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Reference Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-5 text-xs text-[#7A7875] dark:text-slate-400 font-sans">
          <button
            type="button"
            onClick={() => onNavigateTab('challenges')}
            className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] hover:underline transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Prefer pre-set challenges? Browse Challenge Bank</span>
            <ArrowRight className="h-3 w-3" />
          </button>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
          <button
            type="button"
            onClick={() => onNavigateTab('rubric')}
            className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] hover:underline transition cursor-pointer flex items-center gap-1.5"
          >
            <span>View 4D Scoring Rubric</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
