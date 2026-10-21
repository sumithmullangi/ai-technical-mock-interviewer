import React from 'react';
import { Target, Layers, AlertTriangle, MessageSquare, Mic, ShieldAlert, Cpu, Award } from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  return (
    <section id="features" className="py-16 border-t border-slate-800/80 bg-slate-950/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            System Architecture & Evaluation
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Engineered According to Strict Interview Standards
          </p>
          <p className="mt-4 text-base text-slate-400">
            Every interview session is governed by an authoritative state machine with verifiable scoring rubrics and zero runtime execution hazards.
          </p>
        </div>

        {/* 4 Dimension Evaluation Cards */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-300">
            <Award className="h-4 w-4 text-indigo-400" />
            <span>Four-Dimensional Weighted Scoring Model (0–10 Scale)</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Dimension 1: Correctness */}
            <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Target className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                  40% Weight
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Technical Correctness</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Evaluates algorithmic accuracy, syntactic precision, correct data structures, and sound mathematical reasoning.
              </p>
            </div>

            {/* Dimension 2: Depth */}
            <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Layers className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-400">
                  25% Weight
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Architectural Depth</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Measures understanding of time/space complexities, concurrency, system bottlenecks, and design trade-offs.
              </p>
            </div>

            {/* Dimension 3: Edge Cases */}
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-950/30 to-slate-900/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  20% Weight
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Edge-Case Awareness</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Tests boundary condition handling: null inputs, empty sets, large datasets, race conditions, and error recovery.
              </p>
            </div>

            {/* Dimension 4: Clarity */}
            <div className="rounded-xl border border-teal-500/20 bg-gradient-to-b from-teal-950/30 to-slate-900/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-bold text-teal-400">
                  15% Weight
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Communication & Clarity</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Assesses articulate explanation of thought processes, structure, concise expression, and collaborative tone.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Mic className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Triple Input Modality</h3>
            <p className="mt-2 text-sm text-slate-400">
              Answer by typing text, speaking through speech recognition with an editable transcript, or writing code in Python, Java, or SQL.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Static AI Review Only</h3>
            <p className="mt-2 text-sm text-slate-400">
              Candidate code is never executed in an untrusted sandbox. All submitted code undergoes rigorous AST and static semantic evaluation via Gemini.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">Authoritative State Machine</h3>
            <p className="mt-2 text-sm text-slate-400">
              The backend strictly controls question progression, timer compliance, and follow-up limits (capped at 2 per question) to prevent client-side bypass.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
