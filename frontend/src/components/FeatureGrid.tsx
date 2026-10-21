import React from 'react';
import {
  Target,
  Layers,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Cpu,
  Award,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  GitBranch,
  Terminal,
  Check,
  ArrowLeft,
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
    <div className="py-8 sm:py-12 space-y-16">
      {/* Contextual Reference Navigation Bar */}
      {onBackToConsole && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 transition-colors">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToConsole}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Interview Console</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span>/</span>
                <span className="font-medium text-slate-600 dark:text-slate-400">Documentation & Reference Specs</span>
              </div>
            </div>

            {/* Section Switcher Pills */}
            {onSelectSection && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => onSelectSection('rubric')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    activeSection === 'rubric'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Rubric
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('workflow')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    activeSection === 'workflow'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Workflow
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('sample-report')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    activeSection === 'sample-report'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Sample Report
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('architecture')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    activeSection === 'architecture'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Architecture
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSection('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    activeSection === 'all'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  View All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. INTERVIEW WORKFLOW SECTION */}
      {showWorkflow && (
        <section id="workflow" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <RotateCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Engineered Interview Lifecycle
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                How the State Machine Governs Your Session
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Every mock interview is orchestrating through a server-authoritative state machine,
                preventing client manipulation and providing reproducible technical feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-sm font-bold border border-blue-200 dark:border-blue-800">
                      01
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700">
                      Pydantic v2
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Session Configuration</h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Select your engineering discipline, seniority level (Junior to Staff), language (Python, Java, SQL),
                    and question depth (3–10 challenges). The backend strictly validates inputs.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  POST /api/v1/interviews/config
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-sm font-bold border border-blue-200 dark:border-blue-800">
                      02
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700">
                      Primary Challenge
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Technical Formulation</h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Receive an algorithmic or architectural question with starter code. Submit your solution via code editor
                    or text transcript. Code is analyzed safely as text—never executed.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  POST /api/v1/interviews/{'{id}'}/answers
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono text-sm font-bold border border-amber-200 dark:border-amber-800">
                      03
                    </span>
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Max 2 Follow-Ups
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Adaptive Drill-Downs</h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    If Gemini detects missing concepts, edge-case oversights, or concurrency flaws, it dynamically generates
                    up to 2 targeted drill-down questions before allowing question progression.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  POST /api/v1/interviews/{'{id}'}/follow-up
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                      04
                    </span>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Synthesized Report
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Four-Dimension Scoring</h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    The backend computes authoritative weighted scores across all challenges, aggregates recurring strengths and gaps,
                    and provides an executive performance report.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  GET /api/v1/interviews/{'{id}'}/report
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. FOUR-DIMENSIONAL SCORING RUBRIC */}
      {showRubric && (
        <section id="rubric" className={`scroll-mt-20 ${activeSection === 'all' ? 'border-t border-slate-200/80 dark:border-slate-800 pt-16' : 'pt-2'} bg-white dark:bg-slate-950 transition-colors`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Award className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Authoritative Evaluation Standard
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Four-Dimensional Weighted Scoring Model
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Every answer is graded on a calibrated 0.0 to 10.0 scale across four distinct technical criteria.
              The authoritative formula is calculated directly on the backend:
            </p>
            <div className="mt-4 inline-block rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-inner">
              Overall Score = (Correctness × 0.40) + (Depth × 0.25) + (Edge Cases × 0.20) + (Communication × 0.15)
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Dimension 1: Correctness */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Target className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  40% Weight
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Technical Correctness</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Evaluates algorithmic accuracy, syntactic precision, correct data structures, and sound logical execution.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Algorithmic validity</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Syntax and type discipline</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Data structure appropriateness</span>
                </li>
              </ul>
            </div>

            {/* Dimension 2: Architectural Depth */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                  <Layers className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  25% Weight
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Architectural Depth</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Measures understanding of time/space complexity analysis, concurrency models, system bottlenecks, and trade-offs.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Big-O asymptotic bounds</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Concurrency & lock safety</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Scalability trade-offs</span>
                </li>
              </ul>
            </div>

            {/* Dimension 3: Edge-Case Awareness */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  20% Weight
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edge-Case Awareness</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tests boundary condition handling: null inputs, empty collections, network timeouts, duplicate requests, and idempotency.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Null, empty, and upper bounds</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Failure and retry recovery</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Idempotent execution</span>
                </li>
              </ul>
            </div>

            {/* Dimension 4: Communication & Clarity */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  15% Weight
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Communication & Clarity</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Assesses articulate formulation of engineering choices, structured problem decomposition, and collaborative explanation.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Structured explanation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Clean variable naming</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Clear decision rationale</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 3. SYSTEM GUARANTEES & SAFETY ARCHITECTURE */}
      {(showWorkflow || showArchitecture) && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/80 dark:to-slate-950 p-8 sm:p-10 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200/80 dark:border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Enterprise Reliability
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  Core Architectural Safety Guarantees
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 self-start md:self-auto">
                Verified Implementation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Guarantee 1: Zero Execution */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mb-3 border border-rose-100 dark:border-rose-900/60">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Execution Attack Surface</h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Candidate code is never executed or compiled in arbitrary server runtimes. Gemini performs static AST and semantic review,
                  eliminating RCE, breakout, and server security hazards entirely.
                </p>
              </div>

              {/* Guarantee 2: Rate Limiting & 429 Resilience */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-3 border border-blue-100 dark:border-blue-800">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">HTTP 429 Quota Backoff & Retries</h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The AI service incorporates bounded exponential backoff with <code className="text-blue-700 dark:text-blue-400">Retry-After</code> header parsing.
                  Transient quota spikes trigger transparent retry loops before returning structured 429 responses.
                </p>
              </div>

              {/* Guarantee 3: Offline Mock Parity */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deterministic Offline Parity</h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  When <code className="text-slate-800 dark:text-slate-300">GEMINI_API_KEY</code> is unset, the system shifts to a deterministic multi-question catalog across Python,
                  Java, and SQL—permitting 100% offline development, CI/CD, and portfolio demonstrations.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. REALISTIC SAMPLE REPORT PREVIEW */}
      {showSampleReport && (
        <section id="sample-report" className={`scroll-mt-20 ${activeSection === 'all' ? 'border-t border-slate-200/80 dark:border-slate-800 pt-16' : 'pt-2'} bg-slate-50/50 dark:bg-slate-950/50 transition-colors`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Comprehensive Deliverable
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Realistic Candidate Performance Report Preview
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Below is a realistic simulation of the final assessment delivered at the conclusion of every completed interview.
            </p>
          </div>

          {/* Sample Report Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md shadow-slate-200/50 dark:shadow-none max-w-4xl mx-auto transition-colors">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Sample Report Simulation
                  </span>
                  <span className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    Senior • Python
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  Distributed Systems Engineer Evaluation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Completed 5 of 5 Primary Challenges • 2 Adaptive Follow-Ups Addressed
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Overall Authoritative Score</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">8.6</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">/ 10.0</span>
                </div>
                <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mt-1 font-mono">
                  Strong Pass
                </span>
              </div>
            </div>

            {/* 4 Dimension Score Meters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Correctness <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">(40%)</span></span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">9.0</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Depth <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">(25%)</span></span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">8.5</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Edge Cases <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">(20%)</span></span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">8.0</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Clarity <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">(15%)</span></span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">8.8</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
            </div>

            {/* Qualitative Narrative Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs leading-relaxed">
              {/* Executive Summary */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Executive Evaluation
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  The candidate displayed exceptional architectural maturity across distributed systems questions.
                  Particularly noteworthy was their implementation of asynchronous queue backpressure and idempotency key locks.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Key Demonstrated Strengths
                </h4>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>Sound Big-O complexity awareness with optimal Redis TTL caching.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>Clear variable and handler structure matching production conventions.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>Addressed adaptive drill-downs with proactive lock expiration handling.</span>
                  </li>
                </ul>
              </div>

              {/* Areas for Growth & Concrete Next Steps */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Identified Areas for Growth
                </h4>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>Consider explicit fencing tokens to prevent split-brain under GC pause.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                    <span>Clarify rollback semantics when cascading secondary database updates fail.</span>
                  </li>
                </ul>

                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pt-2">
                  <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Actionable Next Steps
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  Review distributed consensus protocols (e.g. Raft) and lease-based locks. Practice formulating explicit boundary invariants before writing implementation code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. ARCHITECTURE & ROADMAP */}
      {showArchitecture && (
        <section id="architecture" className={`scroll-mt-20 ${activeSection === 'all' ? 'border-t border-slate-200/80 dark:border-slate-800 pt-16' : 'pt-2'} transition-colors`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <GitBranch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Engineering Roadmap
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Milestone-Based Full-Stack Architecture
              </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Built to high-rigor modular specifications with clean boundaries between API routes,
              Pydantic validation, database persistence, and AI evaluation services.
            </p>
          </div>

          {/* 4 Milestones Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Milestone 1 (Complete) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Check className="h-4 w-4" /> Milestone 1 (Complete)
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Scaffold & Baseline</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                FastAPI service with health checks & CORS, React 19 + TypeScript + Tailwind CSS, and repository standards.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">FastAPI</span>
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">React 19</span>
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">Vite</span>
              </div>
            </div>

            {/* Milestone 2 (Complete) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Check className="h-4 w-4" /> Milestone 2 (Complete)
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Configuration & Validation</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Interactive setup modal, Pydantic configuration validation, and POST /api/v1/interviews/config integration.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">Pydantic v2</span>
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">REST API</span>
              </div>
            </div>

            {/* Milestone 3 (Complete) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Check className="h-4 w-4" /> Milestone 3 (Complete)
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">AI Engine & State Machine</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Backend-authoritative progression, Gemini Pydantic schemas, 429 quota backoff, and offline catalog fallback.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">Gemini 2.5</span>
                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-transparent dark:border-slate-700">State Engine</span>
              </div>
            </div>

            {/* Milestone 4 (Active / Local Complete) */}
            <div className="relative rounded-2xl border-2 border-blue-600 bg-white dark:bg-slate-900 p-5 shadow-md shadow-blue-600/10 transition-colors">
              <div className="absolute -top-3 right-4 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Active
              </div>
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" /> Milestone 4
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Persistence & Reports</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                PostgreSQL + SQLAlchemy 2.0 persistence, Alembic migrations, and 4-dimension performance reports.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 border border-blue-100 dark:border-blue-900/60">PostgreSQL</span>
                <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 border border-blue-100 dark:border-blue-900/60">SQLAlchemy 2.0</span>
                <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 border border-blue-100 dark:border-blue-900/60">Alembic</span>
              </div>
            </div>
          </div>

          {/* Quickstart Command Bar */}
          <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-900/90 p-4 text-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                <Terminal className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Backend: <code className="text-emerald-400">uvicorn app.main:app --reload</code></span>
                <span className="hidden sm:inline text-slate-600 dark:text-slate-500">|</span>
                <span>Frontend: <code className="text-cyan-400">npm run dev</code></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <GitBranch className="h-3.5 w-3.5 text-blue-400" />
                <span>Branch: <span className="text-slate-200 font-mono">main</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};

