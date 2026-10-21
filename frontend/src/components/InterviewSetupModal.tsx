import React, { useState } from 'react';
import { X, Sliders, Info, ShieldCheck, Lock } from 'lucide-react';
import type { InterviewConfig } from '../types';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterviewSetupModal: React.FC<InterviewSetupModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Backend Engineer (Distributed Systems)',
    difficulty: 'Senior',
    primaryLanguage: 'Python',
    questionCount: 5,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Interview Configuration</h3>
              <p className="text-xs text-slate-400">Milestone 1 Architectural Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Milestone Notice Banner */}
        <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">
                Milestone 1 Scaffold Only
              </p>
              <p>
                Live Gemini API interaction, WebSocket question streaming, and database persistence are scheduled for Milestone 2. No live session will be initiated at this stage.
              </p>
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <div className="mt-6 space-y-5">
          {/* Target Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Target Engineering Role
            </label>
            <select
              value={config.role}
              onChange={(e) => setConfig({ ...config, role: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Backend Engineer (Distributed Systems)">Backend Engineer (Distributed Systems)</option>
              <option value="Systems Infrastructure & Reliability">Systems Infrastructure & Reliability</option>
              <option value="Full-Stack Web Architect">Full-Stack Web Architect</option>
              <option value="Data & Analytics Pipeline Engineer">Data & Analytics Pipeline Engineer</option>
            </select>
          </div>

          {/* Seniority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Seniority Level
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {(['Junior', 'Mid', 'Senior', 'Staff'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfig({ ...config, difficulty: level })}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    config.difficulty === level
                      ? 'border border-indigo-500 bg-indigo-600/20 text-indigo-300'
                      : 'border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Code Language */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Primary Coding Language
              </label>
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <ShieldCheck className="h-3 w-3" /> Static AI Review (No Exec)
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['Python', 'Java', 'SQL'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setConfig({ ...config, primaryLanguage: lang })}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    config.primaryLanguage === lang
                      ? 'border border-cyan-500 bg-cyan-600/20 text-cyan-300'
                      : 'border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Questions Slider (3-10, default 5) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Question Count (Configurable 3–10)
              </label>
              <span className="text-xs font-bold text-indigo-400">
                {config.questionCount} Questions {config.questionCount === 5 ? '(SRS Default)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={config.questionCount}
              onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
              className="mt-2 w-full accent-indigo-500 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Min: 3</span>
              <span>Default: 5</span>
              <span>Max: 10</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            Close
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed border border-slate-700/50"
            title="Interview execution will be integrated in Milestone 2"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Launch Session (Milestone 2)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
