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
  User,
  Settings,
} from 'lucide-react';
import type { HealthStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'landing' | 'dashboard' | 'console' | 'challenges' | 'workflow' | 'rubric' | 'sample-report' | 'architecture' | 'all' | 'settings' | 'profile';
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
    <header className="sticky top-0 z-40 w-full border-b border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5]/90 dark:bg-[#09090B]/90 backdrop-blur-md transition-colors duration-150 shadow-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between border-l border-r border-[#E5DFD5]/60 dark:border-[#232328]/40 px-4 sm:px-6 lg:px-8 relative">
        {/* Brand: Clean MockInterview.ai Wordmark matching Reference Screen 1 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="group flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] p-1 -m-1 rounded-xl transition-all cursor-pointer"
            aria-label="MockInterview.ai Home"
          >
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#111111] dark:text-white">
              MockInterview<span className="text-[#F59E0B]">.ai</span>
            </span>
          </button>
        </div>

        {/* Landing Page Navigation Links (Reference Screen 1) */}
        {activeTab === 'landing' && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-sans font-medium text-[#555555] dark:text-[#A1A1AA]">
            <button
              type="button"
              onClick={() => handleNavClick('workflow')}
              className="hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('workflow')}
              className="hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('landing')}
              className="hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            >
              Reviews
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('landing')}
              className="hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            >
              Pricing
            </button>
          </nav>
        )}

        {/* Desktop Application Navigation Tabs - Architectural Grid Segmented Bar (hidden on landing page) */}
        {activeTab !== 'landing' && (
          <nav className="hidden md:flex items-center rounded-full border border-[#E5DFD5] dark:border-[#232328] bg-white/70 dark:bg-[#141417]/70 p-1 text-[11px] font-mono tracking-wider uppercase backdrop-blur-md shadow-2xs" aria-label="Application Navigation">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                  : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('console')}
              className={`rounded-full px-3.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'console'
                  ? 'bg-[#3A0F34] text-[#F8F6F1] font-bold shadow-xs'
                  : 'text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
            <Layout className="h-3 w-3 text-[#F59E0B]" />
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
                ? 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#3A0F34] dark:text-[#F59E0B]'
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
                <Activity className="h-3 w-3 animate-spin text-[#F59E0B]" />
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
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[#E5DFD5] dark:border-[#232328] bg-white/80 dark:bg-[#141417]/80 text-[#111111] dark:text-[#F4F4F5] hover:bg-white dark:hover:bg-[#18181C] transition-all shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34] cursor-pointer"
              title={theme === 'dark' ? 'Switch to warm ivory editorial theme' : 'Switch to nocturnal editorial theme'}
              aria-label={theme === 'dark' ? 'Switch to warm ivory editorial theme' : 'Switch to nocturnal editorial theme'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-[#F59E0B] transition-transform hover:rotate-45" />
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
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] hover:bg-slate-50 dark:hover:bg-[#18181C] transition text-[#111111] dark:text-[#F4F4F5] text-xs font-mono shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34] cursor-pointer"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2E0A24] text-[#D48324] font-bold text-[10px]">
                  {userInitials}
                </div>
                <span className="hidden lg:inline-block max-w-[110px] truncate text-[11px] font-semibold">
                  {user.full_name}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#141417] shadow-xl py-2 text-xs text-[#111111] dark:text-[#F4F4F5] z-50 animate-fadeIn font-mono overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-[#E5DFD5] dark:border-[#232328]">
                    <p className="font-bold text-[#111111] dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-[11px] text-[#7A7875] truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    id="nav-user-dropdown-history"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenHistory) {
                        onOpenHistory();
                      } else {
                        handleNavClick('dashboard');
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-white dark:hover:bg-[#18181C] flex items-center gap-2 text-[#111111] dark:text-slate-200 transition font-medium cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-[#2E0A24] dark:text-[#D48324]" />
                    <span>My Interviews & History</span>
                  </button>

                  <button
                    type="button"
                    id="nav-user-dropdown-profile"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleNavClick('profile');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-white dark:hover:bg-[#18181C] flex items-center gap-2 text-[#111111] dark:text-slate-200 transition font-medium cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-[#2E0A24] dark:text-[#D48324]" />
                    <span>Candidate Profile</span>
                  </button>

                  <button
                    type="button"
                    id="nav-user-dropdown-settings"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleNavClick('settings');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-white dark:hover:bg-[#18181C] flex items-center gap-2 text-[#111111] dark:text-slate-200 transition font-medium cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-[#2E0A24] dark:text-[#D48324]" />
                    <span>Settings & Preferences</span>
                  </button>

                  <div className="my-1 border-t border-[#E5DFD5] dark:border-[#232328]" />

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
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="nav-sign-in-btn"
                onClick={() => onOpenAuth?.('login')}
                className="text-sm font-sans font-medium text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition px-2 py-1 cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={onOpenSetup}
                id="nav-get-started-btn"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-2 text-xs sm:text-sm font-sans font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#09090B]" />
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[#E5DFD5] dark:border-[#232328] text-[#7A7875] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#100414] px-4 pt-3 pb-5 space-y-2 text-xs font-mono text-[#111111] dark:text-slate-300 animate-fadeIn">
          {/* User Status in Mobile */}
          {isAuthenticated && user ? (
            <div className="p-3.5 bg-white dark:bg-[#141417] border border-[#E5DFD5] dark:border-[#232328] rounded-2xl shadow-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3A0F34] to-[#55164D] text-[#F59E0B] font-bold text-xs shadow-2xs">
                  {userInitials}
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-[#111111] dark:text-white">{user.full_name}</div>
                  <div className="text-[10px] text-[#7A7875] truncate">{user.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavClick('dashboard');
                  }}
                  className="py-2 px-3 bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#27272E] rounded-xl text-xs font-semibold text-[#111111] dark:text-[#F4F4F5] flex items-center justify-center gap-1.5 transition hover:bg-white cursor-pointer"
                >
                  <History className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#F59E0B]" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavClick('profile');
                  }}
                  className="py-2 px-3 bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#27272E] rounded-xl text-xs font-semibold text-[#111111] dark:text-[#F4F4F5] flex items-center justify-center gap-1.5 transition hover:bg-white cursor-pointer"
                >
                  <User className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#F59E0B]" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavClick('settings');
                  }}
                  className="py-2 px-3 bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#27272E] rounded-xl text-xs font-semibold text-[#111111] dark:text-[#F4F4F5] flex items-center justify-center gap-1.5 transition hover:bg-white cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#F59E0B]" />
                  <span>Settings</span>
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
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1 pb-2 border-b border-[#E5DFD5] dark:border-[#232328]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.('login');
                }}
                className="flex-1 py-2 px-3 border border-[#E5DFD5] dark:border-[#27272E] rounded-xl bg-white dark:bg-[#141417] text-xs font-bold text-[#111111] dark:text-slate-200 flex items-center justify-center gap-1.5 uppercase tracking-wider transition shadow-2xs cursor-pointer"
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
                <UserPlus className="h-3.5 w-3.5 text-[#F59E0B]" />
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
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#3A0F34] dark:bg-[#F59E0B] text-white dark:text-[#09090B] font-bold shadow-xs flex items-center justify-between cursor-pointer"
              >
                <span>Start practicing</span>
                <ArrowRight className="h-4 w-4 text-[#F59E0B] dark:text-[#09090B]" />
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
                <Layout className="h-4 w-4 text-[#F59E0B]" />
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
                <Layout className="h-4 w-4 text-[#F59E0B]" />
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
            <div className="pt-2 border-t border-[#E5DFD5] dark:border-[#232328]">
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
                    <Sun className="h-3.5 w-3.5 text-[#F59E0B]" />
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
