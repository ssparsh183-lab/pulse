"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, BrainCircuit, Target, Sparkles, TrendingUp,
  Users, Lightbulb, MessageSquare, Zap, Activity
} from "lucide-react";

interface Props {
  signals: any[];
  score?: any;
  dna?: any;
  streamMeta?: any;
  isLive?: boolean;
}

function generateInsights(signals: any[], score: any, dna: any, meta: any): any[] {
  const insights: any[] = [];
  
  if (!signals || signals.length === 0) {
    return [
      { title: "Engine Listening", action: "Waiting for audience consensus. First insights appear after 3+ users engage.", icon: Sparkles, color: "text-zinc-400", bg: "bg-zinc-500/10" },
      { title: "System Ready", action: `PULSE processing across 109 languages. Stream active.`, icon: BrainCircuit, color: "text-blue-400", bg: "bg-blue-500/10" },
      { title: "Zero Noise Baseline", action: "Compression engine active. Messages semantically fused in real-time.", icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" }
    ];
  }

  const cats: Record<string, number> = {};
  signals.forEach((s) => { if (s.category) cats[s.category] = (cats[s.category] || 0) + 1; });
  const topCat = Object.entries(cats).sort((a: any, b: any) => b[1] - a[1])[0]?.[0];
  const topSignal = signals[0];
  const risingSignals = signals.filter((s) => s.state === "rising" || (s.momentum && s.momentum > 4));

  if (topCat === "technical_issue") {
    insights.push({ title: "Critical Quality Alert", action: `Technical issues dominate (${cats.technical_issue} clusters). Address it live now to prevent viewer bleed.`, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" });
  } else if (topCat === "doubt") {
    insights.push({ title: "High Friction Detected", action: `${cats.doubt} unresolved doubts. Pause and recap the current topic.`, icon: BrainCircuit, color: "text-amber-400", bg: "bg-amber-500/10" });
  } else if (topCat === "content_request") {
    insights.push({ title: "Content Demand Spike", action: `Audience actively requesting follow-ups/notes. Capitalize with links or announcements.`, icon: Target, color: "text-sky-400", bg: "bg-sky-500/10" });
  } else if (topCat === "feedback" || topCat === "engagement") {
    insights.push({ title: "Healthy Resonance", action: `Audience sentiment is overwhelmingly positive (${cats[topCat]} clusters). Keep this pacing!`, icon: Sparkles, color: "text-emerald-400", bg: "bg-emerald-500/10" });
  } else {
    insights.push({ title: "Neutral Discussion", action: `${signals.length} distinct topics detected. Community is exploratory.`, icon: MessageSquare, color: "text-zinc-400", bg: "bg-zinc-500/10" });
  }

  if (risingSignals.length > 0) {
    insights.push({ title: `Momentum: "${risingSignals[0].label.substring(0, 20)}..."`, action: `Rising at +${Math.round(risingSignals[0].momentum || 0)} users/min. React NOW while attention peaks.`, icon: TrendingUp, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" });
  } else if (topSignal) {
    const shortLabel = topSignal.label.length > 20 ? topSignal.label.substring(0, 20) + "..." : topSignal.label;
    insights.push({ title: `Top Priority: "${shortLabel}"`, action: `${topSignal.unique_participant_count} unique voices rallied here. Address this directly.`, icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10" });
  }

  if (dna && dna.champions > 0) {
    insights.push({ title: `${dna.champions} Champions Identified`, action: `Your top ${dna.champions} contributors are leading engagement.`, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" });
  } else if (score) {
    insights.push({ title: `Health Score: ${score.score}/100`, action: `${score.reasons?.[0] || "System calculating baseline metrics."}`, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" });
  } else {
    insights.push({ title: "Community Alignment", action: `Acknowledge top signals by name to drive 3x higher retention.`, icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10" });
  }

  return insights.slice(0, 3);
}

export function SmartInsights({ signals, score, dna, streamMeta, isLive = false }: Props) {
  const [displayInsights, setDisplayInsights] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  // Update insights cards
  useEffect(() => {
    setDisplayInsights(generateInsights(signals, score, dna, streamMeta));
  }, [signals, score, dna, streamMeta]);

  // Smooth 15-second progress bar (Pure CSS/Interval - 0 glitch)
  useEffect(() => {
    if (!isLive) return;
    setProgress(0);
    const interval = 100; // update progress every 100ms
    const totalSteps = 150; // 15s / 0.1s = 150 steps
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);
      if (currentStep >= totalSteps) {
        currentStep = 0;
        setProgress(0);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isLive]);

  return (
    <div className="relative glass-panel rounded-3xl p-6 overflow-hidden border border-purple-500/10">
      {/* 15s Progress Bar */}
      {isLive && (
        <div
          style={{ width: `${progress}%` }}
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] transition-all duration-100 ease-linear z-10"
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
            {isLive ? "Smart Context (Updates 15s)" : "Actionable Insights"}
          </h2>
        </div>
        {!isLive && (
          <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md font-mono uppercase tracking-widest">
            Static · Post-Session
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {displayInsights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl flex flex-col gap-2 bg-zinc-900/60 border border-zinc-800 hover:border-[var(--brand-glow)] transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${insight.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${insight.color}`} />
                </div>
                <h4 className="text-xs font-bold text-zinc-100 truncate">{insight.title}</h4>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{insight.action}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}