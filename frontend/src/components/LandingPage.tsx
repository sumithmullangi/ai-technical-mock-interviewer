import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStartPracticing: () => void;
  onHowItWorks?: () => void;
  onExploreChallenges?: () => void;
  onEnterStudio?: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartPracticing,
  onHowItWorks,
  onEnterStudio,
}) => {
  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-3.5rem)] bg-[#F8F6F1] dark:bg-[#120516] text-[#111111] dark:text-[#F8F6F1] transition-colors relative overflow-x-hidden">
      {/* Precision Column Boundary Guides */}
      <div className="editorial-frame flex-1 flex flex-col justify-between border-l border-r border-[#DDE3E8] dark:border-[#3A0F34]/30 relative z-10">
        {/* Top Quiet Datum Strip */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-2.5 border-b border-[#DDE3E8] dark:border-[#3A0F34]/30 text-[10px] font-mono tracking-[0.22em] uppercase text-[#7A7875] dark:text-slate-400 select-none bg-[#F8F6F1]/80 dark:bg-[#120516]/80 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
            <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">
              MOCKINTERVIEW // EDITORIAL EVALUATION PLATFORM
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>STATIC AI ANALYSIS</span>
            <span className="text-[#EAAA00]">•</span>
            <span>4D RUBRICS</span>
            <span className="text-[#EAAA00]">•</span>
            <span>VOICE SIMULATION</span>
          </div>
        </div>

        {/* Central Hero Section: Centered, Focused, and Single-Screen */}
        <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 py-8 sm:py-12 relative text-center">
          <div className="max-w-3xl flex flex-col items-center">
            {/* Quiet Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#DDE3E8] dark:border-[#3A0F34] bg-white/70 dark:bg-[#1A0826]/70 text-[10px] font-mono tracking-widest uppercase text-[#3A0F34] dark:text-[#EAAA00] mb-5 sm:mb-7 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
              <span>TECHNICAL INTERVIEW INTELLIGENCE</span>
            </div>

            {/* Primary Headline in High-Contrast Didone Serif */}
            <h1 className="font-didone text-5xl sm:text-7xl md:text-8xl lg:text-[5.5rem] font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[1.03]">
              Think clearly.
              <br />
              <span className="text-[#3A0F34] dark:text-[#EAAA00] italic font-serif">
                Answer confidently.
              </span>
            </h1>

            {/* Concise Supporting Copy: Exactly 1 Sentence */}
            <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-[#555555] dark:text-slate-300 font-sans font-normal leading-relaxed max-w-xl mx-auto">
              MockInterview.ai simulates engineering-grade technical interviews with real-time feedback designed to sharpen your architectural reasoning and answer delivery.
            </p>

            {/* Primary CTA + Subtle Secondary Destination */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto">
              <button
                id="landing-start-practicing-btn"
                type="button"
                onClick={onStartPracticing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-[#3A0F34] bg-[#3A0F34] hover:bg-[#4E1446] dark:border-[#EAAA00] dark:bg-[#EAAA00] dark:hover:bg-[#d89c00] text-[#F8F6F1] dark:text-[#120516] px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-semibold tracking-wide transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
              >
                <span>Start practicing</span>
                <ArrowRight className="h-4 w-4 text-[#EAAA00] dark:text-[#120516] transition-transform group-hover:translate-x-0.5" />
              </button>

              {onHowItWorks && (
                <button
                  type="button"
                  onClick={onHowItWorks}
                  className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-[#7A7875] hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition-colors py-2 px-1 cursor-pointer"
                >
                  <span>How it works</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              )}
            </div>

            {/* Understated Capabilities Pill Bar */}
            <div className="mt-8 sm:mt-10 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-2.5 rounded-full border border-[#DDE3E8] dark:border-[#3A0F34]/50 bg-white/60 dark:bg-[#1A0826]/60 backdrop-blur-xs text-xs font-mono text-[#7A7875] dark:text-slate-400 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
                Adaptive technical inquiry
              </span>
              <span className="text-[#DDE3E8] dark:text-[#3A0F34] hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3A0F34] dark:bg-[#EAAA00]"></span>
                Realistic voice simulation
              </span>
              <span className="text-[#DDE3E8] dark:text-[#3A0F34] hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7A7875]"></span>
                Four-dimensional rubrics
              </span>
            </div>
          </div>
        </section>

        {/* Discreet Single-Screen Bottom Datum Strip */}
        <footer className="border-t border-[#DDE3E8] dark:border-[#3A0F34]/30 py-3 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#7A7875] dark:text-slate-400 gap-2 bg-[#F8F6F1]/90 dark:bg-[#120516]/90 select-none">
          <p>© {CURRENT_YEAR} MockInterview.ai • Formatted in Didone & Geist Monospace</p>
          <div className="flex items-center gap-4 text-xs font-mono">
            {onEnterStudio && (
              <button
                type="button"
                onClick={onEnterStudio}
                className="text-[#3A0F34] dark:text-[#EAAA00] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Practice Studio Workspace</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <a
              href="https://github.com/sumithmullangi/ai-technical-mock-interviewer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition"
            >
              GitHub
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition"
            >
              Health Check
            </a>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition"
            >
              API Reference
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
