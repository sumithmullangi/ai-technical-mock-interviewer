import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Mic,
  MessageSquare,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { NavTab } from './Navbar';
import type { UserPreferences } from '../types/auth';

interface SettingsViewProps {
  onNavigateTab: (tab: NavTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigateTab,
  theme,
  onToggleTheme,
}) => {
  const { user, isAuthenticated, updateProfile, changePassword } = useAuth();

  // Load preferences from authenticated user or localStorage
  const [defaultMode, setDefaultMode] = useState<'voice' | 'text'>('voice');
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [preferredLanguage, setPreferredLanguage] = useState<'Python' | 'Java' | 'SQL'>('Python');
  const [preferredRole, setPreferredRole] = useState('Software Engineer — Distributed Systems');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General settings feedback
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check user preferences from backend
    if (user?.preferences) {
      if (user.preferences.default_mode) setDefaultMode(user.preferences.default_mode);
      if (typeof user.preferences.auto_play_voice === 'boolean') setAutoPlayVoice(user.preferences.auto_play_voice);
      if (user.preferences.question_count) setQuestionCount(user.preferences.question_count);
      if (user.preferences.preferred_language) setPreferredLanguage(user.preferences.preferred_language);
      if (user.preferences.preferred_role) setPreferredRole(user.preferences.preferred_role);
    } else {
      // Check local storage fallback
      try {
        const saved = localStorage.getItem('mockinterview_preferences');
        if (saved) {
          const parsed: UserPreferences = JSON.parse(saved);
          if (parsed.default_mode) setDefaultMode(parsed.default_mode);
          if (typeof parsed.auto_play_voice === 'boolean') setAutoPlayVoice(parsed.auto_play_voice);
          if (parsed.question_count) setQuestionCount(parsed.question_count);
          if (parsed.preferred_language) setPreferredLanguage(parsed.preferred_language);
          if (parsed.preferred_role) setPreferredRole(parsed.preferred_role);
        }
      } catch {}
    }
  }, [user]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsFeedback(null);
    setIsSavingPrefs(true);

    const newPrefs: UserPreferences = {
      theme,
      default_mode: defaultMode,
      auto_play_voice: autoPlayVoice,
      question_count: questionCount,
      preferred_language: preferredLanguage,
      preferred_role: preferredRole,
    };

    try {
      // 1. Always save to local storage for immediate browser preservation
      localStorage.setItem('mockinterview_preferences', JSON.stringify(newPrefs));

      // 2. If authenticated, persist to backend PostgreSQL
      if (isAuthenticated) {
        const res = await updateProfile({
          preferences: newPrefs,
        });

        if (!res.success) {
          setPrefsFeedback({ type: 'error', text: res.error || 'Failed to save preferences to server.' });
          return;
        }
      }

      setPrefsFeedback({ type: 'success', text: 'Application preferences saved successfully!' });
    } catch (err) {
      setPrefsFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error saving preferences.',
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.success) {
        setPasswordFeedback({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordFeedback({ type: 'error', text: res.error || 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error changing password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#E5DFD5] dark:border-[#232328] gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] text-xs font-mono font-medium text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#18181C] shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#F59E0B]" />
            <span>Dashboard</span>
          </button>
          <span className="text-xs font-mono uppercase tracking-wider text-[#7A7875] dark:text-[#A1A1AA]">
            // Application Settings
          </span>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="text-xs font-sans font-medium text-[#F59E0B] hover:underline cursor-pointer"
          >
            Open Profile &rarr;
          </button>
        )}
      </div>

      <div className="mt-8 space-y-8">
        {/* Section 1: Appearance & Theme */}
        <section className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
                Appearance & Theme
              </h3>
              <p className="text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans mt-0.5">
                Select your editorial interface theme. Changes take effect immediately.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {/* Nocturnal Obsidian + Amber */}
            <button
              type="button"
              onClick={() => {
                if (theme !== 'dark') onToggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
                theme === 'dark'
                  ? 'border-[#F59E0B] bg-[#18181C] shadow-sm ring-1 ring-[#F59E0B]'
                  : 'border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#101013] hover:border-[#F59E0B]/50'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#09090B] text-[#F59E0B] border border-[#232328]">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <span className="block font-sans font-bold text-sm text-[#111111] dark:text-white">
                  Nocturnal Obsidian
                </span>
                <span className="block text-xs text-[#555555] dark:text-[#A1A1AA] mt-0.5">
                  Deep dark palette with high-contrast amber accents.
                </span>
              </div>
            </button>

            {/* Warm Ivory + Amber */}
            <button
              type="button"
              onClick={() => {
                if (theme !== 'light') onToggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
                theme === 'light'
                  ? 'border-[#F59E0B] bg-white shadow-sm ring-1 ring-[#F59E0B]'
                  : 'border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#101013] hover:border-[#F59E0B]/50'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F6F1] text-[#3A0F34] border border-[#E5DFD5]">
                <Sun className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div>
                <span className="block font-sans font-bold text-sm text-[#111111] dark:text-white">
                  Warm Ivory Editorial
                </span>
                <span className="block text-xs text-[#555555] dark:text-[#A1A1AA] mt-0.5">
                  Warm paper tone with dark plum and amber highlights.
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Section 2: Interview Preferences */}
        <section className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSavePreferences} className="space-y-6">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white">
                Interview Defaults
              </h3>
              <p className="text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans mt-0.5">
                Customize how mock interviews are set up by default across all practice sessions.
              </p>
            </div>

            {prefsFeedback && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-sans flex items-center gap-2.5 animate-fadeIn ${
                  prefsFeedback.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}
              >
                {prefsFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span>{prefsFeedback.text}</span>
              </div>
            )}

            <div className="space-y-5 font-sans text-xs sm:text-sm">
              {/* Default Mode: Voice vs Text */}
              <div>
                <label className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-2">
                  Default Interaction Mode
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setDefaultMode('voice')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer font-medium ${
                      defaultMode === 'voice'
                        ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B] font-bold'
                        : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                    }`}
                  >
                    <Mic className="h-4 w-4 text-[#F59E0B]" />
                    <span>Voice Interview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultMode('text')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer font-medium ${
                      defaultMode === 'text'
                        ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B] font-bold'
                        : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-[#F59E0B]" />
                    <span>Written / Text</span>
                  </button>
                </div>
              </div>

              {/* Auto-play voice prompts toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#232328]">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#111111] dark:text-white block">
                    Audio Read-Aloud
                  </span>
                  <span className="text-xs text-[#555555] dark:text-[#A1A1AA] block">
                    Automatically speak challenge questions and follow-ups via speech synthesis.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer p-0.5 ${
                    autoPlayVoice ? 'bg-[#F59E0B]' : 'bg-[#D4CFC7] dark:bg-[#2A2A30]'
                  }`}
                  aria-label="Toggle voice auto-play"
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      autoPlayVoice ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Default Question Count */}
              <div>
                <label className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-2">
                  Default Challenge Count
                </label>
                <div className="flex items-center gap-3">
                  {[3, 5, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold transition cursor-pointer ${
                        questionCount === count
                          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#09090B]'
                          : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {count} Challenges
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-2">
                  Primary Coding Language
                </label>
                <div className="flex items-center gap-3">
                  {(['Python', 'Java', 'SQL'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreferredLanguage(lang)}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        preferredLanguage === lang
                          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#09090B]'
                          : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between">
              <span className="text-xs text-[#7A7875] dark:text-[#A1A1AA] font-mono">
                {isAuthenticated ? 'Synchronized with account database' : 'Persists in local storage'}
              </span>

              <button
                type="submit"
                id="save-preferences-btn"
                disabled={isSavingPrefs}
                className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-6 py-2.5 text-xs font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSavingPrefs ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#09090B]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Section 3: Account Security (Authenticated Users Only) */}
        {isAuthenticated && (
          <section className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#F59E0B]" />
                  <span>Account Security & Password</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans mt-0.5">
                  Update your candidate account password using secure Argon2id hashing.
                </p>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-sans flex items-center gap-2.5 animate-fadeIn ${
                    passwordFeedback.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <div className="space-y-4 font-sans text-xs sm:text-sm max-w-lg">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5"
                  >
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] px-3.5 py-2.5 text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5"
                  >
                    New Password (min 8 chars with number)
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] px-3.5 py-2.5 text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-new-password"
                    className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] px-3.5 py-2.5 text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between">
                <span className="text-xs text-[#7A7875] dark:text-[#A1A1AA] font-mono">
                  Argon2id encryption enabled
                </span>

                <button
                  type="submit"
                  id="update-password-btn"
                  disabled={isChangingPassword}
                  className="inline-flex items-center gap-2 rounded-full bg-[#3A0F34] dark:bg-[#F59E0B] hover:bg-[#4E1446] dark:hover:bg-[#D97706] text-white dark:text-[#09090B] px-6 py-2.5 text-xs font-sans font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};
