import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { NavTab } from './Navbar';
import type { UserInterviewHistoryItem } from '../types/auth';

interface ProfileViewProps {
  onNavigateTab: (tab: NavTab) => void;
  onOpenAuth?: (mode: 'login') => void;
  theme?: 'light' | 'dark';
}

const PRESET_ROLES = [
  'Software Engineer — Distributed Systems',
  'Full-Stack Web Architect',
  'Systems Infrastructure & Reliability',
  'Data & Pipeline Systems Engineer',
  'Frontend Developer',
  'Product Manager',
];

const PRESET_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Staff'];

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigateTab,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [targetRole, setTargetRole] = useState(user?.target_role || '');
  const [experienceLevel, setExperienceLevel] = useState(user?.experience_level || 'Mid-Level');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real statistics from interview history
  const [history, setHistory] = useState<UserInterviewHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setTargetRole(user.target_role || 'Software Engineer — Distributed Systems');
      setExperienceLevel(user.experience_level || 'Mid-Level');
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const token = sessionStorage.getItem('mockinterview_auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${apiBase}/api/v1/interviews/history`, {
          headers,
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Failed to load user history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [isAuthenticated]);

  // Compute real metrics
  const totalInterviews = history.length;
  const completedInterviews = history.filter((i) => i.status === 'completed').length;
  const scoredItems = history.filter((i) => typeof i.score === 'number' && i.score !== null);
  const averageScore = scoredItems.length > 0
    ? Math.round(scoredItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredItems.length)
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setStatusMessage({ type: 'error', text: 'Full name must be at least 2 characters long.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        full_name: trimmedName,
        target_role: targetRole.trim() || undefined,
        experience_level: experienceLevel || undefined,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Profile changes saved successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-8 sm:p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] mb-4">
            <UserIcon className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#111111] dark:text-white">
            Candidate Profile
          </h2>
          <p className="mt-2 text-sm text-[#555555] dark:text-[#A1A1AA] max-w-md mx-auto">
            Please sign in to your MockInterview.ai account to manage your professional profile, target seniority, and practice performance.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-6 py-2.5 text-xs font-bold shadow-md shadow-[#F59E0B]/20 transition cursor-pointer"
            >
              <span>Sign In to Access Profile</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('dashboard')}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD5] dark:border-[#232328] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 px-5 py-2.5 text-xs font-medium text-[#111111] dark:text-white transition cursor-pointer"
            >
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Oct 2026';

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fadeIn">
      {/* Top Breadcrumb Header */}
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
            // Candidate Profile
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('settings')}
          className="text-xs font-sans font-medium text-[#F59E0B] hover:underline cursor-pointer"
        >
          Open Settings &rarr;
        </button>
      </div>

      {/* Main Profile Form & Details */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Account Identity Badge Card */}
        <div className="md:col-span-5 space-y-6">
          <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2E0A24] to-[#4A153B] text-[#F59E0B] font-bold text-2xl font-serif shadow-md border border-[#F59E0B]/30">
                {user.full_name
                  ? user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : user.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-serif text-xl font-bold text-[#111111] dark:text-white truncate">
                  {user.full_name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#555555] dark:text-[#A1A1AA] font-mono truncate">
                  <Mail className="h-3 w-3 shrink-0 text-[#F59E0B]" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DFD5] dark:border-[#232328] space-y-3 text-xs font-sans">
              <div className="flex items-center justify-between">
                <span className="text-[#555555] dark:text-[#A1A1AA] flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>Account Status</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Active Candidate</span>
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#555555] dark:text-[#A1A1AA]">User ID</span>
                <span className="text-[#111111] dark:text-white bg-[#FAF8F5] dark:bg-[#18181C] px-2 py-0.5 rounded border border-[#E5DFD5] dark:border-[#232328]">
                  {user.id}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#555555] dark:text-[#A1A1AA] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>Member Since</span>
                </span>
                <span className="font-medium text-[#111111] dark:text-white">
                  {createdDate}
                </span>
              </div>
            </div>
          </div>

          {/* Real Metrics Card */}
          <div className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#555555] dark:text-[#A1A1AA]">
                Practice Track Record
              </h3>
              {loadingHistory && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#232328]">
                <span className="block text-xl font-bold font-sans text-[#111111] dark:text-white">
                  {totalInterviews}
                </span>
                <span className="text-[10px] text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Total
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#232328]">
                <span className="block text-xl font-bold font-sans text-emerald-600 dark:text-emerald-400">
                  {completedInterviews}
                </span>
                <span className="text-[10px] text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Completed
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#E5DFD5] dark:border-[#232328]">
                <span className="block text-xl font-bold font-sans text-[#F59E0B]">
                  {averageScore !== null ? averageScore : '—'}
                </span>
                <span className="text-[10px] text-[#555555] dark:text-[#A1A1AA] font-sans">
                  Avg Score
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Form */}
        <div className="md:col-span-7">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-[#E5DFD5] dark:border-[#232328] bg-white dark:bg-[#141417] p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div>
              <h3 className="font-serif text-2xl font-bold text-[#111111] dark:text-white">
                Professional Details
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans">
                Update your professional title and target seniority to calibrate AI question generation.
              </p>
            </div>

            {statusMessage && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-sans flex items-center gap-2.5 animate-fadeIn ${
                  statusMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="space-y-4 font-sans text-xs sm:text-sm">
              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="profile-full-name"
                  className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5"
                >
                  Candidate Display Name
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] px-3.5 py-2.5 text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>

              {/* Target Role Field */}
              <div>
                <label
                  htmlFor="profile-target-role"
                  className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5"
                >
                  Target Professional Track
                </label>
                <input
                  id="profile-target-role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer — Distributed Systems"
                  className="w-full rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] px-3.5 py-2.5 text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESET_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                        targetRole === r
                          ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B] font-semibold'
                          : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-white dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Seniority / Experience Level */}
              <div>
                <label className="block font-semibold text-[#111111] dark:text-[#F4F4F5] mb-1.5">
                  Target Seniority Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                        experienceLevel === lvl
                          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#09090B] shadow-sm'
                          : 'border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#18181C] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between">
              <span className="text-xs text-[#7A7875] dark:text-[#A1A1AA] font-mono">
                Persists to secure database
              </span>

              <button
                type="submit"
                id="save-profile-btn"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-6 py-2.5 text-xs font-sans font-bold shadow-md shadow-[#F59E0B]/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#09090B]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
