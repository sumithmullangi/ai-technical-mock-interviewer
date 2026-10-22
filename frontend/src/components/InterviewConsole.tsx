import React, { useState } from 'react';
import {
  Play,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Loader2,
  Server,
  Cpu,
  Globe,
  Database,
  CheckCircle2,
  Sliders,
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
  onOpenSetupModal: () => void;
  onNavigateTab: (tab: 'rubric' | 'workflow' | 'sample-report' | 'architecture' | 'challenges') => void;
  healthOk: boolean;
}

const TRACKS = [
  {
    id: 'Backend Engineer (Distributed Systems)',
    name: 'Distributed Systems',
    subtitle: 'High-throughput concurrency, event brokers & consensus algorithms',
    badge: 'Backend Arch',
    topics: ['Concurrency', 'Raft / Paxos', 'Kafka', 'Partitioning'],
    icon: Server,
  },
  {
    id: 'Systems Infrastructure & Reliability',
    name: 'Systems & Infrastructure',
    subtitle: 'Kernel I/O, memory safety, fault isolation & failover semantics',
    badge: 'SRE & Platform',
    topics: ['Kernel I/O', 'Memory Safety', 'Telemetry', 'Circuit Breakers'],
    icon: Cpu,
  },
  {
    id: 'Full-Stack Web Architect',
    name: 'Full-Stack Architecture',
    subtitle: 'Client-server sync protocols, caching layers & high-scale APIs',
    badge: 'Web Systems',
    topics: ['API Gateways', 'Hydration', 'Cache Invalidation', 'WebSockets'],
    icon: Globe,
  },
  {
    id: 'Data & Analytics Pipeline Engineer',
    name: 'Data & Pipeline Systems',
    subtitle: 'Backpressure control, analytical storage & stream transformations',
    badge: 'Streaming & Storage',
    topics: ['Backpressure', 'Windowing', 'Parquet / Iceberg', 'CDC'],
    icon: Database,
  },
] as const;

export interface CuratedChallenge {
  id: string;
  title: string;
  domain: string;
  domainShort: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  language: 'Python' | 'Java' | 'SQL';
  summary: string;
  keyTopics: string[];
  rubricWeight: string;
}

const CURATED_CHALLENGES: CuratedChallenge[] = [
  {
    id: 'ch-1',
    title: 'Distributed Rate Limiter with Sliding Window & Lua',
    domain: 'Backend Engineer (Distributed Systems)',
    domainShort: 'Distributed Systems',
    difficulty: 'Senior',
    language: 'Python',
    summary: 'Design a thread-safe sliding window rate limiter capable of handling 50k QPS across microservices using Redis Lua scripts, atomic increments, and clock drift mitigation.',
    keyTopics: ['Token Bucket', 'Sliding Window', 'Redis Lua', 'Clock Skew'],
    rubricWeight: 'Correctness (40%) • Scale (20%)',
  },
  {
    id: 'ch-2',
    title: 'Cache Stampede & Thundering Herd Mitigation',
    domain: 'Systems Infrastructure & Reliability',
    domainShort: 'Infrastructure & SRE',
    difficulty: 'Staff',
    language: 'Python',
    summary: 'Implement probabilistic early expiration (XFetch algorithm) and distributed mutex locking to prevent database overload during high-traffic cache invalidations.',
    keyTopics: ['XFetch Algorithm', 'Distributed Mutex', 'Cache Invalidation', 'Thundering Herd'],
    rubricWeight: 'Edge Cases (25%) • Depth (25%)',
  },
  {
    id: 'ch-3',
    title: 'Distributed Mutex with Fencing Tokens & TTL Leases',
    domain: 'Backend Engineer (Distributed Systems)',
    domainShort: 'Distributed Systems',
    difficulty: 'Staff',
    language: 'Java',
    summary: 'Architect a consensus-backed distributed lock manager that generates monotonically increasing fencing tokens to prevent split-brain state mutations during GC pauses.',
    keyTopics: ['Redlock / Raft', 'Fencing Tokens', 'Lease Renewal', 'Split-Brain'],
    rubricWeight: 'Architectural Depth (30%)',
  },
  {
    id: 'ch-4',
    title: 'Multi-Region Read Replica Lag & Failover Resolution',
    domain: 'Data & Analytics Pipeline Engineer',
    domainShort: 'Data Pipelines',
    difficulty: 'Senior',
    language: 'SQL',
    summary: 'Implement read-your-writes causal consistency across geo-distributed PostgreSQL read replicas with semi-synchronous replication and automatic split-brain prevention.',
    keyTopics: ['Replication Lag', 'Causal Consistency', 'WAL Shipping', 'Leader Election'],
    rubricWeight: 'Technical Depth (25%) • Correctness (35%)',
  },
  {
    id: 'ch-5',
    title: 'Real-Time WebSocket Pub/Sub with Ring Buffer Backpressure',
    domain: 'Full-Stack Web Architect',
    domainShort: 'Full-Stack Systems',
    difficulty: 'Senior',
    language: 'Python',
    summary: 'Construct an asynchronous WebSocket fanout broker with bounded ring buffers, backpressure load shedding, and client heartbeat re-synchronization under packet loss.',
    keyTopics: ['Ring Buffer', 'Backpressure', 'Heartbeats', 'Event Demux'],
    rubricWeight: 'Edge Cases (25%) • Scale (20%)',
  },
  {
    id: 'ch-6',
    title: 'Saga Pattern Coordinator with Compensating Transactions',
    domain: 'Backend Engineer (Distributed Systems)',
    domainShort: 'Distributed Systems',
    difficulty: 'Senior',
    language: 'Java',
    summary: 'Build a distributed checkout workflow using the Saga choreography pattern with transactional outbox messaging and idempotent compensating rollback actions.',
    keyTopics: ['Saga Pattern', 'Transactional Outbox', 'Idempotency Keys', 'Compensations'],
    rubricWeight: 'Correctness (40%) • Clarity (15%)',
  },
];

const ROUND_PRESETS = [
  {
    count: 3,
    label: 'Sprint Loop',
    duration: '~30 min',
    desc: 'Core algorithmic and fundamental architectural checks',
    recommended: false,
  },
  {
    count: 5,
    label: 'Standard Loop',
    duration: '~50 min',
    desc: 'Comprehensive multi-stage round with dynamic follow-ups',
    recommended: true,
  },
  {
    count: 8,
    label: 'Staff Loop',
    duration: '~80 min',
    desc: 'End-to-end distributed system & failure mode deep-dive',
    recommended: false,
  },
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
  const [challengeCategory, setChallengeCategory] = useState<string>('all');

  // Resume Drawer state
  const [showResumeDrawer, setShowResumeDrawer] = useState(false);
  const [resumeId, setResumeId] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Direct 1-click launch from the Challenge Bank
  const handleQuickLaunchChallenge = async (ch: CuratedChallenge) => {
    const customConfig: InterviewConfig = {
      role: ch.domain,
      difficulty: ch.difficulty,
      primaryLanguage: ch.language,
      questionCount: 5,
    };
    setConfig(customConfig);
    setErrorMessage(null);
    setLaunchStage('validating');

    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

    try {
      const configRes = await apiFetch(`${apiBase}/api/v1/interviews/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: customConfig.role.trim(),
          difficulty: customConfig.difficulty,
          primaryLanguage: customConfig.primaryLanguage,
          questionCount: customConfig.questionCount,
        }),
      });

      if (!configRes.ok) {
        const errJson = await configRes.json().catch(() => null);
        throw new Error(errJson?.detail || 'Failed to configure challenge session.');
      }

      const configuredData: ConfiguredSession = await configRes.json();
      onConfigSaved(configuredData);

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
        throw new Error(errJson?.detail || 'Failed to start challenge session.');
      }

      const startedData: StartedSessionData = await startRes.json();
      onStartSession(startedData);
    } catch (err: unknown) {
      setLaunchStage('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to launch challenge session.'
      );
    }
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

      if (currentStatus === 'configured') {
        const startRes = await apiFetch(`${apiBase}/api/v1/interviews/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sid }),
        });

        if (!startRes.ok) {
          const err = await startRes.json().catch(() => null);
          throw new Error(err?.detail || 'Failed to initialize configured session.');
        }

        const started = await startRes.json();
        onStartSession(started);
        setResumeLoading(false);
        return;
      }

      // Resume active session
      let questionData = data.current_question || data.currentQuestion;
      if (!questionData) {
        const currentQNum = data.current_question_number || data.currentQuestionNumber || 1;
        const qRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/questions/${currentQNum}`);
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

  return (
    <div className="w-full relative z-10 animate-fadeIn">
      {/* Precision Column Boundary Guides across the full viewport width */}
      <div className="editorial-frame border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
        {/* Workspace Specimen Datum Strip */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-2.5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono tracking-[0.25em] uppercase text-[#7A7875] dark:text-slate-400 select-none bg-[#F8F6F1]/90 dark:bg-[#16061D]/90 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
            <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">TECHNICAL PRACTICE STUDIO // PRODUCTION EVALUATION ENVIRONMENT</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>ENGINE: {healthOk ? 'ACTIVE' : 'CONNECTING'}</span>
            <span className="text-[#EAAA00]">•</span>
            <span>4 DOMAINS</span>
            <span className="text-[#EAAA00]">•</span>
            <span>AST ANALYZER ARMED</span>
          </div>
        </div>

        {/* Real Application Command Station Header */}
        <section className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/80 dark:bg-[#16061D]/80 relative transition-colors">
          <div className="editorial-crosshair -top-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
          <div className="editorial-crosshair -top-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3A0F34]/20 dark:border-[#EAAA00]/30 bg-white/80 dark:bg-[#250C3D] text-[10px] font-mono tracking-widest uppercase text-[#3A0F34] dark:text-[#EAAA00] mb-3 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
                <span>INTERACTIVE ASSESSMENT WORKSPACE</span>
              </div>
              <h1 className="font-didone text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[1.05]">
                Technical Interview Studio
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#555555] dark:text-slate-300 font-sans leading-relaxed">
                Launch an engineering technical round calibrated to your domain and seniority level, or choose from curated challenges below. Evaluated across 4-dimensional rubrics with static AST validation and adaptive inquiries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowResumeDrawer(!showResumeDrawer)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] text-[#3A0F34] dark:text-[#F8F6F1] hover:bg-[#FAF8F5] dark:hover:bg-[#34114F] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer font-semibold uppercase tracking-wider text-[11px]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#EAAA00]" />
                <span>{showResumeDrawer ? 'Close Resume' : 'Resume UUID'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSetupModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] text-[#111111] dark:text-[#F8F6F1] hover:bg-[#FAF8F5] dark:hover:bg-[#34114F] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer font-semibold uppercase tracking-wider text-[11px]"
              >
                <Sliders className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                <span>Config Modal</span>
              </button>
            </div>
          </div>
        </section>

        {/* Collapsible Resume Session Drawer */}
        {showResumeDrawer && (
          <div className="px-4 sm:px-8 py-6 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5]/90 dark:bg-[#16061D]/95 backdrop-blur-xs animate-fadeIn">
            <div className="max-w-2xl bg-white dark:bg-[#1A0826] border border-[#E5DFD5] dark:border-[#3A0F34] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00]" />
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Resume Registered Session</h3>
                </div>
                <button
                  onClick={() => setShowResumeDrawer(false)}
                  className="p-1.5 rounded-full text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-slate-100 dark:hover:bg-[#250C3D] transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-[#555555] dark:text-slate-300 mb-4 font-sans">
                Enter your previously registered session UUID to resume your evaluation stream or review your completed report.
              </p>
              {resumeError && (
                <div className="mb-4 p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-800 dark:text-rose-200">
                  {resumeError}
                </div>
              )}
              <form onSubmit={handleResume} className="flex gap-2.5">
                <input
                  type="text"
                  value={resumeId}
                  onChange={(e) => {
                    setResumeId(e.target.value);
                    if (resumeError) setResumeError(null);
                  }}
                  placeholder="Paste session UUID (e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6)..."
                  disabled={resumeLoading}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#120516] px-4 py-2.5 text-xs font-mono text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:border-[#3A0F34] dark:focus:border-[#EAAA00] focus:outline-none focus:ring-2 focus:ring-[#3A0F34]/15"
                />
                <button
                  type="submit"
                  disabled={resumeLoading || !resumeId.trim()}
                  className="rounded-xl bg-gradient-to-r from-[#3A0F34] to-[#55164D] hover:from-[#2E0B29] hover:to-[#45103E] dark:bg-[#EAAA00] dark:hover:bg-[#D49800] px-5 py-2.5 text-xs font-mono font-bold text-white dark:text-[#120516] transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow hover:-translate-y-0.5 active:translate-y-0"
                >
                  {resumeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EAAA00] dark:text-[#120516]" /> : <span>Resume Session</span>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-4 sm:mx-8 my-4 p-4 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Session Configuration Notice: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Main Architectural Form aligned to the Grid */}
        <form onSubmit={handleLaunch} className="divide-y divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
          {/* 1. Track Selection Matrix (4-column grid cells) */}
          <div className="px-4 sm:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block">
                  01 / ARCHITECTURAL DOMAIN
                </span>
                <h2 className="font-didone text-2xl font-bold text-[#111111] dark:text-[#F8F6F1] mt-1">
                  Select Technical Domain
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenSetupModal}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#3A0F34] dark:text-[#EAAA00] hover:underline transition self-start sm:self-auto cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-[#EAAA00]" />
                <span>Advanced Parameters Modal →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    className={`relative text-left p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between rounded-2xl ${
                      isSelected
                        ? 'border-[#3A0F34] ring-2 ring-[#3A0F34] dark:ring-[#EAAA00] dark:border-[#EAAA00] bg-white dark:bg-[#1E082B] shadow-sm'
                        : 'border-[#E5DFD5] bg-white/80 dark:border-[#3A0F34]/50 dark:bg-[#16061D]/80 hover:border-[#3A0F34]/40 dark:hover:border-[#EAAA00]/40 hover:bg-white dark:hover:bg-[#20092E]/40 hover:-translate-y-0.5 hover:shadow-xs'
                    }`}
                  >
                    {/* Active Corner Accent Indicator */}
                    {isSelected && (
                      <span className="absolute top-4 right-4 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EAAA00] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EAAA00]"></span>
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div
                          className={`p-2.5 rounded-xl transition-colors shadow-2xs ${
                            isSelected
                              ? 'bg-[#3A0F34] text-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516]'
                              : 'bg-[#FAF8F5] text-[#3A0F34] border border-[#E5DFD5] dark:bg-[#120516] dark:text-[#EAAA00] dark:border-[#3A0F34]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span
                          className={`text-[9px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-semibold'
                              : 'text-[#7A7875] bg-white dark:bg-[#120516] border-[#E5DFD5] dark:text-slate-400 dark:border-[#3A0F34]'
                          }`}
                        >
                          {track.badge}
                        </span>
                      </div>

                      <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">
                        {track.name}
                      </h3>
                      <p className="text-xs text-[#555555] dark:text-slate-300 mt-1.5 leading-relaxed font-sans">
                        {track.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5DFD5]/80 dark:border-[#3A0F34]/40 flex flex-wrap gap-1 font-mono text-[9px] text-[#7A7875] dark:text-slate-400">
                      {track.topics.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Seniority & Language Datum Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5DFD5] dark:divide-[#3A0F34]/50">
            {/* Seniority Level */}
            <div className="px-4 sm:px-8 py-8">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-1">
                02 / SENIORITY RIGOR
              </span>
              <h3 className="font-didone text-lg font-bold text-[#111111] dark:text-[#F8F6F1] mb-4">
                Target Engineering Seniority
              </h3>

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
                      className={`py-2.5 text-xs font-mono transition-all cursor-pointer border rounded-xl ${
                        isSelected
                          ? 'border-[#3A0F34] bg-[#3A0F34] text-white dark:border-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516] font-bold shadow-xs'
                          : 'border-[#E5DFD5] bg-white text-[#555555] dark:border-[#3A0F34] dark:bg-[#16061D] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-[#250C3D] hover:text-[#111111] dark:hover:text-[#F8F6F1] shadow-2xs'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Language */}
            <div className="px-4 sm:px-8 py-8">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-1">
                03 / CODING LANGUAGE
              </span>
              <h3 className="font-didone text-lg font-bold text-[#111111] dark:text-[#F8F6F1] mb-4">
                Static Review Environment
              </h3>

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
                      className={`py-2.5 px-3 text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 border rounded-xl ${
                        isSelected
                          ? 'border-[#3A0F34] bg-[#3A0F34] text-white dark:border-[#EAAA00] dark:bg-[#EAAA00] dark:text-[#120516] font-bold shadow-xs'
                          : 'border-[#E5DFD5] bg-white text-[#555555] dark:border-[#3A0F34] dark:bg-[#16061D] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-[#250C3D] hover:text-[#111111] dark:hover:text-[#F8F6F1] shadow-2xs'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />}
                      <span>{lang}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Session Round Scope Matrix */}
          <div className="px-4 sm:px-8 py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block">
                  04 / ROUND DEPTH
                </span>
                <h3 className="font-didone text-lg font-bold text-[#111111] dark:text-[#F8F6F1] mt-0.5">
                  Interview Challenge Cadence
                </h3>
              </div>
              <span className="text-xs font-mono text-[#7A7875] dark:text-slate-400">Dynamic Adaptive Follow-Ups Included</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ROUND_PRESETS.map((preset) => {
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
                    className={`text-left p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between rounded-2xl ${
                      isSelected
                        ? 'border-[#3A0F34] ring-2 ring-[#3A0F34] dark:ring-[#EAAA00] dark:border-[#EAAA00] bg-white dark:bg-[#1E082B] shadow-sm'
                        : 'border-[#E5DFD5] bg-white/80 dark:border-[#3A0F34]/50 dark:bg-[#16061D]/80 hover:border-[#3A0F34]/40 dark:hover:border-[#EAAA00]/40 hover:bg-white dark:hover:bg-[#20092E]/40 hover:-translate-y-0.5 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">
                          {preset.label}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#3A0F34] dark:text-[#EAAA00]">
                          {preset.duration}
                        </span>
                      </div>
                      <p className="text-xs text-[#555555] dark:text-slate-300 leading-snug font-sans">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-[#E5DFD5]/80 dark:border-[#3A0F34]/40">
                      <span className="font-mono text-xs font-bold text-[#111111] dark:text-[#F8F6F1]">
                        {preset.count} Technical Challenges
                      </span>
                      {preset.recommended && (
                        <span className="text-[10px] font-mono font-semibold text-[#3A0F34] dark:text-[#EAAA00] bg-[#EAAA00]/20 dark:bg-[#EAAA00]/20 px-2.5 py-0.5 rounded-full border border-[#EAAA00]/40">
                          Recommended
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Architectural Launch Station */}
          <div className="px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#FAF8F5]/80 dark:bg-[#16061D]/80 backdrop-blur-xs transition-colors">
            <div className="flex items-center gap-3 text-xs text-[#555555] dark:text-slate-300 font-sans">
              <ShieldCheck className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
              <span>Full session persistence with executive post-interview dossier and 4D rubric report.</span>
            </div>

            <button
              type="submit"
              disabled={launchStage === 'validating' || launchStage === 'starting'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#3A0F34] via-[#52174A] to-[#3A0F34] hover:from-[#2E0B29] hover:via-[#42113B] hover:to-[#2E0B29] dark:bg-[#EAAA00] dark:hover:bg-[#D49800] px-9 py-4 text-xs font-mono uppercase tracking-wider font-bold text-white dark:text-[#120516] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border border-[#3A0F34]/30 dark:border-[#EAAA00]"
            >
              {launchStage === 'validating' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#EAAA00] dark:text-[#120516]" />
                  <span>Validating Parameters...</span>
                </>
              ) : launchStage === 'starting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#EAAA00] dark:text-[#120516]" />
                  <span>Calibrating Question 1...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current text-[#EAAA00] dark:text-[#120516]" />
                  <span>Launch Interview Session</span>
                  <ArrowRight className="h-4 w-4 ml-1 stroke-[2.5] text-[#EAAA00] dark:text-[#120516]" />
                </>
              )}
            </button>
          </div>
        </form>


        {/* Curated Challenge Bank: Real Practice Problems */}
        <section className="px-4 sm:px-8 py-10 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#F8F6F1] dark:bg-[#120516] transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6">
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block">
                PRACTICE CHALLENGES // INSTANT LAUNCH
              </span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="font-didone text-2xl font-bold text-[#111111] dark:text-[#F8F6F1]">
                  Curated Challenge Bank
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateTab('challenges')}
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-[#3A0F34] dark:text-[#EAAA00] hover:underline cursor-pointer"
                >
                  <span>Explore Full Directory (9 Specs) →</span>
                </button>
              </div>
              <p className="text-xs text-[#555555] dark:text-slate-300 font-sans mt-0.5">
                Select an architectural challenge to immediately calibrate and initiate Question 1.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {[
                { id: 'all', label: 'All (6)' },
                { id: 'distributed', label: 'Distributed Systems' },
                { id: 'infrastructure', label: 'Infrastructure & SRE' },
                { id: 'fullstack', label: 'Full-Stack' },
                { id: 'data', label: 'Data Pipelines' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChallengeCategory(tab.id)}
                  className={`px-3.5 py-1 rounded-full text-[11px] border uppercase tracking-wider transition-all cursor-pointer ${
                    challengeCategory === tab.id
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold shadow-xs'
                      : 'bg-white text-[#7A7875] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-400 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CURATED_CHALLENGES.filter((ch) => {
              if (challengeCategory === 'all') return true;
              if (challengeCategory === 'distributed') return ch.domainShort === 'Distributed Systems';
              if (challengeCategory === 'infrastructure') return ch.domainShort === 'Infrastructure & SRE';
              if (challengeCategory === 'fullstack') return ch.domainShort === 'Full-Stack Systems';
              if (challengeCategory === 'data') return ch.domainShort === 'Data Pipelines';
              return true;
            }).map((ch) => (
              <div
                key={ch.id}
                className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-white dark:bg-[#16061D] rounded-2xl flex flex-col justify-between hover:border-[#3A0F34]/50 dark:hover:border-[#EAAA00]/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#FAF8F5] dark:bg-[#250C3D] text-[#3A0F34] dark:text-[#EAAA00]">
                      {ch.domainShort}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-bold">
                        {ch.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-md border border-[#E5DFD5] dark:border-[#3A0F34] text-[#555555] dark:text-slate-300 dark:bg-[#120516]">
                        {ch.language}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1] leading-snug group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00] transition-colors">
                    {ch.title}
                  </h3>
                  <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 font-sans leading-relaxed">
                    {ch.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1 font-mono text-[9px] text-[#7A7875] dark:text-slate-400">
                    {ch.keyTopics.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] dark:bg-[#120516] border border-[#E5DFD5] dark:border-[#3A0F34]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E5DFD5]/80 dark:border-[#3A0F34]/40 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                    {ch.rubricWeight}
                  </span>
                  <button
                    type="button"
                    disabled={launchStage === 'validating' || launchStage === 'starting'}
                    onClick={() => handleQuickLaunchChallenge(ch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#3A0F34] to-[#55164D] hover:from-[#2E0B29] hover:to-[#45103E] dark:bg-[#EAAA00] dark:hover:bg-[#D49800] text-white dark:text-[#120516] text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <span>Practice</span>
                    <ArrowRight className="h-3 w-3 text-[#EAAA00] dark:text-[#120516]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Minimalist 4D Rubric Telemetry Bar Meters */}
        <div className="px-4 sm:px-8 py-8 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block">
                05 / AUTHORITATIVE RUBRIC
              </span>
              <h3 className="font-didone text-xl font-bold text-[#111111] dark:text-[#F8F6F1] mt-0.5">
                Four-Dimensional Weighted Scoring Vectors
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('rubric')}
              className="text-xs font-mono text-[#3A0F34] dark:text-[#EAAA00] hover:underline flex items-center gap-1 transition self-start sm:self-auto cursor-pointer"
            >
              <span>View Specification Breakdown →</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Dimension 1: Correctness (40%) */}
            <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/80 dark:bg-[#16061D]/80 rounded-2xl shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">Technical Correctness</span>
                <span className="font-mono text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00]">40%</span>
              </div>
              <div className="h-2 w-full bg-[#E5DFD5] dark:bg-[#250C3D] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00] rounded-full" style={{ width: '40%' }}></div>
              </div>
              <p className="text-[11px] text-[#555555] dark:text-slate-300 mt-2.5 leading-snug font-sans">
                Algorithmic validity, structural soundness, and asymptotic bounds.
              </p>
            </div>

            {/* Dimension 2: Depth (25%) */}
            <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/80 dark:bg-[#16061D]/80 rounded-2xl shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">Architectural Depth</span>
                <span className="font-mono text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00]">25%</span>
              </div>
              <div className="h-2 w-full bg-[#E5DFD5] dark:bg-[#250C3D] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00] rounded-full" style={{ width: '25%' }}></div>
              </div>
              <p className="text-[11px] text-[#555555] dark:text-slate-300 mt-2.5 leading-snug font-sans">
                Concurrency, component isolation, trade-offs, and scalability resilience.
              </p>
            </div>

            {/* Dimension 3: Edge Cases (20%) */}
            <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/80 dark:bg-[#16061D]/80 rounded-2xl shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">Edge Cases & Scale</span>
                <span className="font-mono text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00]">20%</span>
              </div>
              <div className="h-2 w-full bg-[#E5DFD5] dark:bg-[#250C3D] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00] rounded-full" style={{ width: '20%' }}></div>
              </div>
              <p className="text-[11px] text-[#555555] dark:text-slate-300 mt-2.5 leading-snug font-sans">
                Failure mode mitigation, lock contention, and boundary verification.
              </p>
            </div>

            {/* Dimension 4: Communication (15%) */}
            <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/80 dark:bg-[#16061D]/80 rounded-2xl shadow-xs transition-all hover:shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-didone text-sm font-bold text-[#111111] dark:text-[#F8F6F1]">Communication Clarity</span>
                <span className="font-mono text-xs font-bold text-[#3A0F34] dark:text-[#EAAA00]">15%</span>
              </div>
              <div className="h-2 w-full bg-[#E5DFD5] dark:bg-[#250C3D] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A0F34] dark:bg-[#EAAA00] rounded-full" style={{ width: '15%' }}></div>
              </div>
              <p className="text-[11px] text-[#555555] dark:text-slate-300 mt-2.5 leading-snug font-sans">
                Structured explanations, clean rationale, and collaborative dialogue.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Deep-Dive Specification Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5DFD5] dark:divide-[#3A0F34]/50 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50">
          <button
            type="button"
            onClick={() => onNavigateTab('rubric')}
            className="group p-5 text-left bg-white/40 dark:bg-[#16061D]/40 hover:bg-white dark:hover:bg-[#250C3D]/50 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#111111] dark:text-[#F8F6F1] group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00]">
              <span className="font-didone text-sm">Evaluation Rubric</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#7A7875] dark:text-slate-400 group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00] group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-[11px] text-[#555555] dark:text-slate-300 font-sans">
              Calibrated 0.0–10.0 grading formula across 4 dimensions
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('workflow')}
            className="group p-5 text-left bg-white/40 dark:bg-[#16061D]/40 hover:bg-white dark:hover:bg-[#250C3D]/50 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#111111] dark:text-[#F8F6F1] group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00]">
              <span className="font-didone text-sm">State Lifecycle</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#7A7875] dark:text-slate-400 group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00] group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-[11px] text-[#555555] dark:text-slate-300 font-sans">
              Server-authoritative state transitions 01 to 04
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('sample-report')}
            className="group p-5 text-left bg-white/40 dark:bg-[#16061D]/40 hover:bg-white dark:hover:bg-[#250C3D]/50 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#111111] dark:text-[#F8F6F1] group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00]">
              <span className="font-didone text-sm">Sample Dossier</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#7A7875] dark:text-slate-400 group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00] group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-[11px] text-[#555555] dark:text-slate-300 font-sans">
              Inspect an executive Strong Pass evaluation deliverable
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('architecture')}
            className="group p-5 text-left bg-white/40 dark:bg-[#16061D]/40 hover:bg-white dark:hover:bg-[#250C3D]/50 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#111111] dark:text-[#F8F6F1] group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00]">
              <span className="font-didone text-sm">Architecture Specs</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#7A7875] dark:text-slate-400 group-hover:text-[#3A0F34] dark:group-hover:text-[#EAAA00] group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-[11px] text-[#555555] dark:text-slate-300 font-sans">
              Isolated layer design and relational data models
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
