import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Clock,
  ArrowRight,
  CheckCircle,
  PlayCircle,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserInterviewHistoryItem } from '../types/auth';

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSession: (sessionId: string) => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  isOpen,
  onClose,
  onResumeSession,
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<UserInterviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
      const token = sessionStorage.getItem('mockinterview_auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/v1/interviews/history`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else if (res.status === 401) {
        setError('Please log in to view your interview history.');
      } else {
        setError(`Failed to retrieve interview records (Status ${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] dark:bg-[#16061D] border border-[#E5DFD5] dark:border-[#3A0F34] shadow-2xl flex flex-col max-h-[85vh] transition-colors text-[#111111] dark:text-[#F8F6F1]">
        <div className="editorial-crosshair -top-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -top-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -bottom-2.5 -left-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
        <div className="editorial-crosshair -bottom-2.5 -right-2.5 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#3A0F34] dark:bg-[#250C3D] text-white">
              <History className="h-4.5 w-4.5 text-[#EAAA00]" />
            </div>
            <div>
              <h2 className="font-didone text-xl font-bold text-[#111111] dark:text-[#F8F6F1]">
                Candidate Dossier & History
              </h2>
              <p className="text-xs text-[#7A7875] dark:text-slate-400 font-mono">
                Saved sessions for <span className="font-semibold text-[#3A0F34] dark:text-[#EAAA00]">{user?.email}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#250C3D] transition disabled:opacity-50 cursor-pointer"
              title="Refresh history"
            >
              <RefreshCw className={`h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] text-[#7A7875] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#F8F6F1] hover:bg-white dark:hover:bg-[#250C3D] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#7A7875] dark:text-slate-400 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#3A0F34] dark:text-[#EAAA00]" />
              <span className="text-xs font-mono">Loading dossier records...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-[#7A7875] dark:text-slate-400 space-y-2">
              <FileText className="h-8 w-8 mx-auto text-[#7A7875] dark:text-slate-500" />
              <p className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">
                No interview sessions recorded yet
              </p>
              <p className="text-xs text-[#7A7875] dark:text-slate-400 max-w-sm mx-auto font-sans">
                Start a technical interview from the console to persist questions, evaluations, and reports.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const sid = item.session_id;
              const isCompleted = item.status === 'completed';
              const isInProgress = item.status === 'in_progress';

              return (
                <div
                  key={sid}
                  className="p-4 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/90 dark:bg-[#120516] hover:border-[#3A0F34] dark:hover:border-[#EAAA00] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#111111] dark:text-[#F8F6F1]">
                        {item.config.role}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516]">
                        {item.config.difficulty}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-[#250C3D] text-[#555555] dark:text-slate-300 border border-[#E5DFD5] dark:border-[#3A0F34]">
                        {item.config.primaryLanguage || item.config.primary_language}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#7A7875] dark:text-slate-400">
                      <span className="font-mono text-[11px] text-[#3A0F34] dark:text-[#EAAA00]">
                        {sid}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium font-mono">
                        {isCompleted ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                            <span className="text-[#3A0F34] dark:text-[#EAAA00] uppercase text-[10px] tracking-wider">Completed</span>
                          </>
                        ) : isInProgress ? (
                          <>
                            <PlayCircle className="h-3.5 w-3.5 text-[#EAAA00]" />
                            <span className="text-[#EAAA00] uppercase text-[10px] tracking-wider">In Progress</span>
                          </>
                        ) : (
                          <span className="capitalize text-[10px] tracking-wider">{item.status}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResumeSession(sid);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] hover:bg-[#2A0B26] dark:hover:bg-[#D49800] transition shadow-xs cursor-pointer"
                    >
                      <span>{isCompleted ? 'View Report' : 'Resume Round'}</span>
                      <ArrowRight className="h-3 w-3 text-[#EAAA00] dark:text-[#120516]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
