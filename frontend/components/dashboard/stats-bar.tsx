"use client";

import { MessageSquare, Radio, Users, Activity } from "lucide-react";

interface StatsBarProps {
  totalMessages: number;
  activeSignals: number;
  uniqueUsers: number;
}

export function StatsBar({
  totalMessages,
  activeSignals,
  uniqueUsers,
}: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="text-xs font-medium">Raw Messages</span>
          <MessageSquare className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-zinc-100">
          {totalMessages.toLocaleString()}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="text-xs font-medium">Active Signals</span>
          <Radio className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div className="text-2xl font-bold text-purple-400">
          {activeSignals}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="text-xs font-medium">Unique Participants</span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-zinc-100">
          {uniqueUsers.toLocaleString()}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-zinc-400 mb-1">
          <span className="text-xs font-medium">Compression Ratio</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400">
          {totalMessages > 0 && activeSignals > 0
            ? `${Math.round(totalMessages / activeSignals)}:1`
            : "—"}
        </div>
      </div>
    </div>
  );
}