import { useState, useEffect, useCallback } from 'react';
import { Navbar, type NavTab } from './components/Navbar';
import { InterviewConsole } from './components/InterviewConsole';
import { FeatureGrid } from './components/FeatureGrid';
import { InterviewSetupModal } from './components/InterviewSetupModal';
import { ActiveInterviewView } from './components/ActiveInterviewView';
import { Footer } from './components/Footer';
import type { HealthStatus, ConfiguredSession, StartedSessionData } from './types';
import { ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('console');
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ConfiguredSession | null>(null);
  const [startedSession, setStartedSession] = useState<StartedSessionData | null>(null);

  // Theme state: default to localStorage preference, or OS preference, fallback to light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // Synchronize dark class on <html> and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore storage quota / access issues
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const res = await fetch(`${apiBase}/api/health`);

      if (res.ok) {
        const data = await res.json();
        setHealth({
          status: 'ok',
          app: data.app || 'AI Mock Interviewer API',
          version: data.version || '0.1.0',
        });
      } else {
        setHealth({ status: 'error', error: `Status ${res.status}` });
      }
    } catch (err: unknown) {
      setHealth({
        status: 'error',
        error:
          err instanceof TypeError && err.message === 'Failed to fetch'
            ? 'API Offline (Failed to fetch)'
            : err instanceof Error
            ? err.message
            : 'Connection failed',
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check for direct anchor hash routing (e.g. #rubric, #workflow, #sample-report, #architecture)
    const hash = window.location.hash.replace('#', '');
    if (['workflow', 'rubric', 'sample-report', 'architecture'].includes(hash)) {
      setActiveTab(hash as NavTab);
    }

    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('sessionId') || params.get('session_id');
    if (!resumeId) return;

    const loadSession = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const res = await fetch(`${apiBase}/api/v1/interviews/${resumeId}`);
        if (res.ok) {
          const data = await res.json();
          const sid = data.sessionId || data.session_id;
          const status = data.status;
          setStartedSession({
            status: status,
            session_id: sid,
            current_question: {
              question_number: 1,
              topic: 'Technical Interview',
              difficulty: data.config.difficulty,
              question_text: 'Technical interview session.',
              expected_concepts: [],
            },
            message: data.message || 'Session loaded.',
            started_at: data.createdAt || data.created_at || new Date().toISOString(),
            config: data.config,
          });
        }
      } catch (err) {
        console.error('Failed to load session from URL query parameter:', err);
      }
    };
    loadSession();
  }, [checkHealth]);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors duration-150">
      {/* Top Navbar with App-First Tabs */}
      <Navbar
        health={health}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenSetup={() => setIsSetupOpen(true)}
        onRefreshHealth={checkHealth}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {startedSession ? (
          <div className="bg-slate-950 min-h-screen text-slate-100">
            <ActiveInterviewView
              session={startedSession}
              onEndSession={() => {
                setStartedSession(null);
                window.history.replaceState({}, '', window.location.pathname);
              }}
            />
          </div>
        ) : (
          <>
            {/* Active Configuration Banner Ribbon if pre-configured */}
            {activeSession && (
              <div className="bg-blue-50 border-b border-blue-200/90 dark:bg-blue-950/40 dark:border-blue-900/60 px-4 py-2 text-xs transition-colors">
                <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-slate-800 dark:text-slate-200">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-slate-900 dark:text-white">Configured Session Registered:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeSession.config.role} ({activeSession.config.difficulty}) • {activeSession.config.primaryLanguage} • {activeSession.config.questionCount} Challenges
                    </span>
                    <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold">
                      {activeSession.sessionId || activeSession.session_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setIsSetupOpen(true)}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                    >
                      Parameters
                    </button>
                    <button
                      onClick={() => setIsSetupOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
                    >
                      <span>Resume Modal</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Application-First Home Screen (Default Console) */}
            {activeTab === 'console' ? (
              <InterviewConsole
                onStartSession={(startedData) => setStartedSession(startedData)}
                onConfigSaved={(configuredData) => setActiveSession(configuredData)}
                onOpenSetupModal={() => setIsSetupOpen(true)}
                onNavigateTab={handleSelectTab}
                healthOk={health.status === 'ok'}
              />
            ) : (
              /* Secondary Reference / Documentation Views (Workflow, Rubric, Sample Report, Architecture) */
              <FeatureGrid
                activeSection={activeTab}
                onSelectSection={handleSelectTab}
                onBackToConsole={() => handleSelectTab('console')}
              />
            )}
          </>
        )}
      </main>

      {/* Global Footer */}
      {!startedSession && (
        <Footer onOpenSetup={() => setIsSetupOpen(true)} />
      )}

      {/* Setup / Configuration Modal (Preserved & Fully Functional) */}
      <InterviewSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigSaved={(data) => {
          if (data) setActiveSession(data);
        }}
        onSessionStarted={(startedData) => {
          setStartedSession(startedData);
        }}
      />
    </div>
  );
}

