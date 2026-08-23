"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Users,
  TrendingUp,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Signal } from "@/types";
import { CATEGORIES, SIGNAL_STATES, getPriorityBucket } from "@/lib/constants";

interface SignalCardProps {
  signal: Signal;
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function SignalCard({ signal, onResolve, onDismiss }: SignalCardProps) {
  const [showReasons, setShowReasons] = useState(false);

  // Defensive defaults — video API sometimes omits momentum/priority
  const momentum = typeof signal.momentum === "number" ? signal.momentum : 0;
  const priority = typeof signal.priority === "number" ? signal.priority : 0;
  const uniqueUsers =
    typeof signal.unique_participant_count === "number"
      ? signal.unique_participant_count
      : 0;
  const messageCount =
    typeof signal.message_count === "number" ? signal.message_count : 0;
  const reasons = Array.isArray(signal.reasons) ? signal.reasons : [];
  const reps = Array.isArray(signal.representative_messages)
    ? signal.representative_messages
    : [];

  const categoryMeta =
    CATEGORIES[signal.category || "unclassified"] || CATEGORIES.unclassified;
  const stateMeta = SIGNAL_STATES[signal.state] || SIGNAL_STATES.emerging;
  const priorityBucket = getPriorityBucket(priority);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`group relative overflow-hidden rounded-2xl border ${categoryMeta.border} bg-zinc-900/70 backdrop-blur-md p-5 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl ${categoryMeta.glow}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${categoryMeta.bg} ${categoryMeta.accent} border ${categoryMeta.border}`}
          >
            <span>{categoryMeta.icon}</span>
            <span>{categoryMeta.label}</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityBucket.bg} ${priorityBucket.color}`}
          >
            {priorityBucket.label} PRIORITY
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          {momentum !== 0 && (
            <span
              className={`inline-flex items-center gap-1 font-mono font-semibold ${
                momentum > 0 ? "text-rose-400" : "text-zinc-500"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                {momentum > 0
                  ? `+${momentum.toFixed(0)}/m`
                  : `${momentum.toFixed(0)}/m`}
              </span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 font-medium ${stateMeta.color}`}
          >
            <span>{stateMeta.icon}</span>
            <span className="capitalize">{signal.state || "emerging"}</span>
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold text-zinc-100 mb-2 leading-snug group-hover:text-purple-300 transition-colors">
        {signal.label || "Untitled Signal"}
      </h3>

      {reps.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {reps.slice(0, 2).map((msg, idx) => (
            <div
              key={idx}
              className="text-xs text-zinc-400 bg-zinc-950/60 rounded-lg px-3 py-1.5 border border-zinc-800/60 font-mono truncate"
            >
              &quot;{msg}&quot;
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm">{uniqueUsers}</span>
          <span className="text-zinc-500 text-[11px] font-normal">
            unique users ({messageCount} msgs)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reasons.length > 0 && (
            <button
              onClick={() => setShowReasons(!showReasons)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-zinc-800/60 transition flex items-center gap-1 text-[11px]"
              title="Why this priority score?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showReasons ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          {onDismiss && (
            <button
              onClick={() => onDismiss(signal.id)}
              className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-zinc-800 hover:border-rose-500/30 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[11px]">Dismiss</span>
            </button>
          )}

          {onResolve && (
            <button
              onClick={() => onResolve(signal.id)}
              className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center gap-1 font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="text-[11px]">Resolve</span>
            </button>
          )}
        </div>
      </div>

      {showReasons && reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-zinc-800/60 bg-zinc-950/40 rounded-xl p-3 text-xs text-zinc-400"
        >
          <div className="font-semibold text-zinc-300 mb-1">
            Why this signal is prioritized:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-400 font-mono text-[11px]">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}