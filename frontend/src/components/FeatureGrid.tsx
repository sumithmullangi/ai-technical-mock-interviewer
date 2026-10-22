import React from 'react';
import {
  Target,
  Layers,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Server,
  Database,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface FeatureGridProps {
  activeSection?: 'all' | 'rubric' | 'workflow' | 'sample-report' | 'architecture';
  onSelectSection?: (section: 'all' | 'rubric' | 'workflow' | 'sample-report' | 'architecture') => void;
  onBackToConsole?: () => void;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  activeSection = 'all',
  onSelectSection,
  onBackToConsole,
}) => {
  const showWorkflow = activeSection === 'all' || activeSection === 'workflow';
  const showRubric = activeSection === 'all' || activeSection === 'rubric';
  const showSampleReport = activeSection === 'all' || activeSection === 'sample-report';
  const showArchitecture = activeSection === 'all' || activeSection === 'architecture';

  return (
    <div className="w-full relative z-10 animate-fadeIn">
      <div className="editorial-frame border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
        {/* Contextual Reference Navigation Bar */}
        {onBackToConsole && (
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-8 py-3.5 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 bg-[#F8F6F1]/80 dark:bg-[#16061D]/90 backdrop-blur-xs gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToConsole}
                className="inline-flex items-center gap-1.5 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] px-3 py-1.5 text-xs font-mono font-semibold text-[#111111] dark:text-[#F8F6F1] hover:bg-[#F0EDE6] dark:hover:bg-[#34114F] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                <span>Return to Studio Console</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[#7A7875] dark:text-slate-400">
                <span>//</span>
                <span>DOCUMENTATION & SPECIFICATIONS</span>
              </div>
            </div>

            {/* Section Switcher Pills */}
            {onSelectSection && (
              <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => onSelectSection('rubric')}
                  className={`px-3 py-1 border transition cursor-pointer ${
                    activeSection === 'rubric'
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold'
                      : 'bg-white text-[#555555] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-300 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                  }`}
                >
                  Rubric
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('workflow')}
                  className={`px-3 py-1 border transition cursor-pointer ${
                    activeSection === 'workflow'
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold'
                      : 'bg-white text-[#555555] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-300 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                  }`}
                >
                  Workflow
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('sample-report')}
                  className={`px-3 py-1 border transition cursor-pointer ${
                    activeSection === 'sample-report'
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold'
                      : 'bg-white text-[#555555] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-300 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                  }`}
                >
                  Sample Report
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('architecture')}
                  className={`px-3 py-1 border transition cursor-pointer ${
                    activeSection === 'architecture'
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold'
                      : 'bg-white text-[#555555] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-300 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                  }`}
                >
                  Architecture
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('all')}
                  className={`px-3 py-1 border transition cursor-pointer ${
                    activeSection === 'all'
                      ? 'bg-[#3A0F34] text-white border-[#3A0F34] dark:bg-[#EAAA00] dark:text-[#120516] dark:border-[#EAAA00] font-bold'
                      : 'bg-white text-[#555555] border-[#E5DFD5] dark:bg-[#16061D] dark:text-slate-300 dark:border-[#3A0F34] hover:text-[#111111] dark:hover:text-[#F8F6F1]'
                  }`}
                >
                  All Specs
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1. INTERVIEW WORKFLOW SECTION */}
        {showWorkflow && (
          <section id="workflow" className="scroll-mt-20 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 px-4 sm:px-8 py-16">
            <div className="max-w-4xl mb-12">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-2">
                • SPECIMEN 02 / LIFECYCLE ARCHITECTURE •
              </span>
              <h2 className="font-didone text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95]">
                How the State Machine Governs Your Session
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#555555] dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
                Every mock interview is strictly orchestrated through a server-authoritative finite state machine, preventing client tampering and providing reproducible technical feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs flex flex-col justify-between rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-7 w-7 items-center justify-center bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs font-bold">
                      01
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-semibold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      Schema Validated
                    </span>
                  </div>
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Session Configuration</h3>
                  <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                    Select your engineering domain, seniority level (Junior to Staff), language (Python, Java, SQL), and question count (3–10 challenges). Inputs strictly validated.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  POST /api/v1/interviews/config
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs flex flex-col justify-between rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-7 w-7 items-center justify-center bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs font-bold">
                      02
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-semibold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      Primary Challenge
                    </span>
                  </div>
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Technical Formulation</h3>
                  <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                    Receive an algorithmic or architectural question with starter code stub. Submit solutions via code or text. Reviewed via static AST analysis—never executed.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  POST /api/v1/interviews/{'{id}'}/answers
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs flex flex-col justify-between rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-7 w-7 items-center justify-center bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs font-bold">
                      03
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-semibold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      Max 2 Follow-Ups
                    </span>
                  </div>
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Adaptive Drill-Downs</h3>
                  <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                    If Gemini identifies missing concepts, concurrency hazards, or scale oversights, it dynamically generates up to 2 targeted follow-ups before advancing.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  POST /api/v1/interviews/{'{id}'}/follow-up
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs flex flex-col justify-between rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-7 w-7 items-center justify-center bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] font-mono text-xs font-bold">
                      04
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-semibold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                      Synthesized Report
                    </span>
                  </div>
                  <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Four-Dimension Scoring</h3>
                  <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                    The backend computes authoritative weighted scores across all challenges, aggregates recurring strengths and omissions, and generates an executive dossier.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  GET /api/v1/interviews/{'{id}'}/report
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. FOUR-DIMENSIONAL SCORING RUBRIC */}
        {showRubric && (
          <section id="rubric" className="scroll-mt-20 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 px-4 sm:px-8 py-16">
            <div className="max-w-4xl mb-12">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-2">
                • SPECIMEN 03 / EVALUATION STANDARD •
              </span>
              <h2 className="font-didone text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95]">
                Four-Dimensional Weighted Scoring Model
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#555555] dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
                Every candidate submission is graded on a calibrated 0.0 to 10.0 scale across four distinct criteria. The authoritative score is calculated directly on the backend:
              </p>
              <div className="mt-4 inline-block border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#250C3D] px-4 py-2 font-mono text-xs font-semibold text-[#3A0F34] dark:text-[#EAAA00]">
                Overall Score = (Correctness × 0.40) + (Depth × 0.25) + (Edge Cases × 0.20) + (Communication × 0.15)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Dimension 1: Correctness */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    40% Weight
                  </span>
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Technical Correctness</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Evaluates algorithmic accuracy, syntactic precision, correct data structures, and sound logical execution.
                </p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-[#444444] dark:text-slate-300 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 pt-3 font-sans">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Algorithmic validity</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Syntax and type discipline</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Data structure appropriateness</span>
                  </li>
                </ul>
              </div>

              {/* Dimension 2: Architectural Depth */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    25% Weight
                  </span>
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Architectural Depth</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Measures understanding of time/space complexity analysis, concurrency models, system bottlenecks, and trade-offs.
                </p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-[#444444] dark:text-slate-300 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 pt-3 font-sans">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Big-O asymptotic bounds</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Concurrency & lock safety</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Scalability trade-offs</span>
                  </li>
                </ul>
              </div>

              {/* Dimension 3: Edge-Case Awareness */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <AlertTriangle className="h-4 w-4 text-[#EAAA00]" />
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    20% Weight
                  </span>
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Edge-Case Awareness</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Tests boundary condition handling: null inputs, empty collections, network timeouts, duplicate requests, and idempotency.
                </p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-[#444444] dark:text-slate-300 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 pt-3 font-sans">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Null, empty, and upper bounds</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Failure and retry recovery</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Idempotent execution</span>
                  </li>
                </ul>
              </div>

              {/* Dimension 4: Communication & Clarity */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    15% Weight
                  </span>
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Communication & Clarity</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Assesses articulate formulation of engineering choices, structured problem decomposition, and collaborative explanation.
                </p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-[#444444] dark:text-slate-300 border-t border-[#E5DFD5] dark:border-[#3A0F34]/50 pt-3 font-sans">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Structured explanation</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Clean variable naming</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#3A0F34] dark:text-[#EAAA00] shrink-0" />
                    <span>Clear decision rationale</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 3. SYSTEM GUARANTEES & SAFETY ARCHITECTURE */}
        {(showWorkflow || showArchitecture) && (
          <section className="border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 px-4 sm:px-8 py-16">
            <div className="max-w-4xl mb-12">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-2">
                • ARCHITECTURAL SAFEGUARDS •
              </span>
              <h2 className="font-didone text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95]">
                Core Architectural Safety Guarantees
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Guarantee 1: Zero Execution */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex h-8 w-8 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34] mb-3">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Zero Execution Attack Surface</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Candidate code is never executed or compiled in arbitrary server runtimes. Gemini performs static AST and semantic review, eliminating RCE and container breakout hazards entirely.
                </p>
              </div>

              {/* Guarantee 2: Rate Limiting & 429 Resilience */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex h-8 w-8 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34] mb-3">
                  <Cpu className="h-4 w-4" />
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">HTTP 429 Quota Backoff & Retries</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  The AI service incorporates bounded exponential backoff with <code className="text-[#3A0F34] dark:text-[#EAAA00] font-mono">Retry-After</code> header parsing. Transient quota spikes trigger transparent retry loops before returning structured 429 responses.
                </p>
              </div>

              {/* Guarantee 3: Offline Mock Parity */}
              <div className="relative p-6 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex h-8 w-8 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34] mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Deterministic Offline Parity</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  When <code className="text-[#3A0F34] dark:text-[#EAAA00] font-mono">GEMINI_API_KEY</code> is unset, the system shifts to a deterministic multi-question catalog across Python, Java, and SQL—permitting 100% offline development and portfolio demonstrations.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 4. REALISTIC SAMPLE REPORT PREVIEW */}
        {showSampleReport && (
          <section id="sample-report" className="scroll-mt-20 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 px-4 sm:px-8 py-16">
            <div className="max-w-4xl mb-12">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-2">
                • SPECIMEN 04 / CANDIDATE DOSSIER •
              </span>
              <h2 className="font-didone text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95]">
                Candidate Performance Dossier Preview
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#555555] dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
                Below is a simulation of the authoritative assessment delivered at the conclusion of every completed interview.
              </p>
            </div>

            {/* Sample Report Broadsheet */}
            <div className="relative border border-[#E5DFD5] dark:border-[#3A0F34] bg-[#F8F6F1]/80 dark:bg-[#16061D]/90 backdrop-blur-xs p-6 sm:p-10 rounded-none">
              <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
              <div className="editorial-crosshair -top-2 -right-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
              <div className="editorial-crosshair -bottom-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
              <div className="editorial-crosshair -bottom-2 -right-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>

              {/* Dossier Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-[#7A7875] dark:text-slate-300 bg-white dark:bg-[#250C3D] border border-[#E5DFD5] dark:border-[#3A0F34] uppercase">
                      Sample Report Simulation
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] bg-[#3A0F34]/10 dark:bg-[#EAAA00]/20 border border-[#3A0F34]/20 dark:border-[#EAAA00]/40">
                      Senior • Python
                    </span>
                  </div>
                  <h3 className="font-didone text-2xl font-bold text-[#111111] dark:text-[#F8F6F1] mt-2">
                    Distributed Systems Engineer Evaluation
                  </h3>
                  <p className="text-xs text-[#7A7875] dark:text-slate-400 mt-0.5 font-sans">
                    Completed 5 of 5 Primary Challenges • 2 Adaptive Follow-Ups Addressed
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A7875] dark:text-slate-400 block">Authoritative Score</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-didone text-4xl font-black text-[#111111] dark:text-[#F8F6F1] tracking-tight">8.6</span>
                    <span className="text-xs font-mono font-semibold text-[#7A7875] dark:text-slate-400">/ 10.0</span>
                  </div>
                  <span className="inline-block bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516] px-2.5 py-0.5 text-[10px] font-mono font-bold mt-1">
                    Strong Pass
                  </span>
                </div>
              </div>

              {/* 4 Dimension Score Meters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-b border-[#E5DFD5] dark:border-[#3A0F34]/50">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Correctness <span className="font-mono text-[#7A7875] dark:text-slate-400 text-[10px]">(40%)</span></span>
                    <span className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00]">9.0</span>
                  </div>
                  <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                    <div className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Depth <span className="font-mono text-[#7A7875] dark:text-slate-400 text-[10px]">(25%)</span></span>
                    <span className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00]">8.5</span>
                  </div>
                  <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                    <div className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Edge Cases <span className="font-mono text-[#7A7875] dark:text-slate-400 text-[10px]">(20%)</span></span>
                    <span className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00]">8.0</span>
                  </div>
                  <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                    <div className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1]">Clarity <span className="font-mono text-[#7A7875] dark:text-slate-400 text-[10px]">(15%)</span></span>
                    <span className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00]">8.8</span>
                  </div>
                  <div className="w-full bg-[#E5DFD5] dark:bg-[#250C3D] h-1.5 rounded-none overflow-hidden">
                    <div className="bg-[#3A0F34] dark:bg-[#EAAA00] h-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>

              {/* Qualitative Narrative Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 text-xs leading-relaxed">
                <div className="space-y-3">
                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
                    Executive Evaluation
                  </h4>
                  <p className="text-[#333333] dark:text-slate-300 font-sans">
                    The candidate displayed exceptional architectural maturity across distributed systems questions. Particularly noteworthy was their implementation of asynchronous queue backpressure and idempotency key locks.
                  </p>

                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider text-[11px] flex items-center gap-1.5 pt-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                    Key Demonstrated Strengths
                  </h4>
                  <ul className="space-y-1.5 text-[#444444] dark:text-slate-300 font-sans">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#3A0F34] dark:text-[#EAAA00] font-bold">•</span>
                      <span>Sound Big-O complexity awareness with optimal Redis TTL caching.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#3A0F34] dark:text-[#EAAA00] font-bold">•</span>
                      <span>Clear variable and handler structure matching production conventions.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#3A0F34] dark:text-[#EAAA00] font-bold">•</span>
                      <span>Addressed adaptive drill-downs with proactive lock expiration handling.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#EAAA00]" />
                    Identified Areas for Growth
                  </h4>
                  <ul className="space-y-1.5 text-[#444444] dark:text-slate-300 font-sans">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#EAAA00] font-bold">•</span>
                      <span>Consider explicit fencing tokens to prevent split-brain under GC pause.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#EAAA00] font-bold">•</span>
                      <span>Clarify rollback semantics when cascading secondary database updates fail.</span>
                    </li>
                  </ul>

                  <h4 className="font-mono font-bold text-[#3A0F34] dark:text-[#EAAA00] uppercase tracking-wider text-[11px] flex items-center gap-1.5 pt-2">
                    <Target className="h-3.5 w-3.5 text-[#3A0F34] dark:text-[#EAAA00]" />
                    Actionable Next Steps
                  </h4>
                  <p className="text-[#333333] dark:text-slate-300 font-sans">
                    Review distributed consensus protocols (e.g. Raft) and lease-based locks. Practice formulating explicit boundary invariants before writing implementation code.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. ARCHITECTURE & ROADMAP */}
        {showArchitecture && (
          <section id="architecture" className="scroll-mt-20 px-4 sm:px-8 py-16">
            <div className="max-w-4xl mb-12">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#3A0F34] dark:text-[#EAAA00] font-bold block mb-2">
                • SPECIMEN 05 / ARCHITECTURAL CORE •
              </span>
              <h2 className="font-didone text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] dark:text-[#F8F6F1] leading-[0.95]">
                Engineered for Rigorous Developer Assessment
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#555555] dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
                Built with strict layer isolation, non-execution sandboxing, server-authoritative state progression, and resilient AI evaluation pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pillar 1 */}
              <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#7A7875] dark:text-slate-400 uppercase font-mono">01 / Runtime</span>
                  <div className="flex h-7 w-7 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <Server className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="mt-3 font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">High-Performance Core</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  FastAPI async REST services with strict Pydantic v2 validation, sub-50ms schema verification, and isolated static evaluation guards.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">FastAPI</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">AsyncIO</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Pydantic v2</span>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#7A7875] dark:text-slate-400 uppercase font-mono">02 / State Engine</span>
                  <div className="flex h-7 w-7 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="mt-3 font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Authoritative State Machine</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Strict server-side finite state transitions across 4 session phases (Configured → In-Progress → Evaluation → Completed) to eliminate tampering.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Anti-Tamper</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">UUID v4</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">FSM</span>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#7A7875] dark:text-slate-400 uppercase font-mono">03 / Intelligence</span>
                  <div className="flex h-7 w-7 items-center justify-center bg-white dark:bg-[#120516] text-[#3A0F34] dark:text-[#EAAA00] border border-[#E5DFD5] dark:border-[#3A0F34]">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="mt-3 font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Dual-Core AI Grading</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  Gemini 2.5 Flash evaluation paired with an offline calibrated catalog, automated 429 quota backoff, and zero-execution code review.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#7A7875] dark:text-slate-400">
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Gemini 2.5</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Quota Backoff</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Offline Catalog</span>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="relative p-5 border border-[#E5DFD5] dark:border-[#3A0F34]/60 bg-[#F8F6F1]/75 dark:bg-[#16061D]/80 backdrop-blur-xs rounded-none">
                <div className="editorial-crosshair -top-2 -left-2 text-[#E5DFD5] dark:text-[#3A0F34]">+</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#3A0F34] dark:text-[#EAAA00] uppercase font-mono">04 / Data Store</span>
                  <div className="flex h-7 w-7 items-center justify-center bg-[#3A0F34] dark:bg-[#EAAA00] text-white dark:text-[#120516]">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="mt-3 font-didone text-base font-bold text-[#111111] dark:text-[#F8F6F1]">Enterprise Persistence</h3>
                <p className="mt-2 text-xs text-[#555555] dark:text-slate-300 leading-relaxed font-sans">
                  PostgreSQL relational data tier with SQLAlchemy 2.0 ORM, Alembic schema migrations, and granular 4-dimension performance telemetry.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#3A0F34] dark:text-[#EAAA00]">
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">PostgreSQL</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">SQLAlchemy 2.0</span>
                  <span className="bg-white dark:bg-[#120516] px-2 py-0.5 border border-[#E5DFD5] dark:border-[#3A0F34]">Alembic</span>
                </div>
              </div>
            </div>

            {/* System Status Datum Bar */}
            <div className="mt-8 border border-[#E5DFD5] dark:border-[#3A0F34] bg-white dark:bg-[#16061D] p-4 text-[#111111] dark:text-[#F8F6F1]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#EAAA00]"></span>
                    <span className="font-semibold text-[#111111] dark:text-[#F8F6F1] font-mono">SYSTEM READY</span>
                  </div>
                  <span className="hidden sm:inline text-[#E5DFD5] dark:text-[#3A0F34]">|</span>
                  <span className="text-[#555555] dark:text-slate-300 font-mono text-[11px]">Security Model: <span className="text-[#3A0F34] dark:text-[#EAAA00] font-medium">Static AST (Zero Execution)</span></span>
                  <span className="hidden sm:inline text-[#E5DFD5] dark:text-[#3A0F34]">|</span>
                  <span className="text-[#555555] dark:text-slate-300 font-mono text-[11px]">Persistence: <span className="text-[#3A0F34] dark:text-[#EAAA00] font-medium">PostgreSQL Tier</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#7A7875] dark:text-slate-400 font-mono text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-[#3A0F34] dark:text-[#EAAA00]" />
                  <span>Production-Grade Architecture</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
