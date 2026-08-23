"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface PulseScoreGaugeProps {
  score: number;
  state: "on_fire" | "healthy" | "attention" | "critical";
  label: string;
  color: "emerald" | "blue" | "amber" | "rose";
  reasons?: string[];
  size?: "sm" | "md" | "lg";
}

export function PulseScoreGauge({
  score,
  state,
  label,
  color,
  reasons = [],
  size = "md",
}: PulseScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = (score - displayScore) / steps;
    let current = displayScore;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      current += increment;
      if (stepCount >= steps) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score]);

  const colorMap = {
    emerald: {
      stroke: "#34d399",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/10",
    },
    blue: {
      stroke: "#60a5fa",
      bg: "bg-blue-500/5",
      border: "border-blue-500/30",
      text: "text-blue-400",
      glow: "shadow-blue-500/10",
    },
    amber: {
      stroke: "#fbbf24",
      bg: "bg-amber-500/5",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/10",
    },
    rose: {
      stroke: "#fb7185",
      bg: "bg-rose-500/5",
      border: "border-rose-500/30",
      text: "text-rose-400",
      glow: "shadow-rose-500/10",
    },
  };

  const c = colorMap[color];

  // Fixed SVG sizes - all cleanly divisible to prevent clipping
  const sizeMap = {
    sm: { svg: 120, stroke: 8, text: "text-3xl", label: "text-[9px]" },
    md: { svg: 180, stroke: 10, text: "text-5xl", label: "text-[10px]" },
    lg: { svg: 240, stroke: 14, text: "text-6xl", label: "text-xs" },
  };
  const s = sizeMap[size];

  const radius = (s.svg - s.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div
      className={`glass-panel rounded-3xl p-6 flex flex-col items-center justify-center border ${c.border} ${c.bg} shadow-xl ${c.glow} transition-all duration-500`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 self-center">
        <Zap className={`w-4 h-4 ${c.text}`} />
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
          Pulse Score
        </h3>
      </div>

      {/* Gauge - Centered container */}
      <div className="flex items-center justify-center w-full">
        <div 
          className="relative flex items-center justify-center"
          style={{ width: s.svg, height: s.svg }}
        >
          <svg 
            width={s.svg} 
            height={s.svg} 
            viewBox={`0 0 ${s.svg} ${s.svg}`}
            className="transform -rotate-90 overflow-visible"
          >
            {/* Background circle */}
            <circle
              cx={s.svg / 2}
              cy={s.svg / 2}
              r={radius}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={s.stroke}
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx={s.svg / 2}
              cy={s.svg / 2}
              r={radius}
              stroke={c.stroke}
              strokeWidth={s.stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 6px ${c.stroke})`,
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${s.text} font-bold ${c.text} tabular leading-none`}>
              {displayScore}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono mt-1.5">/ 100</span>
          </div>
        </div>
      </div>

      {/* State Label */}
      <div className={`mt-5 px-4 py-1.5 rounded-full ${c.bg} border ${c.border}`}>
        <span className={`${s.label} font-bold uppercase tracking-widest ${c.text}`}>
          {label}
        </span>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && size !== "sm" && (
        <div className="mt-5 w-full space-y-2">
          {reasons.slice(0, 3).map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[10px] text-zinc-400 font-mono leading-relaxed"
            >
              <span className={`${c.text} mt-0.5 shrink-0`}>▸</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}