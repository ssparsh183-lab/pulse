"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { PulseOrb } from "./pulse-orb";

export function Hero() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { auth_url } = await api.getGoogleAuthUrl();
      window.location.href = auth_url;
    } catch (err) {
      toast.error("Couldn't start login. Backend running?");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-40" />

      {/* Floating gradient orbs (bg atmosphere) */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl float-y" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl float-y"
        style={{ animationDelay: "2s" }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center py-20">
        {/* Left: Text */}
        <div className="flex flex-col gap-7 text-center lg:text-left">
          {/* Live status badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium w-fit mx-auto lg:mx-0 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-time semantic engine · Online</span>
          </motion.div>

          {/* Massive headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]"
          >
            <span className="text-zinc-100">Chat chaos</span>
            <br />
            <span className="text-gradient">into clarity.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed"
          >
            1000 messages become 5 signals. Live streams get audience
            intelligence — <span className="text-purple-300">unique-user weighted</span>, <span className="text-fuchsia-300">momentum tracked</span>,{" "}
            <span className="text-purple-300">explainably ranked</span>.
          </motion.p>

          {/* Proof stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-6 py-3 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md w-fit mx-auto lg:mx-0"
          >
            <div>
              <div className="text-xl font-bold text-zinc-100 tabular">43</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">msgs</div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xl font-bold text-purple-400 tabular">6</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">signals</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <div className="text-xl font-bold text-emerald-400 tabular">7:1</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">compression</div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 items-center lg:items-start pt-2"
          >
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative inline-flex items-center gap-3 px-7 py-4 rounded-2xl bg-white text-zinc-900 font-semibold hover:bg-zinc-100 transition-all duration-200 shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>One-click YouTube sync · No credit card</span>
            </div>
          </motion.div>
        </div>

        {/* Right: Pulse Orb with orbiting messages */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:block relative"
        >
          <PulseOrb />
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}