// frontend/app/dashboard/twitter/demo/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { 
  ArrowLeft, ShieldCheck, ArrowRight, 
  Users, Sparkles, RefreshCw, PlayCircle, Radio
} from "lucide-react";

function formatCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n ?? 0);
}

const UP_POLICE_DRILL = {
  handle: "@Uppolice",
  name: "Uttar Pradesh Police",
  verified: true,
  bio: "Official Twitter Account of Uttar Pradesh Police. Emergency response & citizen safety command grid.",
  followers_count: 3420000,
  region: "Uttar Pradesh, India",
  focus: "Highway Collisions, Hazmat Industrial Fires & Cyber Phishing Defense"
};

export default function TwitterDemoSandboxHub() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await api.resetTwitterDemo();
      toast.success("Simulation state refreshed to clean baseline! 🎯");
    } catch {
      toast.error("Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/twitter")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to X Gateway
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl">
              <PlayCircle className="w-4 h-4 text-sky-400 animate-pulse" />
              <span className="text-xs font-bold text-sky-300 tracking-wide font-mono">
                Law Enforcement Sandbox Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold transition disabled:opacity-50"
              title="Reset simulated citizen reports back to pristine state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              {resetting ? "Resetting..." : "Reset Simulation"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-widest mb-3 font-mono">
            <Sparkles className="w-3 h-3" /> Official NTRO / SIH 2026 Simulation Node
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight mb-2">
            Uttar Pradesh Police Command Drill
          </h1>
          <p className="text-xs text-zinc-400 font-mono max-w-xl mx-auto leading-relaxed">
            Launch the live law enforcement command station to observe real-time citizen report ingestion, multi-vehicle fusion, and 1-click bulk dispatch.
          </p>
        </div>

        {/* Single Grand Command Center Card */}
        <div
          onClick={() => router.push(`/dashboard/twitter/channel?handle=${encodeURIComponent(UP_POLICE_DRILL.handle)}`)}
          className="group cursor-pointer glass-panel p-8 rounded-3xl border border-sky-500/40 hover:border-sky-500 transition-all flex flex-col justify-between shadow-2xl bg-gradient-to-br from-sky-500/10 via-zinc-900/60 to-zinc-950 hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-2xl group-hover:scale-105 transition-transform shadow-xl">
                  UP
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-100 group-hover:text-sky-300 transition-colors">
                    {UP_POLICE_DRILL.name}
                  </h3>
                  <p className="text-xs text-sky-400 font-mono">{UP_POLICE_DRILL.handle} · {UP_POLICE_DRILL.region}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3.5 py-1 rounded-full font-bold uppercase flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Drill Ready
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6 font-sans">
              {UP_POLICE_DRILL.bio}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs font-mono">
              <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Primary Triage Focus</span>
                <span className="text-zinc-200 font-bold">{UP_POLICE_DRILL.focus}</span>
              </div>
              <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Jurisdiction Reach Base</span>
                <span className="font-bold text-sky-400">{formatCount(UP_POLICE_DRILL.followers_count)} Followers · {UP_POLICE_DRILL.region}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-sky-400 font-mono font-bold group-hover:text-sky-300">
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4 animate-pulse text-rose-500" /> Enter UP Police Command Station
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

      </div>
    </main>
  );
}