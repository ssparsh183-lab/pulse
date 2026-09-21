// frontend/components/dashboard/genre-selection-modal.tsx

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Code, Gamepad2, MessageCircle, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (genre: string) => void;
  joiningLive: boolean;
}

const GENRE_CARDS = [
  { 
    key: "mixed", 
    label: "Mixed/General Context", 
    desc: "Baseline organic processing for standard Q&A, discussion, and community streams.", 
    icon: MessageCircle, 
    color: "text-sky-400 border-sky-500/20 bg-sky-500/5 hover:border-sky-500/50" 
  },
  { 
    key: "coding", 
    label: "Coding/Educational Context", 
    desc: "Calibrated for lectures, programming concepts (closures, recursion) and academic doubts.", 
    icon: Code, 
    color: "text-purple-400 border-purple-500/20 bg-purple-500/5 hover:border-purple-500/50" 
  },
  { 
    key: "gaming", 
    label: "Gaming/Tech Context", 
    desc: "Calibrated for esports, gameplay walkthroughs, hardware lags, and game queries.", 
    icon: Gamepad2, 
    color: "text-rose-400 border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50" 
  },
];

export function GenreSelectionModal({ isOpen, onClose, onConfirm, joiningLive }: Props) {
  const [selected, setSelected] = useState<string>("mixed");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-zinc-950/95 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl" showCloseButton={false}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            Initialize Context Intelligence
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 font-mono">
            PULSE will calibrate its semantic vector space based on the selected context brain.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {GENRE_CARDS.map((card) => {
            const Icon = card.icon;
            const isSelected = selected === card.key;
            return (
              <button
                key={card.key}
                onClick={() => setSelected(card.key)}
                className={`text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-36 relative overflow-hidden ${
                  isSelected 
                    ? "border-purple-500/80 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.15)] scale-[1.02]" 
                    : card.color
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-xl bg-black/40 border border-zinc-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 mb-1">{card.label}</h4>
                  <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">{card.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onConfirm(selected)}
          disabled={joiningLive}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-2xl text-xs transition disabled:opacity-50"
        >
          {joiningLive ? "Configuring Command Center..." : "Launch Command Center"}
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      </DialogContent>
    </Dialog>
  );
}