// frontend/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { WorkspaceData } from "@/types";
import { Loader } from "@/components/shared/loader";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { 
  PlayCircle, Sparkles, ArrowRight, LogOut, Radio, Layers, Lock, 
  Send
} from "lucide-react";

function YoutubeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TwitterIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function MasterDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const data = await api.getWorkspace();
        setWorkspace(data);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  const handlePlatformClick = (platform: string) => {
    if (platform === "youtube") {
      router.push("/dashboard/youtube");
    } else if (platform === "telegram") {
      router.push("/dashboard/telegram");
    } else if (platform === "twitter") {
      // 🔥 YEH LINE UPDATE KAR (Pehle yahan toast.info tha)
      router.push("/dashboard/twitter");
    } else {
      toast.info(`🚀 ${platform.toUpperCase()} integration shipping in V2`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Initializing PULSE Master Command..." />
      </main>
    );
  }

  const channel = workspace?.channel;

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Master Top Nav */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-100">PULSE</span>
              <span className="text-[10px] font-mono text-purple-400 block uppercase tracking-widest">Master Gateway</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />

            <button
              onClick={() => router.push("/dashboard/classified")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950 to-zinc-900 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold transition shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              title="Access Classified NTRO Master Vault"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" /> Classified Intel
            </button>

            {user && (
              <div className="flex items-center gap-3">
                <img
                  src={user.picture_url || "https://avatar.vercel.sh/user"}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                />
                <div className="hidden sm:block text-right">
                  <span className="text-xs font-semibold text-zinc-200 block">{user.name}</span>
                  <span className="text-[10px] text-zinc-500 block font-mono">{user.email}</span>
                </div>
              </div>
            )}
            <div className="h-4 w-px bg-zinc-800" />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 text-xs border border-zinc-800 transition"
              title="Sign Out of PULSE"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          <div className="md:col-span-7 glass-panel rounded-3xl p-8 flex flex-col justify-between border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" /> National SIH 2026 Engine
              </div>
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">
                Welcome back, {user?.name?.split(" ")[0] || "Commander"}
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
                Select an integrated multi-platform node below to launch its dedicated channel hub and real-time intelligence telemetry.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/stream/demo")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
              >
                <PlayCircle className="w-4 h-4" /> Initialize Demo Sandbox
              </button>
            </div>
          </div>

          <div className="md:col-span-5 glass-panel rounded-3xl p-8 flex flex-col justify-between border-zinc-800">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> System Status
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">LaBSE Embedder</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">● Online (768d)</span>
                </div>
                <div className="flex justify-between items-center bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">Context Brains</span>
                  <span className="text-purple-400 font-bold">3 Active Isolations</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-4">
              Secured via Supabase PostgreSQL & JWT Auth.
            </p>
          </div>
        </div>

        {/* Connected Platform Cards */}
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-purple-400" /> Select Connected Platform Node
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* YouTube Card */}
          <div
            onClick={() => handlePlatformClick("youtube")}
            className="group cursor-pointer glass-panel rounded-3xl p-6 border-red-500/30 hover:border-red-500/60 transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden flex flex-col justify-between h-48 bg-gradient-to-br from-red-500/5 to-transparent shadow-lg shadow-red-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <YoutubeIcon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Node
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 group-hover:text-red-400 transition-colors">YouTube Channels</h3>
              <p className="text-xs text-zinc-400 mt-1">OAuth Channel Hub</p>
            </div>
          </div>

          {/* Instagram Card */}
          <div
            onClick={() => handlePlatformClick("instagram")}
            className="group cursor-pointer glass-panel rounded-3xl p-6 border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden flex flex-col justify-between h-48 bg-gradient-to-br from-pink-500/5 to-transparent"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <InstagramIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">V2 Module</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 group-hover:text-pink-400 transition-colors">Instagram Live</h3>
              <p className="text-xs text-zinc-500 mt-1">Graph API Connector</p>
            </div>
          </div>

          {/* Telegram Card */}
          <div
            onClick={() => handlePlatformClick("telegram")}
            className="group cursor-pointer glass-panel rounded-3xl p-6 border-sky-500/40 hover:border-sky-500/80 transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden flex flex-col justify-between h-48 bg-gradient-to-br from-sky-500/10 to-transparent shadow-lg shadow-sky-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> MTProto
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 group-hover:text-sky-400 transition-colors">Telegram Channels</h3>
              <p className="text-xs text-zinc-400 mt-1">MTProto Phone Gateway</p>
            </div>
          </div>

          {/* Twitter / X Card */}
          <div
            onClick={() => handlePlatformClick("twitter")}
            className="group cursor-pointer glass-panel rounded-3xl p-6 border-zinc-700/50 hover:border-zinc-500 transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden flex flex-col justify-between h-48 bg-gradient-to-br from-zinc-800/20 to-transparent"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 group-hover:scale-110 transition-transform">
                <TwitterIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded"> Live handles</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 group-hover:text-zinc-300 transition-colors">X / Twitter Spaces</h3>
              <p className="text-xs text-zinc-500 mt-1">Bearer Stream Engine</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}