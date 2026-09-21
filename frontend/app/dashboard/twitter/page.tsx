// frontend/app/dashboard/twitter/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { 
  ArrowLeft, LogOut, Lock, ExternalLink, PlayCircle, Sparkles, ShieldCheck, CheckCircle2, Unlink
} from "lucide-react";

function TwitterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function TwitterMasterGatewayPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [connectingReal, setConnectingReal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [connectedHandle, setConnectedHandle] = useState<string | null>(null);

  // Instant persistence check (LocalStorage + Backend)
   useEffect(() => {
    (async () => {
      try {
        const res = await api.getTwitterMe();
        if (res?.connected && res?.handle) {
          // Backend ne confirm kiya connected hai:
          setConnectedHandle(res.handle);
          if (typeof window !== "undefined") {
            localStorage.setItem("pulse_twitter_handle", res.handle);
          }
        } else {
          // Agar sign out hai, toh IMMEDIATELY PURGE KARO (Screenshot 2 dikhao):
          setConnectedHandle(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("pulse_twitter_handle");
          }
        }
      } catch (e) {
        setConnectedHandle(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("pulse_twitter_handle");
        }
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  const handleConnectWithX = async () => {
    const currentHandle = connectedHandle || (typeof window !== "undefined" ? localStorage.getItem("pulse_twitter_handle") : null);

    if (currentHandle) {
      router.push(`/dashboard/twitter/channel?handle=${encodeURIComponent(currentHandle)}`);
      return;
    }

    setConnectingReal(true);
    try {
      toast.info("Connecting to official X / Twitter Gateway...");
      const res = await api.getTwitterAuthUrl();
      if (res?.auth_url) {
        window.location.href = res.auth_url;
      } else {
        toast.error("Failed to generate Twitter Auth URL");
        setConnectingReal(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Connection failed. Is backend running?");
      setConnectingReal(false);
    }
  };

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("pulse_twitter_handle");
      }
      setConnectedHandle(null);
      await api.disconnectTwitter();
      toast.success("Disconnected X Account. Session cleared.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Master Gateway
            </button>
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl">
              <TwitterIcon className="w-4 h-4 text-zinc-100" />
              <span className="text-xs font-bold text-zinc-200 tracking-wide font-mono">
                X / Twitter Intelligence Gateway
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl">
                {user.picture_url ? (
                  <img
                    src={user.picture_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] flex items-center justify-center font-bold">
                    {user.name?.[0] || "U"}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition" title="Sign Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-16">
        {/* Header Strip */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-widest mb-4 font-mono">
            <Sparkles className="w-3 h-3" /> NTRO Law Enforcement &amp; Sovereign AI
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 tracking-tight mb-3 flex items-center justify-center gap-3">
            <TwitterIcon className="w-9 h-9 text-zinc-100" /> X / Twitter Gateway
          </h1>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Connect an official production handle via OAuth 2.0 or launch the deterministic Law Enforcement Simulation Sandbox for incident triage demonstration.
          </p>
        </div>

        {/* 🌟 TWO MASTER ZONES WITH 100% PERFECT HORIZONTAL ALIGNMENT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto items-stretch">
          
          {/* ZONE 1: REAL TWITTER CONNECTION */}
          <div className="md:col-span-6 glass-panel rounded-3xl p-8 border border-zinc-800 flex flex-col justify-between shadow-xl relative overflow-hidden bg-gradient-to-br from-zinc-900/80 to-zinc-950 min-h-[460px]">
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-md">
                  <TwitterIcon className="w-6 h-6" />
                </div>
                {connectedHandle ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Linked
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="text-[10px] font-mono px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex items-center gap-1"
                      title="Disconnect Handle"
                    >
                      <Unlink className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase font-bold">
                    Production Node
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mb-4">
                {connectedHandle ? (
                  <>
                    <h2 className="text-xl font-bold text-zinc-100 mb-1">Official Node Connected</h2>
                    <p className="text-xs text-sky-400 font-mono font-bold mb-2">{connectedHandle}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Active and synced with Twitter API v2. Enter your real-time command station to monitor mentions.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-zinc-100 mb-2">Connect Official X Account</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Authenticate verified agency handle via OAuth 2.0 with PKCE for real-time mentions and dispatch.
                    </p>
                  </>
                )}
              </div>

              {/* Permissions Box */}
              <div className="mt-auto mb-6 space-y-2 font-mono text-[11px] text-zinc-500 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" /> Read: Citizen replies &amp; incoming tags
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Write: 1-Click resolution dispatching
                </div>
              </div>
            </div>

            {/* Bottom Button (Anchored) */}
            <div>
              {connectedHandle ? (
                <button
                  onClick={handleConnectWithX}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs font-mono shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Open {connectedHandle} Command Station →
                </button>
              ) : (
                <button
                  onClick={handleConnectWithX}
                  disabled={connectingReal || checkingAuth}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-xs font-mono shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                >
                  <TwitterIcon className="w-4 h-4 text-zinc-900" />
                  {connectingReal ? "Connecting..." : "Connect with X / Twitter"}
                  <ExternalLink className="w-3.5 h-3.5 ml-1 text-zinc-500" />
                </button>
              )}
            </div>
          </div>

          {/* ZONE 2: LAW ENFORCEMENT DEMO SIMULATION */}
          <div className="md:col-span-6 glass-panel rounded-3xl p-8 border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-zinc-900/60 to-zinc-950 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[460px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex-1 flex flex-col relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-md">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase font-bold tracking-wider">
                  100% Offline Safe
                </span>
              </div>

              {/* Title & Description */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-zinc-100 mb-2">Law Enforcement Sandbox</h2>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  Sovereign incident triage drill based on <strong>Uttar Pradesh Police</strong> traffic. Multimodal Vision AI verification &amp; dual-window triage.
                </p>
              </div>

              {/* Metrics Box */}
              <div className="mt-auto mb-6 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">Drill Units</span>
                  <span className="font-bold text-sky-400">3 Handles</span>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">Vision AI</span>
                  <span className="font-bold text-emerald-400">Pre-Verified</span>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">Dispatches</span>
                  <span className="font-bold text-purple-400">1-Click Live</span>
                </div>
              </div>
            </div>

            {/* Bottom Button (Anchored) */}
            <div className="relative z-10">
              <button
                onClick={() => router.push("/dashboard/twitter/demo")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs font-mono shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <PlayCircle className="w-4 h-4 text-white" />
                Open Law Enforcement Sandbox →
              </button>
            </div>
          </div>

        </div>

        {/* Footer info strip */}
        <div className="mt-12 text-center font-mono text-[11px] text-zinc-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Compliant with Indian DPDP Act 2023 · Sovereign Air-Gapped Ready</span>
        </div>
      </div>
    </main>
  );
}