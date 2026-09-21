// frontend/app/dashboard/youtube/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { WorkspaceData, Channel } from "@/types";
import { Loader } from "@/components/shared/loader";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { 
  ArrowLeft, LogOut, ShieldCheck, ArrowRight, Video, Users, Sparkles
} from "lucide-react";

function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function formatCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n ?? 0);
}

export default function YouTubeHubPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getWorkspace();
        setWorkspace(data);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load YouTube workspace");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Synchronizing Google OAuth Channels..." />
      </main>
    );
  }

  // Channels list: prioritize multi-channel array, fallback to primary channel
  const channelsList: Channel[] = 
    (workspace?.channels && workspace.channels.length > 0)
      ? workspace.channels
      : (workspace?.channel ? [workspace.channel] : []);

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Top Navbar */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Master Gateway
            </button>
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-300 tracking-wide">YouTube Intelligence Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <img src={user.picture_url || ""} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition" title="Sign Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-3 font-mono">
            <Sparkles className="w-3 h-3" /> OAuth 2.0 Connected
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2 flex items-center gap-3">
            <YoutubeIcon className="w-8 h-8 text-red-500" /> YouTube Channels Hub
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Select an authenticated YouTube channel to launch its dedicated live command center and historical content autopsy.
          </p>
        </div>

        {/* Connected Channels Grid */}
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authenticated YouTube Nodes ({channelsList.length})
          </h2>

          {channelsList.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center text-zinc-500 text-xs font-mono border border-zinc-800">
              No active YouTube channel detected on this Google Account.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {channelsList.map((chn) => (
                <div
                  key={chn.id}
                  onClick={() => router.push(`/dashboard/youtube/channel?channelId=${chn.id}`)}
                  className="group cursor-pointer glass-panel p-6 rounded-3xl border border-red-500/20 hover:border-red-500/60 transition-all flex flex-col justify-between shadow-lg bg-gradient-to-br from-red-500/5 to-transparent hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    {chn.thumbnail_url ? (
                      <img src={chn.thumbnail_url} alt="" className="w-14 h-14 rounded-2xl object-cover border border-zinc-700 shadow-md group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xl">
                        {chn.title?.[0] || "Y"}
                      </div>
                    )}
                    <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      OAuth Node
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-zinc-100 group-hover:text-red-400 transition-colors truncate mb-2">
                      {chn.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-red-400" />
                        {formatCount(chn.subscriber_count || 0)} subs
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-zinc-400" />
                        {formatCount(chn.video_count || 0)} videos
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-red-400 font-mono font-bold">
                    <span>Launch Channel Station</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}