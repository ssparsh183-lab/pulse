"use client";

import { Users, Target, ShieldAlert, Sparkles, MessageSquareWarning, AlertTriangle } from "lucide-react";

interface Props {
  dna: {
    champions: number;
    learners: number;
    casuals: number;
    trolls: number;
    total_classified: number;
  };
  moments: {
    missed: any[];
    golden: any[];
  };
}

export function AudienceDNAPanel({ dna, moments }: Props) {
  if (!dna || !moments) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: Audience DNA */}
      <div className="glass-panel rounded-3xl p-6 border border-zinc-800 flex flex-col h-full">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          Audience DNA
        </h3>
        
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-100">Champions</p>
                <p className="text-[10px] text-emerald-400/70">Highly engaged, positive</p>
              </div>
            </div>
            <span className="text-xl font-bold text-emerald-400 tabular">{dna.champions}</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-100">Learners</p>
                <p className="text-[10px] text-amber-400/70">Asking doubts & requests</p>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-400 tabular">{dna.learners}</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs font-bold text-zinc-200">Casuals</p>
                <p className="text-[10px] text-zinc-500">Off-topic but present</p>
              </div>
            </div>
            <span className="text-xl font-bold text-zinc-400 tabular">{dna.casuals}</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 opacity-80">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <div>
                <p className="text-xs font-bold text-rose-200">Noise / Spam</p>
                <p className="text-[10px] text-rose-400/60">Filtered by engine</p>
              </div>
            </div>
            <span className="text-xl font-bold text-rose-400 tabular">{dna.trolls}</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Missed & Golden Moments */}
      <div className="flex flex-col gap-4 h-full">
        {/* Missed Moments */}
        <div className="glass-panel rounded-3xl p-6 border border-rose-500/20 flex-1 flex flex-col">
          <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Missed Moments (Unresolved)
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            {moments.missed && moments.missed.length > 0 ? (
              <div className="space-y-2">
                {moments.missed.map((m: any, i: number) => (
                  <div key={i} className="text-xs bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex justify-between items-center">
                    <span className="text-rose-200 truncate pr-2 font-medium">{m.label}</span>
                    <span className="text-rose-400 font-mono text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded shrink-0">{m.users} users</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-4">
                <p className="text-xs text-zinc-500 font-mono text-center">Zero critical missed signals. Great job.</p>
              </div>
            )}
          </div>
        </div>

        {/* Golden Moments */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 flex-1 flex flex-col">
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Golden Moments (Peak Feedback)
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            {moments.golden && moments.golden.length > 0 ? (
              <div className="space-y-2">
                {moments.golden.map((m: any, i: number) => (
                  <div key={i} className="text-xs bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex justify-between items-center">
                    <span className="text-emerald-200 truncate pr-2 font-medium">{m.label}</span>
                    <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">{m.users} users</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-4">
                <p className="text-xs text-zinc-500 font-mono text-center">No major feedback spikes detected yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}