import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Bot,
  Brain,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess?: () => void;
  resetToken?: string;
  isStandalonePage?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  resetToken = '',
  isStandalonePage = false,
}) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenInput, setTokenInput] = useState(resetToken);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (resetToken) {
      setTokenInput(resetToken);
    }
  }, [initialMode, resetToken, isOpen]);

  if (!isOpen && !isStandalonePage) return null;

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-[#2A2A30]' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-400' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-[#F59E0B]' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-[#D97706]' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-[#71717A]' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          setSuccessMessage('Logged in successfully!');
          setTimeout(() => {
            if (onSuccess) onSuccess();
            onClose();
          }, 400);
        } else {
          setErrorMessage(result.error || 'Invalid credentials. Please verify and try again.');
        }
      } else if (mode === 'signup') {
        if (password.length < 8) {
          setErrorMessage('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match. Please ensure both passwords match.');
          setIsSubmitting(false);
          return;
        }

        const result = await signup(fullName, email, password, confirmPassword);
        if (result.success) {
          setSuccessMessage('Account created and authenticated successfully!');
          setTimeout(() => {
            if (onSuccess) onSuccess();
            onClose();
          }, 600);
        } else {
          setErrorMessage(result.error || 'Registration failed. Please check your details.');
        }
      } else if (mode === 'forgot-password') {
        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const res = await fetch(`${apiBase}/api/v1/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(
            data.message || 'If an account exists with this email, password reset instructions have been dispatched.'
          );
        } else {
          setErrorMessage(data.detail || 'Unable to process password reset request.');
        }
      } else if (mode === 'reset-password') {
        if (password.length < 8) {
          setErrorMessage('New password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
        const res = await fetch(`${apiBase}/api/v1/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenInput,
            new_password: password,
            confirm_new_password: confirmPassword,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage('Password has been successfully updated! You can now log in.');
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
          }, 1200);
        } else {
          setErrorMessage(data.detail || 'Reset token is invalid or has expired.');
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerContent = (
    <div
      className={`relative w-full max-w-4xl bg-white dark:bg-[#161619] border border-[#E5DFD5] dark:border-[#27272E] shadow-2xl transition-colors text-[#111111] dark:text-[#F4F4F5] rounded-3xl overflow-hidden ${
        isStandalonePage ? 'mx-auto my-8' : ''
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left Column: Deep Obsidian Brand Panel (Reference Panel 2) */}
        <div className="md:col-span-5 bg-[#FAF8F5] dark:bg-[#101013] border-r border-[#E5DFD5] dark:border-[#232328] text-[#111111] dark:text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden transition-colors">
          {/* Ambient amber glow aura */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#D97706]/10 blur-2xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B] text-[#09090B] font-serif font-black text-xs shadow-md shadow-[#F59E0B]/30">
                M
              </div>
              <span className="font-serif font-bold text-sm tracking-wide text-[#111111] dark:text-white">
                MockInterview<span className="text-[#F59E0B]">.ai</span>
              </span>
            </div>

            {/* Editorial Serif Heading */}
            <div className="mt-12 sm:mt-16">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-[#111111] dark:text-white leading-[1.12]">
                Same
                <br />
                Questions.
                <br />
                <span className="text-[#F59E0B]">Better You.</span>
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-[#555555] dark:text-[#A1A1AA] font-sans leading-relaxed">
                Practice. Get feedback. Build confidence. Land your dream role.
              </p>
            </div>
          </div>

          {/* Key Benefits List with Golden Badges */}
          <div className="relative z-10 mt-8 pt-8 border-t border-[#E5DFD5] dark:border-[#232328] space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-sans text-[#111111]/90 dark:text-white/90 font-medium">
                AI-powered interviews
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-sans text-[#111111]/90 dark:text-white/90 font-medium">
                Personalized feedback
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-sans text-[#111111]/90 dark:text-white/90 font-medium">
                Support for all tech roles
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Deep Obsidian / Crisp Ivory Form Panel (Reference Panel 2) */}
        <div className="md:col-span-7 p-6 sm:p-9 flex flex-col justify-between bg-white dark:bg-[#161619] transition-colors">
          <div>
            {/* Header with Title and Close Button */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E5DFD5] dark:border-[#27272E]">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1AA]">
                  {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Get started free' : 'Account security'}
                </p>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-[#111111] dark:text-white mt-0.5">
                  {mode === 'login' && 'Sign in to continue'}
                  {mode === 'signup' && 'Create candidate account'}
                  {mode === 'forgot-password' && 'Reset your password'}
                  {mode === 'reset-password' && 'Enter new password'}
                </h3>
              </div>
              {!isStandalonePage && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full border border-[#E5DFD5] dark:border-[#27272E] text-[#555555] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn font-mono"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                role="status"
                className="mt-4 p-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] text-xs flex items-start gap-2.5 animate-fadeIn shadow-xs font-mono"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                <div className="font-medium">{successMessage}</div>
              </div>
            )}

            {/* Social Sign-In Buttons (Reference Screen 2) */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    // Demo social sign-in or OAuth trigger
                    setEmail('demo.candidate@mockinterview.ai');
                    setPassword('Password123!');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E5DFD5] dark:border-[#2A2A32] bg-[#FAF8F5] dark:bg-[#1F1F24] hover:bg-[#F0ECE4] dark:hover:bg-[#27272E] text-[#111111] dark:text-white text-xs sm:text-sm font-sans font-medium flex items-center justify-center gap-3 transition shadow-xs cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('developer@github.com');
                    setPassword('Password123!');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E5DFD5] dark:border-[#2A2A32] bg-[#FAF8F5] dark:bg-[#1F1F24] hover:bg-[#F0ECE4] dark:hover:bg-[#27272E] text-[#111111] dark:text-white text-xs sm:text-sm font-sans font-medium flex items-center justify-center gap-3 transition shadow-xs cursor-pointer"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>

                {/* Divider Line */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-full border-t border-[#E5DFD5] dark:border-[#27272E]"></div>
                  <span className="absolute px-3 bg-white dark:bg-[#161619] text-xs font-sans text-[#777777] dark:text-[#71717A]">
                    or
                  </span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-[#666666] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Developer"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-white placeholder:text-[#888888] dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition font-sans"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-[#666666] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-white placeholder:text-[#888888] dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition font-sans"
                    />
                  </div>
                </div>
              )}

              {mode === 'reset-password' && (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-[#666666] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">
                    Password Reset Token
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste reset token here"
                      className="w-full pl-9 pr-3.5 py-2.5 font-mono text-xs rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-white placeholder:text-[#888888] dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono font-semibold text-[#666666] dark:text-[#A1A1AA] uppercase tracking-wider">
                      {mode === 'reset-password' ? 'New Password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-[#F59E0B] hover:underline font-mono font-medium transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Minimum 8 characters' : '••••••••'}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-white placeholder:text-[#888888] dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#777777] dark:text-[#71717A] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator for signup & reset */}
                  {(mode === 'signup' || mode === 'reset-password') && password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#666666] dark:text-[#A1A1AA]">Password strength:</span>
                        <span className="font-semibold text-[#F59E0B]">{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div className={`rounded-full transition-colors ${strength.score >= 1 ? strength.color : 'bg-[#E5DFD5] dark:bg-[#2A2A30]'}`} />
                        <div className={`rounded-full transition-colors ${strength.score >= 2 ? strength.color : 'bg-[#E5DFD5] dark:bg-[#2A2A30]'}`} />
                        <div className={`rounded-full transition-colors ${strength.score >= 3 ? strength.color : 'bg-[#E5DFD5] dark:bg-[#2A2A30]'}`} />
                        <div className={`rounded-full transition-colors ${strength.score >= 4 ? strength.color : 'bg-[#E5DFD5] dark:bg-[#2A2A30]'}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(mode === 'signup' || mode === 'reset-password') && (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-[#666666] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">
                    Confirm {mode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777777] dark:text-[#71717A]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-[#E5DFD5] dark:border-[#2A2A30] bg-[#FAF8F5] dark:bg-[#111113] text-[#111111] dark:text-white placeholder:text-[#888888] dark:placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#777777] dark:text-[#71717A] hover:text-[#111111] dark:hover:text-white transition cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button (Amber pill matching Reference Screen 2) */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isSubmitting}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-3 text-sm font-sans font-bold shadow-md shadow-[#F59E0B]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#09090B]" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {mode === 'login' && 'Sign in'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot-password' && 'Send Reset Link'}
                    {mode === 'reset-password' && 'Reset Password'}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Footer Switcher */}
          <div className="mt-6 pt-4 border-t border-[#E5DFD5] dark:border-[#27272E] text-center text-xs font-sans text-[#666666] dark:text-[#A1A1AA]">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('signup');
                  }}
                  className="font-bold text-[#F59E0B] hover:underline transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('login');
                  }}
                  className="font-bold text-[#F59E0B] hover:underline transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}

            {(mode === 'forgot-password' || mode === 'reset-password') && (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('login');
                  }}
                  className="font-bold text-[#F59E0B] hover:underline transition-colors cursor-pointer"
                >
                  Back to Sign in
                </button>
              </p>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#777777] dark:text-[#71717A] font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>Argon2id password hashing & JWT token security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStandalonePage) {
    return containerContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {containerContent}
    </div>
  );
};
