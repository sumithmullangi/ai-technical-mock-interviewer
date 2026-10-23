import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Sparkles,
  Mic,
  BarChart3,
  X,
} from 'lucide-react';

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
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-[calc(100dvh-3.5rem)] bg-[#F8F6F1] dark:bg-[#09090B] text-[#111111] dark:text-[#F4F4F5] transition-colors relative overflow-x-hidden">
      {/* Precision Column Boundary Frame */}
      <div className="editorial-frame flex-1 flex flex-col justify-between border-l border-r border-[#E5DFD5]/60 dark:border-[#232328]/50 relative z-10 mx-auto w-full max-w-7xl">
        {/* Central Split Hero Section (Matches Reference Screen 1) */}
        <section className="flex-1 flex items-center px-4 sm:px-8 lg:px-12 py-10 sm:py-16 relative">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline, Subtitle, and Direct Actions */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[11px] font-sans font-semibold tracking-wider uppercase text-[#F59E0B] mb-6 shadow-2xs">
                <span>AI-POWERED INTERVIEW PRACTICE</span>
              </div>

              {/* Primary Headline in Editorial Serif */}
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] font-bold tracking-tight text-[#111111] dark:text-white leading-[1.06]">
                Interview
                <br />
                Confidently,
                <br />
                <span className="text-[#F59E0B]">Land Faster.</span>
              </h1>

              {/* Concise Supporting Copy */}
              <p className="mt-6 text-base sm:text-lg md:text-xl text-[#555555] dark:text-[#A1A1AA] font-sans font-normal leading-relaxed max-w-xl">
                Realistic AI mock interviews, personalized feedback and detailed analysis to help you crack your dream role.
              </p>

              {/* Primary & Secondary Action Buttons */}
              <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  id="landing-start-practicing-btn"
                  type="button"
                  onClick={onStartPracticing}
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-8 sm:px-9 py-3.5 sm:py-4 text-sm sm:text-base font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                >
                  <span>Start Practicing</span>
                  <ArrowRight className="h-4 w-4 text-[#09090B] transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  id="hero-watch-demo-btn"
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#E5DFD5] dark:border-[#26262D] bg-white dark:bg-[#141417] hover:bg-[#FAF8F5] dark:hover:bg-[#1C1C22] text-[#111111] dark:text-white px-6 py-3.5 sm:py-4 text-sm sm:text-base font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  </div>
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Discrete Feature Summary Pills (Reference Screen 1 Checkmarks) */}
              <div className="mt-12 pt-8 border-t border-[#E5DFD5] dark:border-[#232328] w-full flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm font-sans text-[#555555] dark:text-[#A1A1AA]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                  <span className="font-medium text-[#222222] dark:text-[#E4E4E7]">Real AI Interviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                  <span className="font-medium text-[#222222] dark:text-[#E4E4E7]">Detailed Feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                  <span className="font-medium text-[#222222] dark:text-[#E4E4E7]">Voice & Text</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                  <span className="font-medium text-[#222222] dark:text-[#E4E4E7]">Any Role, Any Level</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual with Woman at Desk & Floating Mascot (Reference Screen 1) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              {/* Organic Soft Warm Aura / Shape */}
              <div className="relative w-full max-w-lg">
                {/* Hand-drawn cursive arrow and text: Practice -> Improve -> Get Hired */}
                <div className="absolute -top-10 -left-6 z-20 hidden sm:flex flex-col items-center rotate-[-4deg]">
                  <span className="font-serif italic text-sm sm:text-base font-bold text-[#F59E0B] tracking-wide">
                    Practice &rarr; Improve &rarr; Get Hired
                  </span>
                  <svg className="w-16 h-8 text-[#F59E0B] mt-1 -scale-x-100" viewBox="0 0 60 30" fill="none">
                    <path d="M5 5 C 20 25, 40 25, 55 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                    <path d="M48 8 L 56 12 L 50 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Floating AI Mascot with Glow Aura */}
                <div className="absolute top-8 right-4 sm:-right-2 z-20 flex flex-col items-center animate-bounce duration-1000">
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-cyan-400/30 blur-md animate-pulse"></div>
                    <div className="relative h-11 w-11 rounded-full bg-[#111114] border-2 border-cyan-400 flex items-center justify-center shadow-lg">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Illustration Container */}
                <div className="relative rounded-[2.5rem] bg-gradient-to-tr from-[#FAF8F5] via-white to-[#F4F1EA] dark:from-[#0F0F12] dark:via-[#141418] dark:to-[#181820] p-6 sm:p-8 border border-[#E5DFD5] dark:border-[#26262D] shadow-2xl overflow-hidden">
                  {/* Amber ambient radial glow behind candidate */}
                  <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
                  <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-[#F59E0B]/5 blur-2xl pointer-events-none" />

                  {/* Woman candidate at desk SVG illustration */}
                  <div className="relative z-10 flex flex-col items-center">
                    <svg viewBox="0 0 400 320" className="w-full h-auto drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Desk Surface */}
                      <rect x="20" y="260" width="360" height="14" rx="4" fill="#6B4E32" />
                      <rect x="30" y="274" width="340" height="4" fill="#4A3420" />

                      {/* Coffee Mug */}
                      <rect x="60" y="235" width="22" height="25" rx="3" fill="#1C1C22" stroke="#33333C" strokeWidth="2" />
                      <path d="M82 240 C 90 240, 90 252, 82 252" stroke="#33333C" strokeWidth="2" fill="none" />
                      {/* Steam */}
                      <path d="M68 228 C 66 222, 70 218, 68 212" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

                      {/* Candidate Head and Hair Bun */}
                      <circle cx="270" cy="115" r="24" fill="#D4A373" />
                      {/* Hair Bun */}
                      <circle cx="276" cy="92" r="14" fill="#111114" />
                      <ellipse cx="268" cy="110" rx="22" ry="16" fill="#111114" />

                      {/* Candidate Body / Sweater with subtle Amber Rim Light */}
                      <path d="M230 200 C 240 150, 260 140, 275 140 C 290 140, 310 150, 320 200 L 325 260 L 225 260 Z" fill="#151518" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4" />

                      {/* Candidate Arms towards laptop */}
                      <path d="M245 185 C 230 200, 200 230, 185 240 L 205 248 C 220 235, 245 210, 255 195 Z" fill="#151518" />

                      {/* Laptop Screen & Base */}
                      <polygon points="120,256 220,256 230,260 110,260" fill="#2E2E36" />
                      {/* Laptop Screen */}
                      <rect x="125" y="165" width="90" height="88" rx="4" fill="#0D0D10" stroke="#33333C" strokeWidth="2" />
                      {/* Laptop Screen Content - MockInterview UI mockup */}
                      <rect x="130" y="170" width="80" height="78" rx="2" fill="#141418" />
                      {/* Screen Code Lines & Wave in Amber */}
                      <rect x="135" y="176" width="35" height="4" rx="1" fill="#F59E0B" />
                      <rect x="135" y="184" width="65" height="3" rx="1" fill="#FFFFFF" opacity="0.8" />
                      <rect x="135" y="190" width="55" height="3" rx="1" fill="#FFFFFF" opacity="0.6" />
                      <rect x="135" y="196" width="60" height="3" rx="1" fill="#FFFFFF" opacity="0.6" />
                      {/* Miniature Soundwave on Laptop */}
                      <rect x="135" y="208" width="70" height="18" rx="3" fill="#09090B" />
                      <circle cx="145" cy="217" r="4" fill="#F59E0B" />
                      <line x1="155" y1="217" x2="198" y2="217" stroke="#00E5FF" strokeWidth="2" strokeDasharray="2 3" />
                      <rect x="135" y="232" width="40" height="10" rx="2" fill="#F59E0B" />

                      {/* Plant on Desk Corner */}
                      <ellipse cx="340" cy="245" rx="14" ry="15" fill="#C2A482" stroke="#8E6E4C" strokeWidth="2" />
                      <path d="M340 230 C 330 200, 320 210, 325 190 C 335 210, 345 215, 340 230 Z" fill="#2E7D32" />
                      <path d="M344 230 C 355 200, 365 210, 360 190 C 350 210, 345 215, 344 230 Z" fill="#388E3C" />
                    </svg>

                    {/* Compact Interactive Live Status Pill */}
                    <div className="mt-2 w-full rounded-2xl bg-white/90 dark:bg-[#141418]/95 border border-[#E5DFD5] dark:border-[#26262D] p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-sans font-semibold text-[#111111] dark:text-white">
                          Live Technical Session
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#F59E0B] uppercase tracking-wider">
                        Distributed Systems
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Discreet Single-Screen Bottom Datum Strip */}
        <footer className="border-t border-[#E5DFD5] dark:border-[#232328] py-3.5 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#7A7875] dark:text-[#71717A] gap-2 bg-[#F8F6F1]/90 dark:bg-[#09090B]/90 select-none">
          <p>© {CURRENT_YEAR} MockInterview.ai • Editorial Engineering Practice System</p>
          <div className="flex items-center gap-4 text-xs font-mono">
            {onHowItWorks && (
              <button
                type="button"
                onClick={onHowItWorks}
                className="hover:text-[#F59E0B] transition cursor-pointer"
              >
                How It Works
              </button>
            )}
            {onEnterStudio && (
              <button
                type="button"
                onClick={onEnterStudio}
                className="text-[#F59E0B] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Studio Console</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <a
              href="https://github.com/sumithmullangi/ai-technical-mock-interviewer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F59E0B] transition"
            >
              GitHub
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F59E0B] transition"
            >
              Health API
            </a>
          </div>
        </footer>
      </div>

      {/* Interactive Product Demo Modal */}
      {showDemoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDemoModal(false);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#131316] border border-[#E5DFD5] dark:border-[#232328] rounded-3xl shadow-2xl p-6 sm:p-8 text-[#111111] dark:text-[#F4F4F5]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD5] dark:border-[#232328]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#111111] dark:text-white">Interactive Platform Walkthrough</h3>
                  <p className="text-xs text-[#555555] dark:text-[#A1A1AA] font-mono">Experience how MockInterview.ai conducts mock sessions</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#7A7875] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm font-sans">
              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#18181B] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#F59E0B] text-[#09090B] text-[10px] font-mono uppercase font-bold">
                    Step 1
                  </span>
                  <span className="font-semibold text-xs text-[#111111] dark:text-white">Configure Role & Seniority</span>
                </div>
                <p className="text-xs text-[#555555] dark:text-[#A1A1AA]">
                  Select your track (Distributed Systems, Full-Stack, Systems & Infrastructure) and experience level. Custom question pipelines are immediately initialized.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#18181B] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#F59E0B] text-[#09090B] text-[10px] font-mono uppercase font-bold">
                    Step 2
                  </span>
                  <span className="font-semibold text-xs text-[#111111] dark:text-white">Voice or Text Technical Interview</span>
                </div>
                <p className="text-xs text-[#555555] dark:text-[#A1A1AA]">
                  Speak naturally using real-time browser speech recognition or type your solution with code snippets. The AI presents follow-ups based on the depth of your answers.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5DFD5] dark:border-[#232328] bg-[#FAF8F5] dark:bg-[#18181B] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase font-bold">
                    Step 3
                  </span>
                  <span className="font-semibold text-xs text-[#111111] dark:text-white">Four-Dimensional Performance Dossier</span>
                </div>
                <p className="text-xs text-[#555555] dark:text-[#A1A1AA]">
                  Receive comprehensive evaluation on Correctness, Technical Depth, Edge Cases & Scale, and Communication Clarity, with honest scoring and targeted advice.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5DFD5] dark:border-[#232328] flex items-center justify-between">
              <span className="text-xs font-mono text-[#7A7875] dark:text-[#A1A1AA]">No credit card required • Free practice</span>
              <button
                type="button"
                onClick={() => {
                  setShowDemoModal(false);
                  onStartPracticing();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] px-5 py-2 text-xs font-bold cursor-pointer transition shadow-md shadow-[#F59E0B]/20"
              >
                <span>Launch Practice Session</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
