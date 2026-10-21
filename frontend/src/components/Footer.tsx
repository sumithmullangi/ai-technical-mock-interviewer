import React from 'react';
import { Terminal, Shield } from 'lucide-react';

interface FooterProps {
  onOpenSetup?: () => void;
  compact?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
      {/* Main Footer Info */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Attribution */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-transparent dark:border-slate-700">
              <Terminal className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">AI Technical Mock Interviewer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Production-grade mock interview simulator for software engineering candidates
              </p>
            </div>
          </div>

          {/* Stack Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">FastAPI</span>
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">React 19</span>
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">TypeScript</span>
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">Tailwind CSS</span>
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">PostgreSQL</span>
            <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">Gemini 2.5</span>
          </div>

          {/* Safety & Legal */}
          <div className="flex flex-col items-center md:items-end text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Non-Execution Static AI Review
            </span>
            <p className="text-[11px]">
              Candidate code is evaluated as text data only. Never executed.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <p>© {CURRENT_YEAR} AI Technical Mock Interviewer. MIT License.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/sumithmullangi/ai-technical-mock-interviewer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub Repository</span>
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Health API Endpoint
            </a>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Swagger Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
