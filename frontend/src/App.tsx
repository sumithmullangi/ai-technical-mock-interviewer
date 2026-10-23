import { useState, useEffect, useCallback } from 'react';
import { Navbar, type NavTab } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { InterviewConsole } from './components/InterviewConsole';
import { FeatureGrid } from './components/FeatureGrid';
import { ChallengesView } from './components/ChallengesView';
import { InterviewSetupModal } from './components/InterviewSetupModal';
import { ActiveInterviewView } from './components/ActiveInterviewView';
import { Footer } from './components/Footer';
import { AuthModal, type AuthMode } from './components/AuthModal';
import { UserHistoryModal } from './components/UserHistoryModal';
import { AnimatedTitleIntro } from './components/AnimatedTitleIntro';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';
import type { HealthStatus, ConfiguredSession, StartedSessionData } from './types';
import { ArrowRight, AlertTriangle } from 'lucide-react';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ConfiguredSession | null>(null);
  const [startedSession, setStartedSession] = useState<StartedSessionData | null>(null);

  // Branded Editorial Title Intro state: default to false for real application (available via replay)
  const [showIntro, setShowIntro] = useState(false);

  // Authentication UI Modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [resetToken, setResetToken] = useState('');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  // User Interview History Modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Theme state: support light & dark themes (default to Obsidian + Amber dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const SAMPLE_COMPLETED_SESSION: StartedSessionData = {
    sessionId: 'sample-report-backend-oct21',
    session_id: 'sample-report-backend-oct21',
    status: 'completed',
    mode: 'text',
    started_at: '2026-10-21T10:00:00Z',
    config: {
      role: 'Software Engineer - Backend',
      difficulty: 'Mid-Level',
      primaryLanguage: 'Python',
      questionCount: 8,
      mode: 'text',
    },
    currentQuestion: {
      question_id: 'q8',
      questionId: 'q8',
      title: 'Distributed Systems & Hash Maps',
      prompt:
        'Can you explain how a hash map works internally and what makes it efficient? Also, what are some real-world use cases?',
      category: 'Data Structures',
      difficulty: 'Mid-Level',
    },
  };

  // Synchronize light/dark class on <html> and localStorage
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

  const openAuth = useCallback((mode: AuthMode = 'login', token = '') => {
    setAuthMode(mode);
    setResetToken(token);
    setIsAuthOpen(true);
    if (['login', 'signup', 'forgot-password', 'reset-password'].includes(mode)) {
      const search = token ? `?token=${encodeURIComponent(token)}` : '';
      window.history.pushState(null, '', `/${mode}${search}`);
    }
  }, []);

  const closeAuth = useCallback(() => {
    setIsAuthOpen(false);
    const path = window.location.pathname;
    if (['/login', '/signup', '/forgot-password', '/reset-password'].includes(path)) {
      window.history.pushState(null, '', '/');
    }
  }, []);

  const openHistory = useCallback(() => {
    if (!isAuthenticated) {
      openAuth('login');
      return;
    }
    setIsHistoryOpen(true);
    window.history.pushState(null, '', '/history');
  }, [isAuthenticated, openAuth]);

  const closeHistory = useCallback(() => {
    setIsHistoryOpen(false);
    if (window.location.pathname === '/history') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  // Listen for session expiration events
  useEffect(() => {
    const handleExpired = () => {
      setSessionExpiredNotice(true);
      openAuth('login');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [openAuth]);

  // Synchronize initial route from browser URL
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      if (path === '/practice' || path === '/studio' || path === '/setup') {
        setActiveTab('console');
      } else if (path === '/dashboard' || path === '/my-interviews') {
        setActiveTab('dashboard');
      } else if (path === '/challenges') {
        setActiveTab('challenges');
      } else if (path === '/workflow') {
        setActiveTab('workflow');
      } else if (path === '/rubric') {
        setActiveTab('rubric');
      } else if (path === '/sample-report') {
        setActiveTab('sample-report');
      } else if (path === '/architecture') {
        setActiveTab('architecture');
      } else if (path === '/' || path === '') {
        setActiveTab('landing');
      }

      if (path === '/login') {
        setAuthMode('login');
        setIsAuthOpen(true);
      } else if (path === '/signup') {
        setAuthMode('signup');
        setIsAuthOpen(true);
      } else if (path === '/forgot-password') {
        setAuthMode('forgot-password');
        setIsAuthOpen(true);
      } else if (path === '/reset-password') {
        setAuthMode('reset-password');
        setResetToken(params.get('token') || '');
        setIsAuthOpen(true);
      } else if (path === '/history') {
        setIsHistoryOpen(true);
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const res = await apiFetch(`${apiBase}/api/health`);

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

  const handleResumeSession = useCallback(async (sessionId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const res = await apiFetch(`${apiBase}/api/v1/interviews/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const sid = data.sessionId || data.session_id || sessionId;
        const status = data.status;

        if (status === 'completed') {
          setStartedSession({
            status: 'completed',
            session_id: sid,
            sessionId: sid,
            message: 'Viewing completed session evaluation report.',
            started_at: data.createdAt || data.created_at || new Date().toISOString(),
            config: data.config,
          });
          return;
        }

        // Fetch current active primary question from backend
        let questionData = data.currentQuestion || data.current_question;
        if (!questionData) {
          const qRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/question`);
          if (qRes.ok) {
            questionData = await qRes.json();
          } else {
            // Fallback to /questions list
            const qsRes = await apiFetch(`${apiBase}/api/v1/interviews/${sid}/questions`);
            if (qsRes.ok) {
              const qList = await qsRes.json();
              if (Array.isArray(qList) && qList.length > 0) {
                questionData = qList[qList.length - 1];
              }
            }
          }
        }

        setStartedSession({
          status: status,
          session_id: sid,
          sessionId: sid,
          current_question: questionData,
          currentQuestion: questionData,
          message: data.message || 'Session loaded.',
          started_at: data.createdAt || data.created_at || new Date().toISOString(),
          config: data.config,
        });

        // Ensure URL contains sessionId for refresh durability
        if (!window.location.search.includes(sid)) {
          window.history.replaceState(null, '', `?sessionId=${encodeURIComponent(sid)}`);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check for direct anchor hash routing (e.g. #challenges, #rubric, #workflow, #sample-report, #architecture, #console, #landing)
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'console', 'challenges', 'workflow', 'rubric', 'sample-report', 'architecture'].includes(hash)) {
      setActiveTab(hash as NavTab);
    }

    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('sessionId') || params.get('session_id');
    if (resumeId) {
      handleResumeSession(resumeId);
    }
  }, [checkHealth, handleResumeSession]);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    const pathMap: Record<NavTab, string> = {
      landing: '/',
      dashboard: '/dashboard',
      console: '/practice',
      challenges: '/challenges',
      workflow: '/workflow',
      rubric: '/rubric',
      'sample-report': '/sample-report',
      architecture: '/architecture',
      all: '/all',
    };
    const targetPath = pathMap[tab] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] flex flex-col font-sans antialiased transition-colors duration-150">
      {/* Full-viewport Editorial Animated Opening Title */}
      {showIntro && (
        <AnimatedTitleIntro
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* Expired Session Alert Banner */}
      {sessionExpiredNotice && (
        <div className="bg-white dark:bg-[#18181C] border-b border-[#F59E0B] text-[#111111] dark:text-[#F4F4F5] px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2 mx-auto">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
            <span>Your authentication session has expired. Please sign in again to continue.</span>
          </div>
          <button
            onClick={() => setSessionExpiredNotice(false)}
            className="text-xs text-[#F59E0B] hover:underline p-1 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navbar with App-First Tabs (only shown on landing page & secondary reference pages) */}
      {!startedSession && (activeTab === 'landing' || ['workflow', 'rubric', 'architecture', 'challenges'].includes(activeTab)) && (
        <Navbar
          health={health}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenSetup={() => handleSelectTab('console')}
          onRefreshHealth={checkHealth}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAuth={(mode) => openAuth(mode)}
          onOpenHistory={openHistory}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {startedSession ? (
          <div className="bg-[#F8F6F1] dark:bg-[#09090B] min-h-screen text-[#111111] dark:text-[#F4F4F5]">
            <ActiveInterviewView
              session={startedSession}
              onEndSession={() => {
                setStartedSession(null);
                window.history.replaceState({}, '', '/practice');
              }}
              onNavigateTab={handleSelectTab}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </div>
        ) : (
          <>
            {/* Active Configuration Banner Ribbon if pre-configured */}
            {activeSession && (
              <div className="bg-[#FAF8F5] dark:bg-[#141417] border-b border-[#E5DFD5] dark:border-[#232328] text-xs transition-colors">
                <div className="editorial-frame px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-l border-r border-[#E5DFD5] dark:border-[#232328] font-mono">
                  <div className="flex flex-wrap items-center gap-2 text-[#111111] dark:text-[#F4F4F5]">
                    <span className="flex h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
                    <span className="font-bold uppercase tracking-wider text-[11px]">Active Session Registered:</span>
                    <span className="text-[#555555] dark:text-slate-300 font-sans text-xs">
                      {activeSession.config.role} ({activeSession.config.difficulty}) • {activeSession.config.primaryLanguage} • {activeSession.config.questionCount} Challenges
                    </span>
                    <span className="font-mono text-[10px] bg-white dark:bg-[#18181C] px-2.5 py-0.5 rounded-full border border-[#E5DFD5] dark:border-[#27272E] text-[#3A0F34] dark:text-[#F4F4F5] font-semibold shadow-2xs">
                      {activeSession.sessionId || activeSession.session_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wider">
                    <button
                      onClick={() => setIsSetupOpen(true)}
                      className="font-semibold text-[#3A0F34] dark:text-[#F59E0B] hover:underline transition-colors cursor-pointer"
                    >
                      Parameters
                    </button>
                    <button
                      onClick={() => setIsSetupOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#3A0F34] bg-[#3A0F34] hover:bg-[#4E1446] dark:bg-[#F59E0B] dark:hover:bg-[#d89c00] dark:text-[#09090B] dark:border-[#F59E0B] px-3.5 py-1.5 font-bold text-white shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    >
                      <span>Resume Modal</span>
                      <ArrowRight className="h-3 w-3 text-[#F59E0B] dark:text-[#09090B]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Public Single-Screen Landing Page */}
            {activeTab === 'landing' ? (
              <LandingPage
                onStartPracticing={() => handleSelectTab('console')}
                onHowItWorks={() => handleSelectTab('workflow')}
                onExploreChallenges={() => handleSelectTab('challenges')}
                onEnterStudio={() => handleSelectTab('console')}
              />
            ) : activeTab === 'dashboard' ? (
              <Dashboard
                onNewInterview={() => handleSelectTab('console')}
                onResumeSession={handleResumeSession}
                onNavigateTab={handleSelectTab}
                onOpenAuth={openAuth}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            ) : activeTab === 'console' ? (
              <InterviewConsole
                onStartSession={(startedData) => setStartedSession(startedData)}
                onConfigSaved={(configuredData) => setActiveSession(configuredData)}
                onOpenSetupModal={() => handleSelectTab('console')}
                onNavigateTab={handleSelectTab}
                healthOk={health.status === 'ok'}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            ) : activeTab === 'sample-report' ? (
              <div className="bg-[#F8F6F1] dark:bg-[#09090B] min-h-screen text-[#111111] dark:text-[#F4F4F5]">
                <ActiveInterviewView
                  session={SAMPLE_COMPLETED_SESSION}
                  onEndSession={() => handleSelectTab('dashboard')}
                  onNavigateTab={handleSelectTab}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                />
              </div>
            ) : activeTab === 'challenges' ? (
              <ChallengesView
                onStartSession={(startedData) => setStartedSession(startedData)}
                onConfigSaved={(configuredData) => setActiveSession(configuredData)}
                onSwitchToStudio={() => handleSelectTab('console')}
              />
            ) : (
              /* Secondary Reference / Documentation Views (Workflow, Rubric, Architecture) */
              <FeatureGrid
                activeSection={activeTab}
                onSelectSection={handleSelectTab}
                onBackToConsole={() => handleSelectTab('landing')}
              />
            )}
          </>
        )}
      </main>

      {/* Global Footer: Rendered on interior secondary documentation views */}
      {!startedSession && ['workflow', 'rubric', 'architecture', 'challenges'].includes(activeTab) && (
        <Footer
          onOpenSetup={() => handleSelectTab('console')}
          onReplayIntro={() => setShowIntro(true)}
        />
      )}

      {/* Setup / Configuration Modal */}
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

      {/* User Authentication Modal (/login, /signup, /forgot-password, /reset-password) */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        resetToken={resetToken}
        onClose={closeAuth}
        onSuccess={() => {
          setSessionExpiredNotice(false);
          closeAuth();
        }}
      />

      {/* Authenticated User Interview History Modal */}
      <UserHistoryModal
        isOpen={isHistoryOpen}
        onClose={closeHistory}
        onResumeSession={handleResumeSession}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
