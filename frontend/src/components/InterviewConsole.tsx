import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  Loader2,
  Mic,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Layers,
  Cpu,
  Database,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import type {
  InterviewConfig,
  ConfiguredSession,
  StartedSessionData,
  InterviewMode,
} from '../types';
import { apiFetch } from '../utils/api';
import { checkSpeechCapabilities } from '../utils/webSpeechVoice';

interface InterviewConsoleProps {
  onStartSession: (session: StartedSessionData) => void;
  onConfigSaved: (session: ConfiguredSession) => void;
  onOpenSetupModal?: () => void;
  onNavigateTab: (tab: 'dashboard' | 'rubric' | 'workflow' | 'sample-report' | 'architecture' | 'challenges' | 'landing') => void;
  healthOk: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const ROLES = [
  {
    id: 'Backend Engineer (Distributed Systems)',
    name: 'Software Engineer — Distributed Systems',
    description: 'Concurrency, event brokers, consensus & high-throughput architectures',
    icon: Layers,
    topics: ['Concurrency', 'Distributed Systems', 'Caching', 'Message Queues'],
  },
  {
    id: 'Full-Stack Web Architect',
    name: 'Full-Stack Web Architect',
    description: 'Client-server sync, caching layers, high-scale APIs & web protocols',
    icon: Globe,
    topics: ['System Design', 'API Design', 'HTTP Protocols', 'State Synchronization'],
  },
  {
    id: 'Systems Infrastructure & Reliability',
    name: 'Systems Infrastructure & Reliability',
    description: 'Kernel I/O, memory safety, fault tolerance & failover semantics',
    icon: Cpu,
    topics: ['Operating Systems', 'Memory Safety', 'Fault Tolerance', 'Kernel I/O'],
  },
  {
    id: 'Data & Analytics Pipeline Engineer',
    name: 'Data & Pipeline Systems Engineer',
    description: 'Stream processing, backpressure control, analytical storage & ETL',
    icon: Database,
    topics: ['Stream Processing', 'Databases', 'ETL Pipelines', 'Backpressure'],
  },
] as const;

const EXPERIENCE_LEVELS = [
  {
    level: 'Junior' as const,
    label: 'Junior',
    years: '0–2 years',
    description: 'Foundational syntax, core algorithms, clean data structures',
  },
  {
    level: 'Mid' as const,
    label: 'Mid-Level',
    years: '2–5 years',
    description: 'System design trade-offs, concurrency, practical scaling',
  },
  {
    level: 'Senior' as const,
    label: 'Senior',
    years: '5+ years',
    description: 'Deep distributed architecture, edge cases, fault domains',
  },
] as const;

const FOCUS_TAGS = [
  'Data Structures',
  'System Design',
  'Algorithms',
  'Databases',
  'Operating Systems',
  'API Design',
  'Concurrency',
  'Microservices',
];

export const InterviewConsole: React.FC<InterviewConsoleProps> = ({
  onStartSession,
  onConfigSaved,
  onNavigateTab,
  healthOk: _healthOk,
  theme = 'dark',
  onToggleTheme,
}) => {
  const speechCaps = checkSpeechCapabilities();
  const hasVoiceSupport = speechCaps.hasSpeechRecognition && speechCaps.hasSpeechSynthesis;

  const [selectedMode, setSelectedMode] = useState<InterviewMode>(() => {
    return hasVoiceSupport ? 'voice' : 'text';
  });

  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Backend Engineer (Distributed Systems)',
    difficulty: 'Senior',
    primaryLanguage: 'Python',
    questionCount: 5,
    mode: hasVoiceSupport ? 'voice' : 'text',
  });

  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'System Design',
    'Algorithms',
  ]);

  const [launchStage, setLaunchStage] = useState<'idle' | 'validating' | 'starting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume Drawer state
  const [showResumeDrawer, setShowResumeDrawer] = useState(false);
  const [resumeId, setResumeId] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

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
          : `Failed to register configuration (${configRes.status})`;
        throw new Error(detail);
      }

      const configuredData: ConfiguredSession = await configRes.json();
      onConfigSaved(configuredData);

      // Step 2: Initialize session and fetch Question 1
      setLaunchStage('starting');
      const sid = configuredData.sessionId || configuredData.session_id;
      if (!sid) {
        throw new Error('Interview session ID was not returned by server.');
      }
      const startRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      window.history.replaceState(null, '', `?sessionId=${encodeURIComponent(sid)}`);
      onStartSession({
        ...startedData,
        mode: selectedMode,
      });
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
          mode: selectedMode,
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
        mode: selectedMode,
      });

      setResumeLoading(false);
    } catch (err) {
      setResumeLoading(false);
      setResumeError(
        err instanceof Error ? err.message : 'Unable to connect to resume session.'
      );
    }
  };

  return (
    <div className="w-full min-h-[calc(100dvh-3.5rem)] bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] transition-colors py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation Bar: Back to Dashboard Link + Step Progress (Reference Panel 4) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#E5DFD5] dark:border-[#232328] gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg text-[#111111] dark:text-white">
              MockInterview<span className="text-[#F59E0B]">.ai</span>
            </span>
            <span className="text-[#D4CFC7] dark:text-[#27272E] hidden sm:inline">•</span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1AA] hidden sm:inline">
              Session Configuration
            </span>
          </div>

          {/* Stepper Progress Bar (Reference Panel 4) */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-sans">
            <div className="flex items-center gap-1.5 font-semibold text-[#111111] dark:text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-[#09090B] text-[10px] font-bold font-mono shadow-xs shadow-[#F59E0B]/30">
                1
              </span>
              <span>Role & Level</span>
            </div>
            <span className="text-[#D4CFC7] dark:text-[#27272E]">›</span>
            <div className="flex items-center gap-1.5 text-[#777777] dark:text-[#71717A]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4CFC7] dark:border-[#27272E] text-[10px] font-mono">
                2
              </span>
              <span>Topics</span>
            </div>
            <span className="text-[#D4CFC7] dark:text-[#27272E]">›</span>
            <div className="flex items-center gap-1.5 text-[#777777] dark:text-[#71717A]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4CFC7] dark:border-[#27272E] text-[10px] font-mono">
                3
              </span>
              <span>Preferences</span>
            </div>
            <span className="text-[#D4CFC7] dark:text-[#27272E]">›</span>
            <div className="flex items-center gap-1.5 text-[#777777] dark:text-[#71717A]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4CFC7] dark:border-[#27272E] text-[10px] font-mono">
                4
              </span>
              <span>Review</span>
            </div>
          </div>

          {/* Actions: Theme Toggle + Back to Dashboard Link */}
          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button
                id="console-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle color theme"
                className="p-1.5 rounded-xl border border-[#E5DFD5] dark:border-[#27272E] bg-white dark:bg-[#141417] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white shadow-2xs transition cursor-pointer"
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
              onClick={() => onNavigateTab('dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#555555] dark:text-[#A1A1AA] hover:text-[#F59E0B] transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Split Setup Layout (Reference Screen 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visual Card (Reference: "Let's create your interview") */}
          <div className="lg:col-span-4 rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors">
            <div className="relative z-10">
              {/* Candidate with Desk, Laptop, Hanging Lamp and Plant (Reference Screen 4) */}
              <div className="w-full rounded-2xl bg-gradient-to-tr from-[#FAF8F5] via-white to-[#F4F1EA] dark:from-[#1A140A] dark:via-[#161412] dark:to-[#121214] border border-[#E5DFD5] dark:border-[#2A2A30] p-4 flex flex-col items-center justify-center text-center relative overflow-hidden mb-6">
                <svg viewBox="0 0 280 200" className="w-full max-w-[240px] h-auto drop-shadow-xs" fill="none">
                  {/* Hanging Lamp from ceiling */}
                  <line x1="80" y1="0" x2="80" y2="45" stroke="#71717A" strokeWidth="2" />
                  <path d="M68 45 L92 45 L96 60 L64 60 Z" fill="#F59E0B" />
                  <circle cx="80" cy="62" r="3" fill="#FFF2D6" />

                  {/* Desk Surface */}
                  <rect x="20" y="165" width="240" height="8" rx="2" fill="#2A2A30" />

                  {/* Candidate at Desk */}
                  <circle cx="160" cy="115" r="16" fill="#F3C5A8" />
                  {/* Hair bun */}
                  <circle cx="164" cy="98" r="10" fill="#09090B" />
                  <ellipse cx="158" cy="112" rx="15" ry="12" fill="#09090B" />
                  {/* Candidate Body */}
                  <path d="M135 165 C 140 135, 150 130, 160 130 C 170 130, 180 135, 185 165 Z" fill="#F59E0B" />
                  {/* Arms toward laptop */}
                  <path d="M145 150 L 125 162 L 132 165 L 152 153 Z" fill="#F59E0B" />

                  {/* Laptop */}
                  <polygon points="100,163 135,163 140,165 95,165" fill="#3F3F46" />
                  <rect x="102" y="130" width="30" height="33" rx="2" fill="#18181B" stroke="#27272A" strokeWidth="1" />
                  <rect x="105" y="134" width="24" height="25" rx="1" fill="#09090B" />
                  <rect x="108" y="138" width="12" height="2" rx="1" fill="#F59E0B" />
                  <rect x="108" y="142" width="18" height="1.5" rx="1" fill="#71717A" />
                  <rect x="108" y="146" width="15" height="1.5" rx="1" fill="#71717A" />

                  {/* Potted Plant on Desk */}
                  <rect x="45" y="148" width="18" height="17" rx="2" fill="#2A2A30" />
                  <path d="M54 148 C 45 130, 35 135, 40 120 C 50 135, 55 140, 54 148 Z" fill="#059669" />
                  <path d="M56 148 C 65 130, 75 135, 70 120 C 60 135, 55 140, 56 148 Z" fill="#10B981" />
                </svg>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-white leading-tight">
                Let&apos;s create
                <br />
                your interview.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#666666] dark:text-[#A1A1AA] font-sans leading-relaxed">
                Tailor your session to match your goals and skill level.
              </p>
            </div>

            {/* Quick Session Resume Link */}
            <div className="relative z-10 mt-8 pt-6 border-t border-[#E5DFD5] dark:border-[#232328]">
              <button
                type="button"
                onClick={() => setShowResumeDrawer(!showResumeDrawer)}
                className="w-full inline-flex items-center justify-between text-xs font-mono text-[#666666] dark:text-[#A1A1AA] hover:text-[#F59E0B] transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>Resume with Session UUID</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showResumeDrawer ? 'rotate-180' : ''}`} />
              </button>

              {showResumeDrawer && (
                <form onSubmit={handleResume} className="mt-3 space-y-2 animate-fadeIn">
                  {resumeError && (
                    <div className="p-2 rounded-lg bg-rose-950/50 text-rose-300 text-[11px] font-mono border border-rose-900/60">
                      {resumeError}
                    </div>
                  )}
                  <input
                    type="text"
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    placeholder="mock-xxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#0D0D10] text-[#111111] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
                  />
                  <button
                    type="submit"
                    disabled={resumeLoading}
                    className="w-full py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-xs font-bold cursor-pointer disabled:opacity-50 transition"
                  >
                    {resumeLoading ? 'Finding session...' : 'Resume Interview'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Guided Setup Form (Reference Panel 4) */}
          <div className="lg:col-span-8 rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-sm transition-colors">
            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl border border-rose-900/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5 font-mono animate-fadeIn"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleLaunch} className="space-y-6">
              {/* Field 1: Select Role (Reference Panel 4) */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#F59E0B] mb-2">
                  Select Role
                </label>
                <div className="relative">
                  <select
                    value={config.role}
                    onChange={(e) => setConfig({ ...config, role: e.target.value })}
                    className="w-full appearance-none pl-4 pr-10 py-3 text-sm font-sans font-medium rounded-2xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#0D0D10] text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-[#141417] text-[#111111] dark:text-white">
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Field 2: Experience Level Cards (Reference Screen 4) */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#111111] dark:text-white mb-2">
                  Experience Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EXPERIENCE_LEVELS.map((exp) => {
                    const isSelected = config.difficulty === exp.level;
                    return (
                      <button
                        key={exp.level}
                        type="button"
                        onClick={() => setConfig({ ...config, difficulty: exp.level })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-xs'
                            : 'border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#18181C] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-sans font-bold text-sm ${isSelected ? 'text-[#F59E0B]' : 'text-[#111111] dark:text-white'}`}>
                            {exp.label}
                          </span>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-[#F59E0B] text-[#09090B] flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] font-sans text-[#666666] dark:text-[#A1A1AA] mt-1">
                          {exp.years}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 3: Focus Topics (Optional Pill Filter Tags) (Reference Screen 4) */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#111111] dark:text-white mb-2">
                  Focus Topics (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_TAGS.map((tag) => {
                    const isSelected = selectedTopics.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTopic(tag)}
                        className={`px-4 py-2 rounded-full text-xs font-sans transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F59E0B] text-[#09090B] font-bold shadow-xs'
                            : 'border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:border-[#F59E0B]/40'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: Number of Questions & Mode (Side by side) */}
              <div className="pt-4 border-t border-[#E5DFD5] dark:border-[#232328] space-y-4">
                {/* Number of Questions Slider + Box on Right (Reference Screen 4) */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-[#111111] dark:text-white mb-2">
                    Number of Questions
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={config.questionCount}
                      onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                      className="flex-1 accent-[#F59E0B] cursor-pointer h-2 bg-[#E5DFD5] dark:bg-[#232328] rounded-lg"
                    />
                    <div className="w-14 px-3 py-2 text-center rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#0D0D10] font-sans text-sm font-bold text-[#F59E0B]">
                      {config.questionCount}
                    </div>
                  </div>
                </div>

                {/* Primary Interaction Mode */}
                <div>
                  <label className="text-xs font-sans font-semibold text-[#111111] dark:text-white block mb-2">
                    Interaction Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#FAF8F5] dark:bg-[#0D0D10] p-1 rounded-2xl border border-[#E5DFD5] dark:border-[#2A2A30] max-w-xs">
                    <button
                      type="button"
                      disabled={!hasVoiceSupport}
                      onClick={() => {
                        setSelectedMode('voice');
                        setConfig({ ...config, mode: 'voice' });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-sans font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedMode === 'voice'
                          ? 'bg-[#F59E0B] text-[#09090B] font-bold shadow-xs'
                          : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      } ${!hasVoiceSupport ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Voice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('text');
                        setConfig({ ...config, mode: 'text' });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-sans font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedMode === 'text'
                          ? 'bg-[#F59E0B] text-[#09090B] font-bold shadow-xs'
                          : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Text</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Launch Action (Reference Screen 4) */}
              <div className="pt-6 flex items-center justify-end border-t border-[#E5DFD5] dark:border-[#232328]">
                <button
                  id="start-interview-submit-btn"
                  type="submit"
                  disabled={launchStage === 'validating' || launchStage === 'starting'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-8 py-3 text-sm font-sans font-bold tracking-wide shadow-md shadow-[#F59E0B]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
                >
                  {launchStage === 'validating' || launchStage === 'starting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#09090B]" />
                      <span>{launchStage === 'validating' ? 'Registering...' : 'Initializing Q1...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="h-4 w-4 text-[#09090B]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
