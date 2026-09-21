// frontend/components/dashboard/context-slider.tsx

"use client";

import { Sparkles, Code, Gamepad2, MessageSquare } from "lucide-react";

interface Props {
  activeGenre: string;
  onGenreChange: (genre: string) => void;
  disabled?: boolean;
}

const CONTEXT_TABS = [
  { 
    key: "mixed", 
    label: "Mixed/General Context", 
    icon: MessageSquare, 
    border: "border-sky-500/20", 
    glow: "shadow-sky-500/10", 
    text: "text-sky-400", 
    activeBg: "bg-sky-500/10" 
  },
  { 
    key: "coding", 
    label: "Coding/Educational Context", 
    icon: Code, 
    border: "border-purple-500/20", 
    glow: "shadow-purple-500/10", 
    text: "text-purple-400", 
    activeBg: "bg-purple-500/10" 
  },
  { 
    key: "gaming", 
    label: "Gaming/Tech Context", 
    icon: Gamepad2, 
    border: "border-rose-500/20", 
    glow: "shadow-rose-500/10", 
    text: "text-rose-400", 
    activeBg: "bg-rose-500/10" 
  },
];

export function ContextSlider({ activeGenre, onGenreChange, disabled }: Props) {
  return (
    <div className="glass-panel rounded-2xl p-2 border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between gap-4 max-w-4xl mx-auto mb-6">
      <div className="flex items-center gap-2 pl-3 shrink-0">
        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
          Active Surveillance Context:
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {CONTEXT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGenre === tab.key;
          return (
            <button
              key={tab.key}
              disabled={disabled}
              onClick={() => onGenreChange(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 disabled:opacity-40 ${
                isActive
                  ? `${tab.activeBg} ${tab.text} ${tab.border} border shadow-[0_0_15px_rgba(168,85,247,0.1)] scale-[1.03]`
                  : "bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}