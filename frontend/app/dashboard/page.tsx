"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { WorkspaceData, LiveStream, Stream, PastVideo } from "@/types";
import { Header } from "@/components/dashboard/header";
import { VideoCard } from "@/components/dashboard/video-card";
import { Loader } from "@/components/shared/loader";
import {
  Radio, PlayCircle, Users, Video, WifiOff, Eye, Sparkles,
  AlertCircle, RefreshCw, Activity, ArrowRight, Download, Archive, Search, X, FileText
} from "lucide-react";

// ============================================================
// BRAND ICONS
// ============================================================
function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function TwitchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}
function DiscordIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.1 13.1 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.771 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
function KickIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.714 0h5.143v6.857h1.714V5.143h1.715V3.43h1.714V1.714h1.714V0h6.857v6.857h-1.714v3.429h-1.714v3.428h1.714v3.429h1.714V24h-6.857v-1.714h-1.714v-1.715h-1.714v-1.714h-1.715v-1.714H6.857V24H1.714z" />
    </svg>
  );
}
function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
    </svg>
  );
}

const PLATFORMS = [
  { key: "twitch", name: "Twitch", icon: TwitchIcon },
  { key: "discord", name: "Discord", icon: DiscordIcon },
  { key: "kick", name: "Kick", icon: KickIcon },
  { key: "instagram", name: "Instagram", icon: InstagramIcon },
  { key: "linkedin", name: "LinkedIn", icon: LinkedInIcon },
];

function formatCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n ?? 0);
}

function getToken(): string | null {
  try {
    const t = useAuthStore.getState().token;
    if (t) return t;
    const raw = localStorage.getItem("pulse-auth");
    if (!raw) return null;
    const p = JSON.parse(raw);
    const token = p?.state?.token as string | undefined;
    const u = p?.state?.user;
    if (token && u) {
      useAuthStore.setState({ user: u, token, isHydrated: true });
    }
    return token ?? null;
  } catch {
    return null;
  }
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, "");
  const cleanQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, "");
  if (cleanText.includes(cleanQuery)) return true;
  const queryWords = cleanQuery.split(/\s+/);
  return queryWords.every((word) => cleanText.includes(word));
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [dbStreams, setDbStreams] = useState<Stream[]>([]);
  const [joiningLive, setJoiningLive] = useState(false);
  const [activeTab, setActiveTab] = useState<"streams" | "videos">("videos");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = async () => {
    setStatus("loading");
    setErrorMsg(null);
    const token = getToken();
    if (!token) {
      setStatus("err");
      setErrorMsg("No login session found. Please sign in again.");
      setTimeout(() => router.replace("/"), 1200);
      return;
    }
    try {
      const data = await api.getWorkspace();
      const streams = await api.listStreams("ended");
      setWorkspace(data);
      setDbStreams(streams);
      setStatus("ok");
      toast.success("Synced ✓");
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to sync workspace.");
      setStatus("err");
      toast.error(e?.message || "Sync failed");
    }
  };

  useEffect(() => {
    let dead = false;
    async function init() {
      setStatus("loading");
      const token = getToken();
      if (!token) {
        if (!dead) {
          setStatus("err");
          setErrorMsg("No token found.");
          setTimeout(() => router.replace("/"), 1200);
        }
        return;
      }
      try {
        const [data, streams] = await Promise.all([
          api.getWorkspace(),
          api.listStreams("ended").catch(() => []),
        ]);
        if (!dead) {
          setWorkspace(data);
          setDbStreams(streams);
          setStatus("ok");
        }
      } catch (e: any) {
        if (!dead) {
          setErrorMsg(e?.message || "Workspace sync failed");
          setStatus("err");
        }
      }
    }
    init();
    return () => {
      dead = true;
    };
  }, []);

  const handleEnterLive = async (live: LiveStream) => {
    if (!live.live_chat_id) {
      toast.error("Live chat not ready yet");
      return;
    }
    setJoiningLive(true);
    try {
      const stream = await api.startStream({
        source: "youtube_live",
        external_id: live.id,
        title: live.title,
      });
      // 🔥 BUG FIX: Changed path from /analysis/ to /stream/ to trigger live chat poller
      router.push(
        `/dashboard/stream/${stream.id}?liveChatId=${encodeURIComponent(
          live.live_chat_id
        )}`
      );
    } catch (e: any) {
      toast.error(e?.message || "Could not join");
    } finally {
      setJoiningLive(false);
    }
  };

  const handleDownloadReport = async (e: React.MouseEvent, s: any) => {
    e.stopPropagation();
    try {
      toast.info("Extracting & generating PDF Report...");
      let targetStreamId = s.id;
      if (!s.isDb) {
        const res = await api.analyzeVideo(s.id, 3);
        targetStreamId = res.stream_id;
      }
      await api.downloadExport(targetStreamId);
      toast.success("PDF Report Downloaded!");
    } catch {
      toast.error("Failed to generate report.");
    }
  };

  const handleComingSoon = (name: string) => {
    toast.info(`🚀 ${name} shipping in V2`, {
      description: "Same engine, new pipe. Coming soon.",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    useAuthStore.getState().logout();
    router.replace("/");
  };

  const purePastVideos = workspace?.past_videos || [];
  const ytPastLiveVods = workspace?.past_live_vods || [];

  const allPastStreamsCombined = useMemo(() => {
    const map = new Map<string, any>();
    
    dbStreams.forEach((s) =>
      map.set(s.external_id, {
        id: s.id,
        title: s.title || s.external_id,
        created_at: s.created_at,
        total_messages: s.total_messages,
        total_signals: s.total_signals,
        isDb: true,
      })
    );

    ytPastLiveVods.forEach((v) => {
      if (!map.has(v.id)) {
        map.set(v.id, {
          id: v.id,
          title: v.title,
          created_at: v.published_at,
          total_messages: v.comment_count,
          total_signals: Math.round(v.comment_count / 4) || 0,
          thumbnail_url: v.thumbnail_url,
          isDb: false,
        });
      }
    });

    return Array.from(map.values());
  }, [dbStreams, ytPastLiveVods]);

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return purePastVideos;
    return purePastVideos.filter((v) => fuzzyMatch(v.title || "", searchQuery));
  }, [purePastVideos, searchQuery]);

  const filteredStreams = useMemo(() => {
    if (!searchQuery.trim()) return allPastStreamsCombined;
    return allPastStreamsCombined.filter((s) =>
      fuzzyMatch(s.title || s.id || "", searchQuery)
    );
  }, [allPastStreamsCombined, searchQuery]);

  if (status === "loading")
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Opening workspace..." />
      </main>
    );

  if (status === "err")
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Couldn&apos;t load workspace
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed whitespace-pre-wrap">
            {errorMsg}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:opacity-80 text-white text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
            <button
              onClick={() => router.push("/dashboard/stream/demo")}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
            >
              Demo Mode
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-xs"
            >
              Sign in again
            </button>
          </div>
        </div>
      </main>
    );

  const liveNow = workspace?.live_now || [];
  const isLive = liveNow.length > 0;

  return (
    <main className="min-h-screen gradient-bg pb-16 font-sans relative z-10">
      <Header
        channelTitle={workspace?.channel?.title || "Workspace"}
        isLive={isLive}
      />

      <div className="max-w-6xl mx-auto px-6 pt-10">
        {/* Profile Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            {workspace?.channel?.thumbnail_url ? (
              <img
                src={workspace.channel.thumbnail_url}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border border-zinc-800 ring-2 ring-[var(--brand-glow-soft)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
                {workspace?.channel?.title || "Your channel"}
              </h1>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5 font-mono">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[var(--brand-light)]" />
                  {formatCount(workspace?.channel?.subscriber_count || 0)} subs
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="inline-flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[var(--brand-light)]" />
                  {formatCount(workspace?.channel?.video_count || 0)} videos
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:inline" />
                <span className="hidden sm:inline truncate max-w-[180px]">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <Activity className="w-3.5 h-3.5" /> Sync Data
          </button>
        </div>

        {/* Top Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10">
          <div className="md:col-span-4 glass-panel rounded-3xl p-6 flex flex-col justify-between bento-hover">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <YoutubeIcon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </div>
              </div>
              <h2 className="text-sm font-bold text-zinc-200">YouTube Linked</h2>
              <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="md:col-span-3 glass-panel rounded-3xl p-6 flex flex-col justify-between">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
              V2 Pipeline
            </h2>
            <div className="flex gap-3 overflow-hidden">
              {PLATFORMS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.key}
                    onClick={() => handleComingSoon(p.name)}
                    className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all shrink-0"
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-5 bg-gradient-to-br from-[var(--brand-glow-soft)] to-[var(--panel-bg-2)] border border-[var(--panel-border)] rounded-3xl p-6 flex flex-col justify-between bento-hover">
            <div>
              <h2 className="text-sm font-bold text-zinc-200 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand)]" /> Engine Sandbox
              </h2>
              <p className="text-xs text-zinc-500">
                Run deterministic chat payload to simulate live fusion.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/stream/demo")}
              className="mt-4 flex items-center justify-between w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-[var(--brand)]" />
                <span>Initialize Demo</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 transition-all" />
            </button>
          </div>
        </div>

        {/* Broadcast Status */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Radio className="w-3 h-3 text-rose-500" /> Broadcast Status
          </h2>
          {isLive ? (
            <div className="space-y-4">
              {liveNow.map((live) => (
                <div
                  key={live.id}
                  className="glass-panel rounded-3xl p-6 border-rose-500/30 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden bento-hover"
                >
                  {live.thumbnail_url && (
                    <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden relative border border-zinc-800 shrink-0 shadow-lg">
                      <img
                        src={live.thumbnail_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-2 left-2 bg-rose-600/90 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{" "}
                        Live
                      </div>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-center z-10 w-full">
                    <h3 className="text-2xl font-bold text-zinc-100 mb-2 truncate">
                      {live.title}
                    </h3>
                    {live.concurrent_viewers && (
                      <p className="text-xs text-rose-300 flex items-center gap-1.5 font-mono bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md w-fit">
                        <Eye className="w-3.5 h-3.5" />{" "}
                        {live.concurrent_viewers} watching
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEnterLive(live)}
                    disabled={joiningLive || !live.live_chat_id}
                    className="shrink-0 w-full md:w-auto bg-[var(--brand)] hover:opacity-80 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_var(--brand-glow-strong)] z-10"
                  >
                    {joiningLive ? "Connecting..." : "Command Center"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <WifiOff className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-300">
                    Studio is quiet
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Go live on YouTube to activate PULSE.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Archive className="w-3 h-3 text-[var(--brand-light)]" /> Session History &
              Autopsies
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
            <div className="flex gap-2 p-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("videos")}
                className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "videos"
                    ? "bg-[var(--brand)] text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Uploaded Videos
                {searchQuery && activeTab === "videos" && (
                  <span className="ml-2 text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                    {filteredVideos.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("streams")}
                className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "streams"
                    ? "bg-[var(--brand)] text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Past Live Streams
                {searchQuery && activeTab === "streams" && (
                  <span className="ml-2 text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                    {filteredStreams.length}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "videos"
                    ? "Search videos by title..."
                    : "Search past streams..."
                }
                className="w-full pl-9 pr-9 py-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--brand-glow)] focus:bg-zinc-900 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {activeTab === "videos" && (
            <div>
              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="glass-panel rounded-3xl p-12 text-center">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-semibold mb-1">
                    No videos found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-zinc-600 text-xs font-mono">
                    Try a different keyword or clear the search
                  </p>
                </div>
              ) : (
                <div className="glass-panel rounded-3xl p-8 text-center text-zinc-500 text-sm">
                  No recent public videos found.
                </div>
              )}
            </div>
          )}

          {activeTab === "streams" && (
            <div>
              {filteredStreams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStreams.map((s) => (
                    <div
                      key={s.id}
                      onClick={async () => {
                        if (s.isDb) {
                          router.push(`/dashboard/analysis/${s.id}`);
                        } else {
                          toast.info("Extracting stream comments...");
                          const res = await api.analyzeVideo(s.id, 3);
                          router.push(`/dashboard/analysis/${res.stream_id}`);
                        }
                      }}
                      className="group cursor-pointer glass-panel p-5 rounded-2xl flex flex-col border border-zinc-800 hover:border-[var(--brand-glow)] hover:-translate-y-1 transition-all relative overflow-hidden"
                    >
                      <button
                        onClick={(e) => handleDownloadReport(e, s)}
                        className="absolute top-4 right-4 z-20 p-1.5 bg-zinc-900/80 backdrop-blur-sm hover:bg-[var(--brand)] text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-700 hover:border-transparent shadow-lg"
                        title="Download PDF Autopsy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {s.thumbnail_url && (
                        <div className="aspect-video w-full rounded-xl overflow-hidden mb-3 border border-zinc-800/80 relative">
                          <img
                            src={s.thumbnail_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2 left-2 bg-rose-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                            🔴 Past Live Stream VOD
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2 mt-2">
                        <div className="bg-[var(--brand-glow-soft)] text-[var(--brand-light)] text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-[var(--brand-glow)]">
                          {s.isDb ? "Ended Stream" : "YouTube VOD"}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-zinc-100 mb-1 truncate pr-8">
                        {s.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono mb-4">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>

                      <div className="mt-auto grid grid-cols-2 gap-2 text-xs bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/50">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase tracking-widest block mb-0.5">
                            Raw Msgs
                          </span>
                          <span className="font-bold text-zinc-300">
                            {s.total_messages}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase tracking-widest block mb-0.5">
                            Pure Signals
                          </span>
                          <span className="font-bold text-[var(--brand-light)]">
                            {s.total_signals}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="glass-panel rounded-3xl p-12 text-center">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-semibold mb-1">
                    No streams found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-zinc-600 text-xs font-mono">
                    Try a different keyword or clear the search
                  </p>
                </div>
              ) : (
                <div className="glass-panel rounded-3xl p-8 text-center text-zinc-500 text-sm">
                  No past streams analyzed yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}