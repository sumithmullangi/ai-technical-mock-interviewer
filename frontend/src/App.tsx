import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureGrid } from './components/FeatureGrid';
import { InterviewSetupModal } from './components/InterviewSetupModal';
import { Footer } from './components/Footer';
import type { HealthStatus, ConfiguredSession } from './types';
import { Clock, Terminal, GitBranch, RefreshCw, Sparkles, Check } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ConfiguredSession | null>(null);

  const checkHealth = useCallback(async () => {
    setHealth({ status: 'loading' });
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/health');
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/health');
      }

      if (res && res.ok) {
        const data = await res.json();
        setHealth({
          status: 'ok',
          app: data.app || 'AI Mock Interviewer API',
          version: data.version || '0.1.0',
        });
      } else {
        setHealth({ status: 'error', error: `Status ${res?.status || 'unreachable'}` });
      }
    } catch (err: unknown) {
      setHealth({
        status: 'error',
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar health={health} onOpenSetup={() => setIsSetupOpen(true)} />

      {/* Main Content */}
      <main className="flex-1">
        {/* Active Configuration Ribbon */}
        {activeSession && (
          <div className="bg-indigo-950/70 border-b border-indigo-500/30 px-4 py-2 text-xs">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="font-semibold text-white">Active Configuration Verified:</span>
                <span className="text-indigo-200">
                  {activeSession.config.role} ({activeSession.config.difficulty}) • {activeSession.config.primaryLanguage} • {activeSession.config.questionCount} Questions
                </span>
                <span className="font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded border border-indigo-500/30 text-cyan-300">
                  {activeSession.sessionId}
                </span>
              </div>
              <button
                onClick={() => setIsSetupOpen(true)}
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline"
              >
                Modify Configuration
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <Hero
          onOpenSetup={() => setIsSetupOpen(true)}
          onScrollToFeatures={scrollToFeatures}
        />

        {/* Feature Grid & Scoring Rubrics */}
        <FeatureGrid />

        {/* Architecture & Milestone Roadmap Section */}
        <section className="py-16 border-t border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Engineering Roadmap
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Milestone-Based Architecture
                </h2>
                <p className="mt-2 text-sm text-slate-400 max-w-xl">
                  Built to the approved SRS specifications with strict modularity, clean boundaries, and verified deliverables.
                </p>
              </div>

              {/* Health status quick widget */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 self-start md:self-auto">
                <div className="text-xs">
                  <div className="text-slate-400">FastAPI Backend Health:</div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                    {health.status === 'ok' ? (
                      <span className="text-emerald-400">GET /api/health → 200 OK</span>
                    ) : health.status === 'loading' ? (
                      <span className="text-amber-400">Connecting...</span>
                    ) : (
                      <span className="text-rose-400">Offline (Start uvicorn)</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={checkHealth}
                  title="Refresh API Health"
                  className="rounded-md border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 4 Milestones Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Milestone 1 (Completed) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Check className="h-4 w-4" /> Milestone 1 (Complete)
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Scaffold & Baseline</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  FastAPI service with healthcheck & CORS, React 19 + TypeScript + Tailwind landing, and repo standards.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                  <span className="rounded bg-slate-800 px-2 py-0.5">FastAPI</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5">Vite</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5">Tailwind</span>
                </div>
              </div>

              {/* Milestone 2 (Active) */}
              <div className="relative rounded-xl border-2 border-indigo-500/60 bg-slate-900/90 p-5 shadow-lg shadow-indigo-500/10">
                <div className="absolute -top-3 right-4 rounded-full bg-indigo-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Active
                </div>
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> Milestone 2
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Configuration & Validation</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Functional setup modal, Pydantic configuration validation, and POST /api/v1/interviews/config integration.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-indigo-300">
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5">Pydantic v2</span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5">REST API</span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5">Live State</span>
                </div>
              </div>

              {/* Milestone 3 */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 opacity-80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Clock className="h-4 w-4" /> Milestone 3
                </div>
                <h3 className="mt-2 text-base font-bold text-white">State Machine & Gemini</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Backend-authoritative interview lifecycle (3–10 questions, max 2 follow-ups) with Gemini Pydantic validation.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                  <span className="rounded bg-slate-800 px-2 py-0.5">Gemini API</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5">State Engine</span>
                </div>
              </div>

              {/* Milestone 4 */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 opacity-80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Clock className="h-4 w-4" /> Milestone 4
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Persistence & Evaluation</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  PostgreSQL + SQLAlchemy 2.x persistence, Alembic migrations, guest & registered auth, and 4-dimension score breakdown.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                  <span className="rounded bg-slate-800 px-2 py-0.5">PostgreSQL</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5">Alembic</span>
                </div>
              </div>
            </div>

            {/* Quickstart Command Bar */}
            <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <span>Backend: <code className="text-emerald-400">uvicorn app.main:app --reload</code></span>
                  <span className="hidden sm:inline text-slate-600">|</span>
                  <span>Frontend: <code className="text-cyan-400">npm run dev</code></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Branch: <span className="text-slate-200 font-mono">main</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Setup / Configuration Modal */}
      <InterviewSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigSaved={(data) => {
          if (data) setActiveSession(data);
        }}
      />
    </div>
  );
}
