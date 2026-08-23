"use client";

import { motion } from "framer-motion";
import { Zap, Users, TrendingUp, Filter, Brain, Radio, Globe2 } from "lucide-react";

// Ordered specifically for a perfect 3-column Bento Grid (Span: 2+1, 1+2, 1+1+1 = 7 cards)
const FEATURES = [
  {
    icon: Zap,
    title: "Semantic Fusion Engine",
    desc: "20 different wordings → 1 signal. EN · HI · Hinglish · ES · FR · ZH — mapped natively to the same LaBSE 768-dim space without translation. Zero keyword rules.",
    span: "md:col-span-2",
    gradient: "from-purple-500/20 to-fuchsia-500/5",
    iconColor: "text-purple-400",
    border: "border-purple-500/20 hover:border-purple-500/40",
  },
  {
    icon: Globe2,
    title: "109 Languages",
    desc: "Spanish, French, Chinese, Arabic & more. One vector space.",
    span: "md:col-span-1",
    gradient: "from-blue-500/20 to-sky-500/5",
    iconColor: "text-blue-400",
    border: "border-blue-500/20 hover:border-blue-500/40",
  },
  {
    icon: Users,
    title: "Spam Immune",
    desc: "Support = distinct human IDs. 100 bot messages = 1 voice.",
    span: "md:col-span-1",
    gradient: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
  },
  {
    icon: Brain,
    title: "Explainable Priority Scoring",
    desc: "Not a black-box AI score. Every signal rank comes with a mathematical, human-readable breakdown of unique support, momentum, and urgency.",
    span: "md:col-span-2",
    gradient: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    border: "border-amber-500/20 hover:border-amber-500/40",
  },
  {
    icon: TrendingUp,
    title: "Momentum tracking",
    desc: "Rising / stable / declining trends tracked via 30s rolling windows.",
    span: "md:col-span-1",
    gradient: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-400",
    border: "border-rose-500/20 hover:border-rose-500/40",
  },
  {
    icon: Filter,
    title: "6 Global Categories",
    desc: "Tech · Doubts · Requests · Feedback · Engagement · Noise.",
    span: "md:col-span-1",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    icon: Radio,
    title: "Real-Time Pipeline",
    desc: "2.5s poll · live signal cards · inject & watch fusion live.",
    span: "md:col-span-1",
    gradient: "from-sky-500/20 to-sky-500/5",
    iconColor: "text-sky-400",
    border: "border-sky-500/20 hover:border-sky-500/40",
  },
];

export function FeatureCards() {
  return (
    // auto-rows-fr ensures cards in the same row stretch to the same height!
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto auto-rows-fr">
      {FEATURES.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className={`relative overflow-hidden flex flex-col rounded-3xl border ${feature.border} bg-gradient-to-br ${feature.gradient} backdrop-blur-sm p-6 transition-all duration-300 group hover:-translate-y-1 ${feature.span}`}
        >
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl" />

          {/* Ambient glow on hover */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/0 group-hover:bg-white/10 blur-3xl transition-all duration-500 pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900/60 border border-zinc-800 mb-5 ${feature.iconColor}`}
            >
              <feature.icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2 group-hover:text-white transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-400/90 leading-relaxed mt-auto">
              {feature.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}