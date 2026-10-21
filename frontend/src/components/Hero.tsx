import React from 'react';
import { ArrowRight, Code2, Bot, Sliders, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onOpenSetup: () => void;
  onScrollToFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenSetup, onScrollToFeatures }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm mb-6">
          <Bot className="h-3.5 w-3.5 text-cyan-400" />
          <span>Precision Technical Interview Practice Powered by Gemini</span>
        </div>

        {/* Main Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Master Software Engineering Interviews with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Rigorous AI Evaluation
          </span>
        </h1>

        {/* Subtitle / explanation */}
        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          An interactive, state-machine driven mock interview simulator. Experience realistic primary questions, dynamic context-aware follow-ups, and four-dimensional scoring—designed specifically for modern engineers.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenSetup}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-500 hover:to-cyan-500 hover:shadow-indigo-600/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            <span>Start Mock Interview</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={onScrollToFeatures}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            <Sliders className="h-4 w-4 text-slate-400" />
            <span>Explore System Rules</span>
          </button>
        </div>

        {/* Highlights banner */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 max-w-4xl mx-auto">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sliders className="h-4 w-4" /> Questions
            </div>
            <div className="mt-1 text-lg font-bold text-white">3 to 10</div>
            <div className="text-xs text-slate-400">Default 5 primary challenges</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Bot className="h-4 w-4" /> Follow-ups
            </div>
            <div className="mt-1 text-lg font-bold text-white">Max 2</div>
            <div className="text-xs text-slate-400">Adaptive drill-down queries</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Code2 className="h-4 w-4" /> Languages
            </div>
            <div className="mt-1 text-lg font-bold text-white">Python / Java / SQL</div>
            <div className="text-xs text-slate-400">Code editor + text + speech</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Security
            </div>
            <div className="mt-1 text-lg font-bold text-white">Zero Execution</div>
            <div className="text-xs text-slate-400">Static AI review only</div>
          </div>
        </div>
      </div>
    </section>
  );
};
