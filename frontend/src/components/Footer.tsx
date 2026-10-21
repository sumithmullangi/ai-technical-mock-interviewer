import React from 'react';
import { Terminal, Shield, CheckCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Technical Mock Interviewer</p>
              <p className="text-xs text-slate-500">Milestone 1 Architecture & Frontend/Backend Scaffold</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> FastAPI + React 19 + TypeScript
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-cyan-400" /> Non-Execution AI Static Analysis
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Engineered for high-rigor technical mock interviews.
          </p>
        </div>
      </div>
    </footer>
  );
};
