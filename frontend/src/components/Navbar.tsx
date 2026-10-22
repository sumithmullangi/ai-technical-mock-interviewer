import React, { useState, useRef, useEffect } from 'react';
import {
  WifiOff,
  Activity,
  ArrowRight,
  Menu,
  X,
  RefreshCw,
  Layout,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  LogOut,
  History,
  ChevronDown,
} from 'lucide-react';
import type { HealthStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'landing' | 'console' | 'challenges' | 'workflow' | 'rubric' | 'sample-report' | 'architecture' | 'all';
export type ThemeMode = 'light' | 'dark';

interface NavbarProps {
  health: HealthStatus;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenSetup: () => void;
  onRefreshHealth?: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  activeTab = 'console',
  onSelectTab,
  onOpenSetup,
  onRefreshHealth,
  theme = 'light',
  onToggleTheme,
  onOpenAuth,
  onOpenHistory,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (tab: NavTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setMobileMenuOpen(false);
  };

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5DFD5] dark:border-[#3A0F34]/40 bg-[#FAF8F5]/90 dark:bg-[#100414]/90 backdrop-blur-md transition-colors duration-150 shadow-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between border-l border-r border-[#E5DFD5]/40 dark:border-[#3A0F34]/20 px-4 sm:px-6 lg:px-8 relative">
        {/* Brand: Stacked MOCK / INTERVIEW Wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34] p-1 -m-1 rounded-xl transition-all cursor-pointer"
            aria-label="MockInterview.ai Home"
          >
            {/* Elegant Editorial Monogram Badge */}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3A0F34] to-[#55164D] border border-[#3A0F34]/30 text-[#EAAA00] shadow-xs transition-transform group-hover:scale-105">
              <span className="font-didone font-bold text-sm tracking-wider text-[#EAAA00]">M</span>
            </div>

            {/* Stacked Wordmark in High-Contrast Didone Serif */}
            <div className="flex flex-col select-none">
              <span className="font-didone text-[11px] font-black tracking-[0.25em] text-[#111111] dark:text-[#F8F6F1] uppercase leading-none">
                MOCK
              </span>
              <span className="font-didone text-[10px] font-semibold tracking-[0.14em] text-[#3A0F34] dark:text-[#EAAA00] uppercase leading-none mt-0.5">
                INTERVIEW<span className="font-mono font-medium text-[9px] lowercase text-[#7A7875]">.ai</span>
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Application Navigation Tabs - Architectural Grid Segmented Bar (hidden on landing page) */}
        {activeTab !== 'landing' && (
          <nav className="hidden md:flex items-center rounded-full border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/70 dark:bg-[#1A0826]/70 p-1 text-[11px] font-mono tracking-wider uppercase backdrop-blur-md shadow-2xs" aria-label="Application Navigation">
            <button
              type="button"
              onClick={() => handleNavClick('console')}
              className={`rounded-full px-3.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'console'
                  ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                  : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
            <Layout className="h-3 w-3 text-[#EAAA00]" />
            <span>Studio</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('challenges')}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              activeTab === 'challenges'
                ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            Challenges
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('rubric')}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              activeTab === 'rubric'
                ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            Rubric
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('sample-report')}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              activeTab === 'sample-report'
                ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            Dossiers
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('architecture')}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            Architecture
          </button>
        </nav>
        )}

        {/* Right Actions, Health, Auth, Theme & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Backend Health Badge */}
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider transition-all shadow-2xs ${
              health.status === 'ok'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : health.status === 'loading'
                ? 'border-[#EAAA00]/40 bg-[#EAAA00]/10 text-[#3A0F34] dark:text-[#EAAA00]'
                : 'border-[#E5DFD5] dark:border-slate-800 bg-white/50 text-[#7A7875]'
            }`}
            title={
              health.status === 'ok'
                ? `System operational: ${health.app || 'FastAPI'} (${health.version || 'v0.1.0'})`
                : health.status === 'loading'
                ? 'Connecting to evaluation engine...'
                : `Engine offline (${health.error || 'Failed to fetch'})`
            }
          >
            {health.status === 'ok' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                </span>
                <span className="text-[10px] font-bold tracking-wider">Engine Active</span>
              </>
            ) : health.status === 'loading' ? (
              <>
                <Activity className="h-3 w-3 animate-spin text-[#EAAA00]" />
                <span className="text-[10px] font-semibold">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-[#7A7875]" />
                <span className="hidden sm:inline text-[10px] font-semibold">API Offline</span>
                {onRefreshHealth && (
                  <button
                    onClick={onRefreshHealth}
                    className="p-0.5 hover:text-[#111111] dark:hover:text-white transition"
                    title="Retry health check"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="theme-toggle-btn"
              data-testid="theme-toggle"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleTheme();
              }}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white/80 dark:bg-[#1A0826]/80 text-[#111111] dark:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#250C3D] transition-all shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34] cursor-pointer"
              title={theme === 'dark' ? 'Switch to warm ivory editorial theme' : 'Switch to nocturnal editorial theme'}
              aria-label={theme === 'dark' ? 'Switch to warm ivory editorial theme' : 'Switch to nocturnal editorial theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-[#EAAA00] transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#3A0F34] transition-transform hover:-rotate-12" />
              )}
            </button>
          )}

          {/* Authentication State: User Profile or Sign In / Sign Up */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-white dark:bg-[#1A0826] hover:bg-slate-50 dark:hover:bg-[#250C3D] transition text-[#111111] dark:text-[#F8F6F1] text-xs font-mono shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34] cursor-pointer"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#3A0F34] to-[#55164D] text-[#EAAA00] font-bold text-[10px]">
                  {userInitials}
                </div>
                <span className="hidden lg:inline-block max-w-[110px] truncate text-[11px] font-semibold">
                  {user.full_name}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5] dark:bg-[#1A0826] shadow-xl py-2 text-xs text-[#111111] dark:text-[#F8F6F1] z-50 animate-fadeIn font-mono overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-[#E5DFD5] dark:border-[#3A0F34]/40">
                    <p className="font-bold text-[#111111] dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-[11px] text-[#7A7875] truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenHistory) onOpenHistory();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-white dark:hover:bg-[#250C3D] flex items-center gap-2 text-[#111111] dark:text-slate-200 transition font-medium"
                  >
                    <History className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                    <span>Interview Dossier</span>
                  </button>

                  <div className="my-1 border-t border-[#E5DFD5] dark:border-[#3A0F34]/40" />

                  <button
                    type="button"
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="rounded-full px-3 py-1.5 text-[#7A7875] hover:text-[#111111] dark:hover:text-white transition flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
              >
                <LogIn className="h-3 w-3" />
                <span>{activeTab === 'landing' ? 'Sign in' : 'Log in'}</span>
              </button>
              {activeTab !== 'landing' && (
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('signup')}
                  className="rounded-full px-3.5 py-1.5 border border-[#3A0F34]/20 dark:border-[#EAAA00]/30 bg-white/80 dark:bg-[#1A0826] text-[#3A0F34] dark:text-[#EAAA00] hover:bg-[#3A0F34]/5 dark:hover:bg-[#EAAA00]/10 transition flex items-center gap-1.5 uppercase tracking-wider shadow-2xs cursor-pointer"
                >
                  <UserPlus className="h-3 w-3 text-[#EAAA00]" />
                  <span>Register</span>
                </button>
              )}
            </div>
          )}

          {/* Primary CTA: Crisp Architectural Button */}
          <button
            onClick={onOpenSetup}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#3A0F34] to-[#55164D] hover:from-[#2E0B29] hover:to-[#45103E] dark:bg-gradient-to-r dark:from-[#EAAA00] dark:to-[#ffca36] dark:text-[#100414] px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#F8F6F1] shadow-xs hover:shadow hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>{activeTab === 'landing' ? 'Start practicing' : 'Start Session'}</span>
            <ArrowRight className="h-3 w-3 stroke-[2.5] text-[#EAAA00] dark:text-[#100414]" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[#7A7875] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#FAF8F5] dark:bg-[#100414] px-4 pt-3 pb-5 space-y-2 text-xs font-mono text-[#111111] dark:text-slate-300 animate-fadeIn">
          {/* User Status in Mobile */}
          {isAuthenticated && user ? (
            <div className="p-3.5 bg-white dark:bg-[#1A0826] border border-[#E5DFD5] dark:border-[#3A0F34]/50 rounded-2xl shadow-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3A0F34] to-[#55164D] text-[#EAAA00] font-bold text-xs shadow-2xs">
                  {userInitials}
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-[#111111] dark:text-white">{user.full_name}</div>
                  <div className="text-[10px] text-[#7A7875] truncate">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenHistory?.();
                  }}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34] rounded-xl text-xs font-semibold text-[#111111] dark:text-[#F8F6F1] flex items-center justify-center gap-1.5 transition hover:bg-white cursor-pointer"
                >
                  <History className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                  <span>Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="py-2 px-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1 pb-2 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.('login');
                }}
                className="flex-1 py-2 px-3 border border-[#E5DFD5] dark:border-[#3A0F34] rounded-xl bg-white dark:bg-[#1A0826] text-xs font-bold text-[#111111] dark:text-slate-200 flex items-center justify-center gap-1.5 uppercase tracking-wider transition shadow-2xs cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Log in</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.('signup');
                }}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-[#3A0F34] to-[#55164D] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider transition cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#EAAA00]" />
                <span>Sign up</span>
              </button>
            </div>
          )}

          {activeTab === 'landing' ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSetup();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-bold shadow-xs flex items-center justify-between cursor-pointer"
              >
                <span>Start practicing</span>
                <ArrowRight className="h-4 w-4 text-[#EAAA00] dark:text-[#120516]" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('workflow')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white dark:hover:bg-[#1A0826] text-[#555555] dark:text-slate-300 font-medium cursor-pointer"
              >
                How it works
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('console')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white dark:hover:bg-[#1A0826] text-[#555555] dark:text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
              >
                <Layout className="h-4 w-4 text-[#EAAA00]" />
                <span>Practice Studio</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('console')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'console'
                    ? 'bg-[#3A0F34] text-white font-bold shadow-xs'
                    : 'hover:bg-white dark:hover:bg-[#1A0826]'
                }`}
              >
                <Layout className="h-4 w-4 text-[#EAAA00]" />
                <span>Practice Studio</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('challenges')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'challenges'
                    ? 'bg-[#3A0F34] text-white font-bold shadow-xs'
                    : 'hover:bg-white dark:hover:bg-[#1A0826]'
                }`}
              >
                Challenge Bank
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('rubric')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'rubric'
                    ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                    : 'hover:bg-white dark:hover:bg-[#1A0826]'
                }`}
              >
                4D Evaluation Rubric
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('sample-report')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'sample-report'
                    ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                    : 'hover:bg-white dark:hover:bg-[#1A0826]'
                }`}
              >
                Candidate Dossiers
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('architecture')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'architecture'
                    ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                    : 'hover:bg-white dark:hover:bg-[#1A0826]'
                }`}
              >
                System Architecture
              </button>
            </>
          )}

          {/* Mobile Theme Toggle */}
          {onToggleTheme && (
            <div className="pt-2 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50">
              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white dark:hover:bg-[#1A0826] flex items-center justify-between text-xs font-semibold"
              >
                <span>Theme</span>
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#EAAA00]" />
                    <span>Warm Ivory Editorial</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#3A0F34]" />
                    <span>Nocturnal Editorial</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
