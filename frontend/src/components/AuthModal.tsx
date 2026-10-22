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
  ArrowRight,
  Loader2,
  KeyRound,
  ShieldCheck,
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
    if (!pwd) return { score: 0, label: '', color: 'bg-[#EBE8E0]' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-[#7A7875]' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-[#EAAA00]' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-[#3A0F34]' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-[#3A0F34]' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-[#7A7875]' };
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
      className={`relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34] shadow-2xl p-6 sm:p-8 transition-colors text-[#111111] dark:text-[#F8F6F1] ${
        isStandalonePage ? 'mx-auto my-8' : ''
      }`}
    >
      <div className="editorial-crosshair -top-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
      <div className="editorial-crosshair -top-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
      <div className="editorial-crosshair -bottom-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
      <div className="editorial-crosshair -bottom-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
        <div>
          <h2 className="font-didone text-2xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1]">
            {mode === 'login' && 'Sign in to MockInterview.ai'}
            {mode === 'signup' && 'Create candidate account'}
            {mode === 'forgot-password' && 'Reset your password'}
            {mode === 'reset-password' && 'Enter new password'}
          </h2>
          <p className="text-xs text-[#7A7875] dark:text-slate-400 mt-1 font-sans">
            {mode === 'login' && 'Access your technical mock interview history and reports'}
            {mode === 'signup' && 'Save mock interviews, track AI feedback and progression'}
            {mode === 'forgot-password' && 'Enter your email to receive recovery instructions'}
            {mode === 'reset-password' && 'Set a strong password for your candidate account'}
          </p>
        </div>
        {!isStandalonePage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#250C3D] transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 p-3 border border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn font-mono"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-4 p-3 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] text-xs flex items-start gap-2.5 animate-fadeIn shadow-xs font-mono"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#3A0F34] dark:text-[#EAAA00]" />
          <div className="font-medium">{successMessage}</div>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A7875] dark:text-slate-400">
                <UserIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Developer"
                className="w-full pl-9 pr-3.5 py-2 text-sm border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] transition font-sans"
              />
            </div>
          </div>
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
          <div>
            <label className="block text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A7875] dark:text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@company.com"
                className="w-full pl-9 pr-3.5 py-2 text-sm border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] transition font-sans"
              />
            </div>
          </div>
        )}

        {mode === 'reset-password' && (
          <div>
            <label className="block text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Password Reset Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A7875] dark:text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste reset token here"
                className="w-full pl-9 pr-3.5 py-2 font-mono text-xs border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] transition"
              />
            </div>
          </div>
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400 uppercase tracking-wider">
                {mode === 'reset-password' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-xs text-[#3A0F34] dark:text-[#EAAA00] hover:underline font-mono font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A7875] dark:text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                className="w-full pl-9 pr-10 py-2 text-sm border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] transition font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength indicator for signup & reset */}
            {(mode === 'signup' || mode === 'reset-password') && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#7A7875] dark:text-slate-400">Password strength:</span>
                  <span className="font-semibold text-[#3A0F34] dark:text-[#EAAA00]">{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1">
                  <div className={`transition-colors ${strength.score >= 1 ? strength.color : 'bg-[#EBE8E0] dark:bg-[#250C3D]'}`} />
                  <div className={`transition-colors ${strength.score >= 2 ? strength.color : 'bg-[#EBE8E0] dark:bg-[#250C3D]'}`} />
                  <div className={`transition-colors ${strength.score >= 3 ? strength.color : 'bg-[#EBE8E0] dark:bg-[#250C3D]'}`} />
                  <div className={`transition-colors ${strength.score >= 4 ? strength.color : 'bg-[#EBE8E0] dark:bg-[#250C3D]'}`} />
                </div>
              </div>
            )}
          </div>
        )}

        {(mode === 'signup' || mode === 'reset-password') && (
          <div>
            <label className="block text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Confirm {mode === 'reset-password' ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A7875] dark:text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                className="w-full pl-9 pr-10 py-2 text-sm border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] placeholder:text-[#8A8782] dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3A0F34] dark:focus:ring-[#EAAA00] focus:border-[#3A0F34] dark:focus:border-[#EAAA00] transition font-sans"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] transition cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 border border-[#3A0F34] dark:border-[#EAAA00] bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow-xs hover:bg-[#2A0B26] dark:hover:bg-[#D49800] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white dark:text-[#120516]" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot-password' && 'Send Reset Link'}
                {mode === 'reset-password' && 'Reset Password'}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#EAAA00] dark:text-[#120516]" />
            </>
          )}
        </button>
      </form>

      {/* Footer Switcher */}
      <div className="mt-6 pt-4 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-center text-xs font-mono text-[#7A7875] dark:text-slate-400">
        {mode === 'login' && (
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setMode('signup');
              }}
              className="font-bold text-[#3A0F34] dark:text-[#EAAA00] hover:underline transition-colors cursor-pointer"
            >
              Sign up for free
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
              className="font-bold text-[#3A0F34] dark:text-[#EAAA00] hover:underline transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        )}

        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <p>
            Remembered your credentials?{' '}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setMode('login');
              }}
              className="font-bold text-[#3A0F34] dark:text-[#EAAA00] hover:underline transition-colors cursor-pointer"
            >
              Return to sign in
            </button>
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#7A7875] dark:text-slate-400 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
          <span>Argon2id hashing & HttpOnly cookie protection</span>
        </div>
      </div>
    </div>
  );

  if (isStandalonePage) {
    return containerContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {containerContent}
    </div>
  );
};
