import React from 'react';
import { Terminal, Shield, Activity, Wifi, WifiOff } from 'lucide-react';
import type { HealthStatus } from '../types';

interface NavbarProps {
  health: HealthStatus;
  onOpenSetup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, onOpenSetup }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-md shadow-indigo-500/20">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                MockInterview<span className="text-cyan-400">.ai</span>
              </span>
              <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                Milestone 1
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              AI Technical Mock Interviewer
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Backend Health Badge */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              health.status === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : health.status === 'loading'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-slate-700 bg-slate-800/50 text-slate-400'
            }`}
            title={
              health.status === 'ok'
                ? `Backend online: ${health.app} (${health.version})`
                : health.status === 'loading'
                ? 'Pinging backend /api/health...'
                : 'Backend offline or waiting for uvicorn server'
            }
          >
            {health.status === 'ok' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">API Online</span>
              </>
            ) : health.status === 'loading' ? (
              <>
                <Activity className="h-3.5 w-3.5 animate-spin text-amber-400" />
                <span className="hidden sm:inline">Checking API...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">API Offline</span>
              </>
            )}
          </div>

          {/* Sandbox Indicator */}
          <div className="hidden items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-400 md:flex">
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>Static AI Review Mode</span>
          </div>

          {/* CTA */}
          <button
            onClick={onOpenSetup}
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:px-4 sm:py-2 sm:text-sm"
          >
            Start Mock Interview
          </button>
        </div>
      </div>
    </header>
  );
};
