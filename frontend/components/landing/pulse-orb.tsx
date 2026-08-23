"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const RAW_MESSAGES = [
  { text: "audio nahi aa rahi", angle: 0, delay: 0 },
  { text: "can't hear", angle: 45, delay: 0.3 },
  { text: "voice broken", angle: 90, delay: 0.6 },
  { text: "awaz kharab", angle: 135, delay: 0.9 },
  { text: "no sound", angle: 180, delay: 1.2 },
  { text: "sound issue", angle: 225, delay: 1.5 },
  { text: "audio kharab", angle: 270, delay: 1.8 },
  { text: "mic off?", angle: 315, delay: 2.1 },
];

export function PulseOrb() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative flex items-center justify-center w-full h-[500px]">
      {/* Outer pulse rings */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`ring-${i}`}
          className="absolute rounded-full border border-purple-500/20"
          style={{
            width: "200px",
            height: "200px",
            animation: `pulse-ring 3s ease-out infinite`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}

      {/* Orbiting messages that merge into orb */}
      {mounted && RAW_MESSAGES.map((msg, i) => (
        <motion.div
          key={`msg-${i}`}
          className="absolute pointer-events-none"
          initial={{
            x: Math.cos((msg.angle * Math.PI) / 180) * 220,
            y: Math.sin((msg.angle * Math.PI) / 180) * 220,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            x: [
              Math.cos((msg.angle * Math.PI) / 180) * 220,
              Math.cos((msg.angle * Math.PI) / 180) * 120,
              0,
            ],
            y: [
              Math.sin((msg.angle * Math.PI) / 180) * 220,
              Math.sin((msg.angle * Math.PI) / 180) * 120,
              0,
            ],
            opacity: [0, 1, 1, 0],
            scale: [0.8, 1, 0.8, 0.3],
          }}
          transition={{
            duration: 3.5,
            delay: msg.delay,
            repeat: Infinity,
            repeatDelay: 2,
            times: [0, 0.3, 0.7, 1],
            ease: "easeInOut",
          }}
        >
          <div className="px-2.5 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-purple-500/30 text-[10px] font-mono text-purple-200 whitespace-nowrap shadow-lg shadow-purple-500/20">
            {msg.text}
          </div>
        </motion.div>
      ))}

      {/* Core orb */}
      <div className="relative">
        {/* Glow layers */}
        <div className="absolute inset-0 rounded-full bg-purple-500/40 blur-3xl scale-[2] animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-fuchsia-500/30 blur-2xl scale-150 animate-pulse" style={{ animationDelay: "0.5s" }} />
        
        {/* Actual orb */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 360],
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          }}
          className="relative w-44 h-44 rounded-full bg-gradient-to-br from-purple-400 via-fuchsia-500 to-purple-700 shadow-2xl shadow-purple-500/60 flex items-center justify-center"
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white/30 to-transparent backdrop-blur-xl flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-5xl"
            >
              ⚡
            </motion.span>
          </div>
        </motion.div>

        {/* Signal output badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            AUDIO ISSUE · 8 users
          </div>
        </motion.div>
      </div>
    </div>
  );
}