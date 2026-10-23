import React, { useEffect, useState } from 'react';
import {
  Home,
  Briefcase,
  PlayCircle,
  FileText,
  Plus,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserInterviewHistoryItem } from '../types/auth';
import type { NavTab } from './Navbar';

interface DashboardProps {
  onNewInterview: () => void;
  onResumeSession: (sessionId: string) => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenAuth?: (mode: 'login') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNewInterview,
  onResumeSession,
  onNavigateTab,
  onOpenAuth,
  theme = 'light',
  onToggleTheme,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<UserInterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'home' | 'my-interviews' | 'practice' | 'reports' | 'profile' | 'settings'>('my-interviews');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const token = sessionStorage.getItem('mockinterview_auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/v1/interviews/history`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        setError('Please log in to synchronize your interview history.');
      } else {
        setError(`Failed to retrieve interview records (Status ${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated]);

  // Derived real stats from user history
  const totalInterviews = history.length;
  const completedInterviews = history.filter(
    (item) => item.status === 'completed'
  ).length;

  // Real average score from completed sessions with scores
  const scoredItems = history.filter(
    (item) => typeof item.score === 'number' && item.score !== null
  );
  const realAverageScore = scoredItems.length > 0
    ? Math.round(scoredItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredItems.length)
    : null;

  // Interviews conducted in the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekInterviews = history.filter((item) => {
    const dStr = item.createdAt || item.created_at;
    if (!dStr) return false;
    return new Date(dStr) >= oneWeekAgo;
  }).length;

  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Candidate';

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100dvh-3.5rem)] bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] transition-colors">
      {/* 1. Deep Obsidian Sidebar (Reference Screen 3) */}
      <aside className="w-full md:w-60 bg-white dark:bg-[#0D0D10] text-[#111111] dark:text-white flex flex-col justify-between shrink-0 border-r border-[#E5DFD5] dark:border-[#1E1E24] relative z-20 transition-colors">
        <div>
          {/* Sidebar Brand Header */}
          <div className="p-6 border-b border-[#E5DFD5] dark:border-[#1E1E24] hidden md:flex items-center gap-2">
            <span className="font-serif font-bold text-lg tracking-wide text-[#111111] dark:text-white">
              MockInterview<span className="text-[#F59E0B]">.ai</span>
            </span>
          </div>

          {/* Sidebar Navigation Items (Reference Screen 3) */}
          <nav className="p-4 space-y-1.5 font-sans text-xs" aria-label="Dashboard Sidebar">
            <button
              type="button"
              id="sidebar-nav-home"
              onClick={() => {
                setActiveNav('home');
                onNavigateTab('landing');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
                activeNav === 'home'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold'
                  : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              id="sidebar-nav-my-interviews"
              onClick={() => setActiveNav('my-interviews')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
                activeNav === 'my-interviews'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold shadow-xs'
                  : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-[#F59E0B]" />
                <span>My Interviews</span>
              </div>
            </button>

            <button
              type="button"
              id="sidebar-nav-practice"
              onClick={() => {
                setActiveNav('practice');
                onNewInterview();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
                activeNav === 'practice'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold'
                  : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              <span>Practice</span>
            </button>

            <button
              type="button"
              id="sidebar-nav-reports"
              onClick={() => {
                setActiveNav('reports');
                const completedSess = history.find((h) => h.status === 'completed');
                if (completedSess) {
                  onResumeSession(completedSess.session_id);
                } else {
                  onNavigateTab('sample-report');
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
                activeNav === 'reports'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold'
                  : 'text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Reports</span>
            </button>

            <button
              type="button"
              id="sidebar-nav-profile"
              onClick={() => {
                setActiveNav('profile');
                onNavigateTab('profile');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              id="sidebar-nav-settings"
              onClick={() => {
                setActiveNav('settings');
                onNavigateTab('settings');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Card: Keep going! */}
        <div className="p-4 border-t border-[#E5DFD5] dark:border-[#1E1E24] space-y-3">
          <div className="rounded-2xl bg-[#FAF8F5] dark:bg-[#141417] p-3.5 text-[#111111] dark:text-white border border-[#E5DFD5] dark:border-[#232328]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#111111] dark:text-white">
                {thisWeekInterviews > 0 ? 'Keep going!' : 'Ready to begin?'}
              </span>
            </div>
            <p className="text-[10px] text-[#555555] dark:text-[#A1A1AA] mt-0.5">
              {thisWeekInterviews === 1
                ? '1 interview this week'
                : `${thisWeekInterviews} interviews this week`}
            </p>
            {/* Visual mini bar indicator */}
            <div className="mt-3 flex items-end gap-1.5 h-8">
              <div className="flex-1 bg-[#F59E0B]/30 rounded-sm h-3"></div>
              <div className="flex-1 bg-[#F59E0B] rounded-sm h-5"></div>
              <div className="flex-1 bg-[#F59E0B]/30 rounded-sm h-4"></div>
              <div className="flex-1 bg-[#F59E0B] rounded-sm h-6"></div>
              <div className="flex-1 bg-[#F59E0B]/30 rounded-sm h-2"></div>
              <div className="flex-1 bg-[#F59E0B] rounded-sm h-7"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-6xl overflow-y-auto">
        {/* Welcome Section Header + New Interview Action (Reference Screen 3) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E5DFD5] dark:border-[#232328]">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] dark:text-white">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="mt-1 text-sm text-[#555555] dark:text-[#A1A1AA] font-sans">
              Ready to practice today?
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle Button on Dashboard */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                id="dashboard-theme-toggle-btn"
                className="flex items-center justify-center h-11 w-11 rounded-full border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] text-[#111111] dark:text-[#F4F4F5] hover:bg-[#FAF8F5] dark:hover:bg-[#1C1C21] transition shadow-xs cursor-pointer"
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-[#F59E0B]" />
                ) : (
                  <Moon className="h-4 w-4 text-[#3A0F34]" />
                )}
              </button>
            )}

            <button
              type="button"
              id="dashboard-new-interview-btn"
              onClick={onNewInterview}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-6 py-3 text-sm font-sans font-bold tracking-wide shadow-md shadow-[#F59E0B]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#09090B]" />
              <span>New Interview</span>
            </button>
          </div>
        </div>

        {/* 3. Stat Summary Cards (4 Cards matching Reference Screen 3) */}
        <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" aria-label="Interview Statistics">
          {/* Card 1: Interviews Taken */}
          <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-[#555555] dark:text-[#A1A1AA]">
                Interviews Taken
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#F59E0B]">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-sans text-[#111111] dark:text-white">
                {totalInterviews}
              </span>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-[#555555] dark:text-[#A1A1AA]">
                Completed
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-sans text-[#111111] dark:text-white">
                {completedInterviews}
              </span>
            </div>
          </div>

          {/* Card 3: Average Score */}
          <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-[#555555] dark:text-[#A1A1AA]">
                Average Score
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#F59E0B]">
                <Award className="h-4 w-4 text-[#F59E0B]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-sans text-[#111111] dark:text-white">
                {realAverageScore !== null ? realAverageScore : '—'}
              </span>
            </div>
          </div>

          {/* Card 4: This Week */}
          <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-[#555555] dark:text-[#A1A1AA]">
                This Week
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#F59E0B]">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-sans text-[#111111] dark:text-white">
                {thisWeekInterviews}
              </span>
            </div>
          </div>
        </section>

        {/* 4. Pricing & Community Plan Banner (Honest & Informational) */}
        <section className="mt-8 rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-gradient-to-r from-amber-500/10 via-[#FAF8F5] to-white dark:from-[#F59E0B]/10 dark:via-[#141417] dark:to-[#18181C] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#B45309] dark:text-[#F59E0B] text-[11px] font-sans font-bold uppercase tracking-wider">
                Active Plan: Community Edition
              </span>
              <span className="text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400">
                100% Free Forever
              </span>
            </div>
            <p className="text-xs text-[#555555] dark:text-[#A1A1AA] font-sans">
              Unlimited mock sessions, speech synthesis, Gemini 2.5 Flash + OpenRouter fallback, and 4D evaluation dossiers. No credit card or subscription required.
            </p>
          </div>

          <button
            type="button"
            onClick={onNewInterview}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#3A0F34] dark:bg-[#F59E0B] hover:bg-[#4E1446] dark:hover:bg-[#D97706] text-white dark:text-[#09090B] px-5 py-2 text-xs font-sans font-bold shadow-xs transition cursor-pointer shrink-0"
          >
            <span>Practice Now</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#F59E0B] dark:text-[#09090B]" />
          </button>
        </section>

        {/* 5. Recommended for You Section (Reference Screen 3) */}
        <section className="mt-10" aria-label="Recommended Tracks">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-[#111111] dark:text-white">
              Recommended for you
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('challenges')}
              className="text-xs font-sans font-medium text-[#555555] dark:text-[#A1A1AA] hover:text-[#F59E0B] flex items-center gap-1 cursor-pointer transition"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recommendation 1: Software Engineer */}
            <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-sans text-base font-bold text-[#111111] dark:text-white">
                  Software Engineer
                </h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#7A7875] dark:text-[#A1A1AA] text-[11px] font-sans font-medium mt-1">
                  Most popular
                </span>
                <p className="mt-1 text-xs text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Distributed systems, caching & concurrency
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const saved = localStorage.getItem('mockinterview_preferences') || '{}';
                    const parsed = JSON.parse(saved);
                    parsed.preferred_role = 'Backend Engineer (Distributed Systems)';
                    localStorage.setItem('mockinterview_preferences', JSON.stringify(parsed));
                  } catch {}
                  onNewInterview();
                }}
                className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-4 py-2 text-xs font-sans font-bold transition cursor-pointer w-fit shadow-xs"
              >
                <span>Start</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Recommendation 2: Data Analyst */}
            <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-sans text-base font-bold text-[#111111] dark:text-white">
                  Data Pipeline Engineer
                </h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#7A7875] dark:text-[#A1A1AA] text-[11px] font-sans font-medium mt-1">
                  High demand
                </span>
                <p className="mt-1 text-xs text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Stream processing & backpressure control
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const saved = localStorage.getItem('mockinterview_preferences') || '{}';
                    const parsed = JSON.parse(saved);
                    parsed.preferred_role = 'Data & Analytics Pipeline Engineer';
                    localStorage.setItem('mockinterview_preferences', JSON.stringify(parsed));
                  } catch {}
                  onNewInterview();
                }}
                className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-4 py-2 text-xs font-sans font-bold transition cursor-pointer w-fit shadow-xs"
              >
                <span>Start</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Recommendation 3: Full-Stack Web Architect */}
            <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-sans text-base font-bold text-[#111111] dark:text-white">
                  Full-Stack Web Architect
                </h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#7A7875] dark:text-[#A1A1AA] text-[11px] font-sans font-medium mt-1">
                  Architecture & APIs
                </span>
                <p className="mt-1 text-xs text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Client-server sync & protocols
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const saved = localStorage.getItem('mockinterview_preferences') || '{}';
                    const parsed = JSON.parse(saved);
                    parsed.preferred_role = 'Full-Stack Web Architect';
                    localStorage.setItem('mockinterview_preferences', JSON.stringify(parsed));
                  } catch {}
                  onNewInterview();
                }}
                className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-4 py-2 text-xs font-sans font-bold transition cursor-pointer w-fit shadow-xs"
              >
                <span>Start</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* 6. Recent Interviews Section */}
        <section className="mt-10" aria-label="Recent Interviews">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-[#111111] dark:text-white">
              Recent Interviews
            </h2>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />}
              <button
                type="button"
                onClick={fetchHistory}
                disabled={isLoading}
                className="text-xs font-mono text-[#555555] dark:text-[#A1A1AA] hover:text-[#F59E0B] transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isAuthenticated ? (
            <div className="rounded-3xl border border-dashed border-[#E5DFD5] dark:border-[#232328] p-8 text-center bg-white/70 dark:bg-[#141417]/60">
              <p className="text-sm font-sans text-[#555555] dark:text-[#A1A1AA]">
                Sign in to your candidate account to save session history and review performance reports.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-2 text-xs font-bold cursor-pointer transition shadow-md shadow-[#F59E0B]/20"
              >
                <span>Sign In to Sync History</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : history.length === 0 ? (
            /* Clean Empty State for users with no interview records yet */
            <div className="rounded-3xl border border-dashed border-[#E5DFD5] dark:border-[#232328] p-8 sm:p-12 text-center bg-white/70 dark:bg-[#141417]/60 space-y-3">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B]">
                <Briefcase className="h-6 w-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#111111] dark:text-white">
                No mock interviews recorded yet
              </h4>
              <p className="text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans max-w-md mx-auto">
                Launch your first technical practice session with realistic AI prompts, 4D rubric evaluation, and full dossier synthesis.
              </p>
              <button
                type="button"
                id="dashboard-empty-start-btn"
                onClick={onNewInterview}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-2.5 text-xs font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#09090B]" />
                <span>Start First Mock Interview</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const dateStr = item.createdAt || item.created_at;
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                const questionCount = item.config?.question_count || item.config?.questionCount || 5;
                const roleName = item.config?.role || 'Technical Interview';
                const isCompleted = item.status === 'completed';
                const hasScore = typeof item.score === 'number' && item.score !== null;

                return (
                  <div
                    key={item.session_id}
                    className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] dark:bg-[#1C1C21] text-[#F59E0B] font-sans font-bold text-base">
                        {roleName.slice(0, 1)}
                      </div>

                      <div>
                        <h4 className="font-sans text-sm sm:text-base font-bold text-[#111111] dark:text-white">
                          {roleName}
                        </h4>
                        <p className="text-xs text-[#555555] dark:text-[#A1A1AA] font-sans mt-0.5">
                          {formattedDate} · {questionCount} questions · {isCompleted ? 'Completed' : 'In Progress'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold text-sm font-sans ${
                        hasScore
                          ? (item.score || 0) >= 80
                            ? 'border-emerald-500 bg-[#FAF8F5] dark:bg-[#0D0D10] text-emerald-600 dark:text-emerald-400'
                            : 'border-[#F59E0B] bg-[#FAF8F5] dark:bg-[#0D0D10] text-[#F59E0B]'
                          : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#0D0D10] text-[#7A7875]'
                      }`}>
                        {hasScore ? item.score : '—'}
                      </div>

                      <button
                        type="button"
                        onClick={() => onResumeSession(item.session_id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#1A1A1E] hover:bg-white dark:hover:bg-[#25252A] px-4 py-2 text-xs font-sans font-medium text-[#111111] dark:text-white shadow-xs transition cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#F59E0B]" />
                        <span>{isCompleted ? 'View Report' : 'Resume'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
