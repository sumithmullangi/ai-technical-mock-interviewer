import React from 'react';
import {
  ArrowRight,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Sparkles,
  Cpu,
  Bot,
} from 'lucide-react';

interface HeroProps {
  onOpenSetup: () => void;
  onScrollToFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenSetup, onScrollToFeatures }) => {
  return (
    <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 overflow-hidden bg-[#050507] border-b border-white/[0.08]">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"
        style={{
          backgroundImage: `radial-gradient(rgba(0, 240, 255, 0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Copy */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Top Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0284c7]/30 bg-[#0284c7]/10 px-3.5 py-1 text-xs font-semibold text-[#00f0ff] shadow-sm mb-6">
              <Bot className="h-3.5 w-3.5 text-[#00f0ff]" />
              <span>Gemini Structured Output • Authoritative State Machine</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-white leading-[1.18]">
              Technical mock interviews evaluated against real production criteria.
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl">
              An engineering-grade practice platform for backend, systems, and data engineers.
              Tackle realistic primary coding challenges, navigate adaptive follow-up questions,
              and receive authoritative four-dimensional scorecards—with zero code execution hazards.
            </p>

            {/* Verified Capabilities Checklist */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00f0ff] shrink-0" />
                <span>Python, Java & SQL Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00f0ff] shrink-0" />
                <span>Four-Dimension Scoring Rubric</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00f0ff] shrink-0" />
                <span>Max 2 Adaptive Follow-Ups / Q</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00f0ff] shrink-0" />
                <span>Deterministic Offline Parity</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
              <button
                onClick={onOpenSetup}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#00f0ff] text-[#050507] font-bold px-6 py-3 text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] transition hover:opacity-95 active:scale-95 w-full sm:w-auto"
              >
                <span>Configure & Start Interview</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={onScrollToFeatures}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#07090e] px-5 py-3 text-sm font-semibold text-slate-300 shadow-sm transition hover:bg-slate-800 hover:text-white w-full sm:w-auto"
              >
                <Sliders className="h-4 w-4 text-[#00f0ff]" />
                <span>Explore Evaluation Rubric</span>
              </button>
            </div>

            {/* Security Guarantee Note */}
            <div className="mt-6 flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-[#00f0ff] shrink-0 mt-0.5" />
              <p>
                Candidate code is parsed strictly as untrusted text data for static AI analysis.
                No arbitrary code execution or sandboxing hazards.
              </p>
            </div>
          </div>

          {/* Right Column: Realistic Product Preview */}
          <div className="lg:col-span-6 w-full">
            <div className="relative mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-[#07090e] shadow-xl shadow-cyan-950/20 overflow-hidden text-left">
              {/* Product Window Top Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#050507] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700"></span>
                  <span className="ml-2 font-mono text-[11px] font-medium text-slate-400">
                    session: distributed-systems • Q2/5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#0284c7]/30 bg-[#0284c7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#38bdf8]">
                    Senior • Python
                  </span>
                  <span className="rounded-md border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00f0ff]">
                    In Progress
                  </span>
                </div>
              </div>

              {/* Question Context Card */}
              <div className="p-4 border-b border-white/[0.06] bg-[#07090e]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-white">
                    Challenge 2: High-Throughput Stream Ingestion & Backpressure
                  </span>
                  <span className="font-mono text-[11px] text-[#00f0ff]">Weight: 20%</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Design an asynchronous worker pool that consumes events from a Kafka topic, enforcing
                  backpressure when downstream database writes exceed latency thresholds.
                </p>
              </div>

              {/* Code Snippet Panel */}
              <div className="bg-[#050507] p-4 font-mono text-xs text-slate-100 leading-relaxed overflow-x-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-[#00f0ff]" />
                    stream_consumer.py
                  </span>
                  <span className="text-slate-500">Evaluated Candidate Solution</span>
                </div>
                <pre className="text-[11px] text-[#00f0ff]/90">
                  <code>{`1  class StreamConsumer:
2      def __init__(self, buffer_size=1000, high_watermark=0.8):
3          self.queue = asyncio.Queue(maxsize=buffer_size)
4          self.high_watermark = high_watermark
5  
6      async def handle_message(self, message):
7          if self.queue.qsize() / self.queue.maxsize > self.high_watermark:
8              await self.pause_partition_fetch()  # Flow control
9          await self.queue.put(message)`}</code>
                </pre>
              </div>

              {/* Live Evaluation Critique Summary */}
              <div className="p-4 bg-[#07090e] border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Sparkles className="h-3.5 w-3.5 text-[#00f0ff]" />
                    <span>Four-Dimensional AI Evaluation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-2 py-0.5 rounded tabular-nums">
                      Score: 8.8 / 10.0
                    </span>
                    <span className="text-[10px] font-bold text-[#00f0ff] bg-[#00f0ff]/10 px-1.5 py-0.5 rounded border border-[#00f0ff]/30">
                      Pass
                    </span>
                  </div>
                </div>

                {/* 4 Mini Progress Indicators */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="rounded-lg border border-white/[0.08] bg-[#050507] p-2 text-center">
                    <span className="block text-slate-400 text-[10px]">Correctness</span>
                    <span className="font-mono font-bold text-[#00f0ff] tabular-nums">9.0</span>
                    <span className="block text-[9px] text-slate-500 font-mono">40% Wt</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-[#050507] p-2 text-center">
                    <span className="block text-slate-400 text-[10px]">Depth</span>
                    <span className="font-mono font-bold text-[#38bdf8] tabular-nums">8.5</span>
                    <span className="block text-[9px] text-slate-500 font-mono">25% Wt</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-[#050507] p-2 text-center">
                    <span className="block text-slate-400 text-[10px]">Edge Cases</span>
                    <span className="font-mono font-bold text-[#00f0ff] tabular-nums">8.5</span>
                    <span className="block text-[9px] text-slate-500 font-mono">20% Wt</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-[#050507] p-2 text-center">
                    <span className="block text-slate-400 text-[10px]">Clarity</span>
                    <span className="font-mono font-bold text-[#38bdf8] tabular-nums">9.0</span>
                    <span className="block text-[9px] text-slate-500 font-mono">15% Wt</span>
                  </div>
                </div>

                {/* Adaptive Drill-down Question Box */}
                <div className="rounded-xl border border-[#0284c7]/30 bg-[#0284c7]/10 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#00f0ff] mb-1">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Adaptive Drill-Down (1 of 2 max)
                    </span>
                    <span className="text-[10px] text-[#38bdf8] font-mono">Active Follow-Up</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    "What happens to uncommitted consumer offsets if the worker process crashes while
                    rebalancing partitions during a pause state?"
                  </p>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="bg-[#050507] px-4 py-2 text-[11px] text-slate-400 border-t border-white/[0.08] flex items-center justify-between">
                <span>FastAPI Authoritative State Engine</span>
                <span className="font-mono text-[10px] text-[#00f0ff]">POST /api/v1/interviews/{'{id}'}/follow-up</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
