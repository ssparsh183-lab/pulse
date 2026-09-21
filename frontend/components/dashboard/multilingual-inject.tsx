"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe2, Send, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const LANG_CHIPS = [
  { code: "ES", label: "Spanish", text: "problema de audio no se escucha" },
  { code: "FR", label: "French", text: "le son ne marche pas du tout" },
  { code: "ZH", label: "Chinese", text: "没有声音 音频有问题" },
  { code: "HI", label: "Hinglish", text: "bhai awaz bilkul nahi aa rahi" },
  { code: "EN", label: "English", text: "still no audio on my side" },
];

interface Props {
  streamId: string | null;
  onInjected?: (text: string) => void;
  disabled?: boolean;
  genre?: string;
}

export function MultilingualInject({ streamId, onInjected, disabled, genre }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const runInject = async (msg: string) => {
    if (!streamId) {
      toast.error("Run demo first — no active stream");
      return;
    }
    const clean = msg.trim();
    if (!clean) return;

    setLoading(true);
    setLastResult(null);
    try {
      const res = await api.injectMessage(streamId, {
        text: clean,
        participant_name: "judge_demo",
      }, genre || "mixed");

      if (res.signal) {
        setLastResult(`Fused → “${res.signal.label}” (${res.outcome})`);
        toast.success(`Merged → ${res.signal.label}`);
      } else {
        setLastResult(`Outcome: ${res.outcome}`);
        toast.info(res.outcome);
      }

      setText("");
      onInjected?.(clean);
    } catch (e: any) {
      toast.error(e?.message || "Inject failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-blue-500/30 bg-blue-500/5 shadow-lg">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100">
              Multilingual Fusion Test
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              LaBSE · 109 Languages · 1 Vector Space
            </p>
          </div>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {LANG_CHIPS.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={loading || disabled || !streamId}
            onClick={() => setText(c.text)}
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 text-zinc-300 transition disabled:opacity-40"
          >
            <span className="font-bold text-blue-400">[{c.code}]</span> {c.label}
          </button>
        ))}
      </div>

      {/* Input Field + Inject Button (ALWAYS VISIBLE) */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runInject(text);
          }}
          placeholder="Type or click preset (e.g. 'problema de audio')"
          disabled={loading || disabled || !streamId}
          className="flex-1 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
        />
        <button
          type="button"
          disabled={loading || disabled || !streamId || !text.trim()}
          onClick={() => runInject(text)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40 transition-all shadow-md shadow-blue-500/20 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Inject
        </button>
      </div>

      {lastResult && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{lastResult}</span>
        </div>
      )}
    </div>
  );
}