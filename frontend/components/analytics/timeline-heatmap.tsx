"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Sparkles } from "lucide-react";

interface TimelineHeatmapProps {
  data: any[];
  isLive?: boolean;
}

const CATEGORIES = [
  { key: "technical_issue", color: "#fb7185", label: "Tech" },
  { key: "doubt", color: "#fbbf24", label: "Doubts" },
  { key: "content_request", color: "#60a5fa", label: "Requests" },
  { key: "feedback", color: "#c084fc", label: "Feedback" },
  { key: "engagement", color: "#34d399", label: "Engagement" },
  { key: "off_topic", color: "#94a3b8", label: "Off-Topic" },
];

export function TimelineHeatmap({ data, isLive = false }: TimelineHeatmapProps) {
  const hasData = data && data.length > 0;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          Category Timeline
        </h3>
        <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md font-mono uppercase tracking-widest flex items-center gap-1">
          {isLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> Liquid · Live
            </>
          ) : (
            <>Static · {data?.length || 0} bins</>
          )}
        </span>
      </div>

      {hasData ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {CATEGORIES.map((cat) => (
                  <linearGradient key={cat.key} id={`grad-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={cat.color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#71717a" }} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#71717a" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#27272a", borderRadius: "10px", fontSize: "11px" }}
                labelStyle={{ color: "#c084fc", fontWeight: "bold" }}
              />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} iconType="circle" />
              {CATEGORIES.map((cat) => (
                <Area
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  name={cat.label}
                  stackId="1"
                  stroke={cat.color}
                  fill={`url(#grad-${cat.key})`}
                  strokeWidth={1.5}
                  animationDuration={isLive ? 15000 : 800}
                  animationEasing="ease-in-out"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center">
          <Sparkles className="w-8 h-8 text-purple-500/40 mb-3 animate-pulse" />
          <p className="text-sm text-zinc-400 font-semibold mb-1">Timeline building</p>
          <p className="text-xs text-zinc-600 font-mono text-center max-w-xs">
            {isLive ? "Signals will populate the timeline as messages flow in." : "Not enough temporal data — insights above compensate."}
          </p>
        </div>
      )}
    </div>
  );
}