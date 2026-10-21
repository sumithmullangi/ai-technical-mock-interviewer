import React, { useState } from 'react';
import { Terminal, Shield, WifiOff, Activity, ArrowRight, Menu, X, RefreshCw, Layout, Sun, Moon } from 'lucide-react';
import type { HealthStatus } from '../types';

export type NavTab = 'console' | 'workflow' | 'rubric' | 'sample-report' | 'architecture' | 'all';
export type ThemeMode = 'light' | 'dark';

interface NavbarProps {
  health: HealthStatus;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenSetup: () => void;
  onRefreshHealth?: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  activeTab = 'console',
  onSelectTab,
  onOpenSetup,
  onRefreshHealth,
  theme = 'light',
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleNavClick('console')}
            className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1 -m-1"
            aria-label="MockInterview.ai Console"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-blue-600 text-white shadow-2xs transition-transform group-hover:scale-105">
              <Terminal className="h-4 w-4 text-blue-400 dark:text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  MockInterview<span className="text-blue-600 dark:text-blue-400">.ai</span>
                </span>
                <span className="hidden sm:inline-flex rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  v0.1.0
                </span>
              </div>
              <span className="hidden text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:block -mt-0.5">
                Technical Interview Simulator
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Application Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold" aria-label="Application Navigation">
          <button
            type="button"
            onClick={() => handleNavClick('console')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'console'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
            <span>Interview Console</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('rubric')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'rubric'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Evaluation Rubric
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('workflow')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'workflow'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Workflow
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('sample-report')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'sample-report'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Sample Report
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('architecture')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'architecture'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Architecture
          </button>
        </nav>

        {/* Right Actions, Health Status & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Backend Health Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
              health.status === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400'
                : health.status === 'loading'
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400'
                : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
            }`}
            title={
              health.status === 'ok'
                ? `Backend online: ${health.app || 'FastAPI'} (${health.version || 'v0.1.0'})`
                : health.status === 'loading'
                ? 'Connecting to FastAPI backend /api/health...'
                : `Backend offline or waiting for uvicorn server (${health.error || 'Failed to fetch'})`
            }
          >
            {health.status === 'ok' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline font-semibold">API Online</span>
                <span className="sm:hidden font-semibold">Online</span>
              </>
            ) : health.status === 'loading' ? (
              <>
                <Activity className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline font-semibold">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-slate-500" />
                <span className="hidden sm:inline font-semibold">API Offline</span>
                {onRefreshHealth && (
                  <button
                    onClick={onRefreshHealth}
                    className="p-0.5 hover:text-slate-900 dark:hover:text-white transition"
                    title="Retry health check"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Security Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span>Non-Execution Review</span>
          </div>

          {/* Theme Toggle Button (Light / Black Mode) */}
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
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to black/dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to black/dark theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
              )}
            </button>
          )}

          {/* Primary CTA */}
          <button
            onClick={onOpenSetup}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 active:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span>Start Session</span>
            <ArrowRight className="h-3 w-3" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-2 pb-4 space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 animate-fadeIn">
          <button
            type="button"
            onClick={() => handleNavClick('console')}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'console'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layout className="h-4 w-4" />
            <span>Interview Console (Home)</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('rubric')}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeTab === 'rubric'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Four-Dimensional Rubric
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('workflow')}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeTab === 'workflow'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Interview Workflow
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('sample-report')}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeTab === 'sample-report'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sample Assessment Report
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('architecture')}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeTab === 'architecture'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Architecture & Milestones
          </button>

          {/* Mobile Theme Toggle Row */}
          {onToggleTheme && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme</span>
              <button
                id="mobile-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-slate-600" />
                    <span>Dark / Black Mode</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-3">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Non-execution static analysis
            </span>
            <span className="font-mono text-[10px]">FastAPI + Gemini</span>
          </div>
        </div>
      )}
    </header>
  );
};


