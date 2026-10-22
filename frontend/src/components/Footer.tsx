import React from 'react';
import { Terminal } from 'lucide-react';

interface FooterProps {
  onOpenSetup?: () => void;
  onReplayIntro?: () => void;
  compact?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC<FooterProps> = ({ onReplayIntro }) => {
  return (
    <footer className="border-t border-[#E5DFD5] dark:border-[#3A0F34]/40 bg-[#F8F6F1] dark:bg-[#120516] transition-colors relative">
      <div className="editorial-frame px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-l border-r border-[#E5DFD5] dark:border-[#3A0F34]/30 relative">
        <div className="editorial-crosshair -top-2.5 -left-2.5">+</div>
        <div className="editorial-crosshair -top-2.5 -right-2.5">+</div>
        <div className="editorial-crosshair -bottom-2.5 -left-2.5">+</div>
        <div className="editorial-crosshair -bottom-2.5 -right-2.5">+</div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand & Purpose */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#3A0F34] text-[#EAAA00] shadow-xs">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-col leading-none">
                <span className="font-didone text-xs tracking-[0.25em] font-black text-[#111111] dark:text-[#F8F6F1] uppercase">
                  MOCK
                </span>
                <span className="font-didone text-[10px] tracking-[0.14em] font-semibold text-[#3A0F34] dark:text-[#EAAA00] uppercase mt-0.5">
                  INTERVIEW<span className="font-mono text-[9px] lowercase text-[#7A7875]">.ai</span>
                </span>
              </div>
              <p className="text-xs text-[#7A7875] mt-1.5 font-sans">
                High-rigor technical interview simulation for software engineering candidates
              </p>
            </div>
          </div>

          {/* Navigation & Documentation Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono font-medium text-[#7A7875] uppercase tracking-wider">
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="hover:text-[#3A0F34] dark:hover:text-[#EAAA00] transition cursor-pointer"
                title="Replay MOCKINTERVIEW opening title"
              >
                Replay Title
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
        </div>

        {/* Bottom Attribution */}
        <div className="mt-8 pt-6 border-t border-[#E5DFD5] dark:border-[#3A0F34]/30 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A7875] gap-3 font-mono">
          <p>© {CURRENT_YEAR} MockInterview.ai • Formatted in Didone & Geist Monospace</p>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EAAA00]"></span>
            <span className="text-[#3A0F34] dark:text-[#EAAA00] font-medium uppercase tracking-wider text-[11px]">Editorial Grid System V2.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
