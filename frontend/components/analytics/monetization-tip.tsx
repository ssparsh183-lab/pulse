"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface MonetizationTipProps {
  pulseScore: any;
  isLive: boolean;
}

export function MonetizationTip({ pulseScore, isLive }: MonetizationTipProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tipType, setTipType] = useState<"tip" | "cta" | "member" | null>(null);

  useEffect(() => {
    if (!isLive || !pulseScore || dismissed) {
      setVisible(false);
      return;
    }

    const score = pulseScore.score || 0;
    const feedback = pulseScore.components?.feedback || 0;
    const engagement = pulseScore.components?.engagement || 0;
    const techIssue = pulseScore.components?.tech_inverse || 1;

    // 🔥 CRITERIA: Only pop when there's a genuine positive tipping point
    if (score >= 80 && feedback > 0.5 && techIssue > 0.7) {
      setTipType("cta");
      setVisible(true);
    } else if (score >= 70 && engagement > 0.5) {
      setTipType("member");
      setVisible(true);
    } else if (score >= 60 && feedback > 0.4) {
      setTipType("tip");
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pulseScore, isLive, dismissed]);

  // Auto reset dismiss after 60s (in case tipping point resets)
  useEffect(() => {
    if (dismissed) {
      const timer = setTimeout(() => setDismissed(false), 60000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const tips = {
    cta: {
      emoji: "💰",
      title: "SuperChat Window OPEN!",
      msg: "Audience is at peak engagement. This is the perfect 60-second window to drop a SuperChat prompt.",
      color: "emerald",
    },
    member: {
      emoji: "⭐",
      title: "Membership Push Moment",
      msg: "Engagement is high, audience is receptive. Pitch channel membership NOW for max conversions.",
      color: "amber",
    },
    tip: {
      emoji: "🎯",
      title: "Positive Momentum",
      msg: "Vibe is strong. Great time to remind viewers to LIKE and SUBSCRIBE while sentiment is high.",
      color: "blue",
    },
  };

  const currentTip = tipType ? tips[tipType] : null;

  return (
    <AnimatePresence>
      {visible && currentTip && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed top-24 right-6 z-50 max-w-sm monetization-pop"
        >
          <div className={`glass-panel border-${currentTip.color}-500/50 bg-${currentTip.color}-500/10 p-4 rounded-2xl shadow-[0_0_40px_rgba(52,211,153,0.3)]`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-full bg-${currentTip.color}-500/20 flex items-center justify-center shrink-0 text-2xl`}>
                {currentTip.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-sm font-bold text-${currentTip.color}-300`}>
                    {currentTip.title}
                  </h4>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${currentTip.color}-400 animate-pulse`} />
                </div>
                <p className={`text-[11px] text-${currentTip.color}-100/70 leading-relaxed`}>
                  {currentTip.msg}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Sparkles className={`w-3 h-3 text-${currentTip.color}-400`} />
                  <span className={`text-[9px] font-mono text-${currentTip.color}-400 uppercase tracking-widest`}>
                    Pulse Score: {pulseScore.score}/100
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className={`text-${currentTip.color}-400/50 hover:text-${currentTip.color}-300 transition shrink-0`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}