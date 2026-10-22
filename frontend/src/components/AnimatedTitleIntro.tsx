import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface AnimatedTitleIntroProps {
  /**
   * Callback fired once the intro sequence has fully completed and unmounted.
   */
  onComplete?: () => void;
  /**
   * Total intro duration in milliseconds (default: 2600ms).
   */
  durationMs?: number;
  /**
   * Optional manual override to bypass intro immediately.
   */
  autoPlay?: boolean;
}

export const AnimatedTitleIntro: React.FC<AnimatedTitleIntroProps> = ({
  onComplete,
  durationMs = 2600,
  autoPlay = true,
}) => {
  const [phase, setPhase] = useState<'entering' | 'holding' | 'exiting' | 'finished'>('entering');
  const [isFastExit, setIsFastExit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check user preference for reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const triggerExit = useCallback(
    (fast = false) => {
      if (phase === 'exiting' || phase === 'finished') return;
      if (fast) setIsFastExit(true);
      setPhase('exiting');

      const exitDuration = fast ? 150 : 550;
      const timer = window.setTimeout(() => {
        setPhase('finished');
        if (onComplete) {
          onComplete();
        }
      }, exitDuration);

      return () => window.clearTimeout(timer);
    },
    [phase, onComplete]
  );

  const handleSkip = useCallback(() => {
    triggerExit(true);
  }, [triggerExit]);

  // Handle keyboard 'Escape' shortcut to skip intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  // Manage timed progression and phases
  useEffect(() => {
    if (!autoPlay) return;

    // If user prefers reduced motion, hold briefly (350ms) then immediately finish
    if (prefersReducedMotion) {
      const rmTimer = window.setTimeout(() => {
        triggerExit(true);
      }, 400);
      return () => window.clearTimeout(rmTimer);
    }

    const holdTime = durationMs * 0.48; // Transition from entering to holding at ~1.25s
    const exitStartTime = durationMs * 0.80; // Begin smooth dissolve at ~2.1s

    const holdingTimer = window.setTimeout(() => {
      setPhase('holding');
    }, holdTime);

    const exitTimer = window.setTimeout(() => {
      triggerExit(false);
    }, exitStartTime);

    return () => {
      window.clearTimeout(holdingTimer);
      window.clearTimeout(exitTimer);
    };
  }, [autoPlay, durationMs, prefersReducedMotion, triggerExit, phase]);

  if (phase === 'finished') {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      role="region"
      aria-label="MockInterview Editorial Introduction"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none bg-[#F8F6F1] text-[#111111] p-6 transition-all ${
        phase === 'exiting'
          ? isFastExit
            ? 'opacity-0 duration-150 pointer-events-none'
            : 'opacity-0 scale-[1.015] duration-550 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none'
          : 'opacity-100 scale-100 duration-500'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 50%, #FAF8F5 0%, #F8F6F1 60%, #EFECE6 100%)',
      }}
    >
      {/* Subtle architectural grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(17,17,17,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,17,17,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Editorial Specimen Meta Tag */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20 hidden sm:flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#111111]/50 uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
        <span>Specimen 01 / Branded Intro</span>
      </div>

      {/* Discreet Skip Control in Top-Right */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-20">
        <button
          type="button"
          onClick={handleSkip}
          className="group inline-flex items-center gap-2 rounded-full border border-[#111111]/15 bg-[#FAF8F5]/90 px-3.5 py-1.5 text-xs font-medium text-[#111111] shadow-2xs backdrop-blur-md transition hover:border-[#3A0F34] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0F34]"
          aria-label="Skip introduction animation"
        >
          <span>Skip Intro</span>
          <kbd className="rounded border border-[#111111]/20 bg-[#F8F6F1] px-1.5 py-0.5 text-[10px] font-mono text-[#3A0F34] transition-colors group-hover:border-[#EAAA00] group-hover:text-[#EAAA00]">
            Esc
          </kbd>
        </button>
      </div>

      {/* Centerpiece: Clean Two-Line Stacked Wordmark in Oversized Black Lettering on Warm Ivory */}
      <main className="relative z-10 m-auto flex flex-col items-center justify-center w-full max-w-5xl px-4 overflow-hidden select-none">
        <div className="flex flex-col items-center justify-center text-center w-full overflow-visible select-none leading-[0.90] sm:leading-[0.88]">
          {/* First Line: MOCK */}
          <div className="relative w-full flex items-center justify-center overflow-visible py-0.5 sm:py-1">
            {/* Translucent horizontal letter echoes behind MOCK */}
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-4 absolute inset-0 flex items-center justify-center text-[#111111]/[0.06] font-serif font-bold uppercase tracking-[0.24em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              MOCK
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-3 absolute inset-0 flex items-center justify-center text-[#111111]/[0.12] font-serif font-bold uppercase tracking-[0.24em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              MOCK
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-2 absolute inset-0 flex items-center justify-center text-[#111111]/[0.22] font-serif font-bold uppercase tracking-[0.24em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              MOCK
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-1 absolute inset-0 flex items-center justify-center text-[#111111]/[0.35] font-serif font-bold uppercase tracking-[0.24em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              MOCK
            </div>

            {/* Crisp Ink Black lettering: MOCK */}
            <span
              className="intro-main-mock relative z-10 font-serif font-bold uppercase text-[#111111] drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)] tracking-[0.24em] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
                fontVariationSettings: '"opsz" 96',
              }}
            >
              MOCK
            </span>
          </div>

          {/* Luminous Marigold & Deep Aubergine Refined Accent Horizon */}
          <div className="my-1.5 sm:my-2 flex items-center justify-center gap-2 select-none pointer-events-none opacity-90">
            <div className="h-[1px] w-12 sm:w-28 bg-gradient-to-r from-transparent via-[#3A0F34] to-transparent" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#EAAA00] shadow-[0_0_8px_rgba(234,170,0,0.8)]" />
            <div className="h-[1px] w-12 sm:w-28 bg-gradient-to-r from-transparent via-[#3A0F34] to-transparent" />
          </div>

          {/* Second Line: INTERVIEW */}
          <div className="relative w-full flex items-center justify-center overflow-visible py-0.5 sm:py-1">
            {/* Translucent horizontal letter echoes behind INTERVIEW */}
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-4 absolute inset-0 flex items-center justify-center text-[#111111]/[0.06] font-serif font-bold uppercase tracking-[0.14em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              INTERVIEW
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-3 absolute inset-0 flex items-center justify-center text-[#111111]/[0.12] font-serif font-bold uppercase tracking-[0.14em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              INTERVIEW
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-2 absolute inset-0 flex items-center justify-center text-[#111111]/[0.22] font-serif font-bold uppercase tracking-[0.14em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              INTERVIEW
            </div>
            <div
              aria-hidden="true"
              className="intro-echo intro-echo-1 absolute inset-0 flex items-center justify-center text-[#111111]/[0.35] font-serif font-bold uppercase tracking-[0.14em] select-none pointer-events-none"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
              }}
            >
              INTERVIEW
            </div>

            {/* Crisp Ink Black lettering: INTERVIEW */}
            <span
              className="intro-main-interview relative z-10 font-serif font-bold uppercase text-[#111111] drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)] tracking-[0.14em] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(2.8rem, 11vw, 7.5rem)',
                lineHeight: 0.9,
                fontVariationSettings: '"opsz" 96',
              }}
            >
              INTERVIEW
            </span>
          </div>

          {/* Subtitle Branded Monogram */}
          <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-xs font-mono tracking-widest text-[#3A0F34] uppercase font-semibold">
            <span>AI Technical Mock Interviewer</span>
            <span className="text-[#EAAA00]">•</span>
            <span>Edition 2026</span>
          </div>
        </div>
      </main>
    </aside>
  );
};
