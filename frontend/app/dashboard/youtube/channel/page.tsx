// frontend/app/dashboard/youtube/channel/page.tsx

"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { WorkspaceData, LiveStream, Stream, Channel } from "@/types";
import { VideoCard } from "@/components/dashboard/video-card";
import { Loader } from "@/components/shared/loader";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { GenreSelectionModal } from "@/components/dashboard/genre-selection-modal";
import {
  Radio, Eye, RefreshCw, 
  Download, Search, X, LogOut, ShieldCheck, Layers
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

function advancedSearch<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const cleanQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, "");
  if (!cleanQuery) return items;
  return items.filter((item) => getText(item).toLowerCase().includes(cleanQuery));
}

function YouTubeChannelStationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get("channelId") || "";

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [dbStreams, setDbStreams] = useState<Stream[]>([]);
  const [activeTab, setActiveTab] = useState<"videos" | "streams">("videos");
  const [searchQuery, setSearchQuery] = useState("");

  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [selectedLiveStream, setSelectedLiveStream] = useState<LiveStream | null>(null);
  const [joiningLive, setJoiningLive] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, streams] = await Promise.all([
        api.getWorkspace(),
        api.listStreams("ended").catch(() => []),
      ]);
      setWorkspace(data);
      setDbStreams(streams);

      const allChns = (data.channels && data.channels.length > 0) ? data.channels : [data.channel];
      const matched = allChns.find((c: any) => String(c?.id) === String(channelId)) || data.channel;
      setCurrentChannel(matched);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load channel telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channelId]);

  const handleEnterLive = async (live: LiveStream) => {
    if (!live.live_chat_id) {
      toast.error("Live chat not ready yet");
      return;
    }
    setSelectedLiveStream(live);
    setGenreModalOpen(true);
  };

  const handleConfirmStart = async (genre: string) => {
    if (!selectedLiveStream) return;
    const liveChatId = selectedLiveStream.live_chat_id;
    if (!liveChatId) return;

    setJoiningLive(true);
    try {
      const stream = await api.startStream({
        source: "youtube_live",
        external_id: selectedLiveStream.id,
        title: selectedLiveStream.title,
        genre,
      });
      router.push(`/dashboard/stream/${stream.id}?liveChatId=${encodeURIComponent(liveChatId)}`);
    } catch (e: any) {
      toast.error(e?.message || "Could not join");
    } finally {
      setJoiningLive(false);
      setGenreModalOpen(false);
    }
  };

  const handleDownloadReport = async (e: React.MouseEvent, s: any) => {
    e.stopPropagation();
    try {
      toast.info("Extracting comments & compiling PDF report...");
      let targetStreamId = s.id;
      if (!s.isDb) {
        const res = await api.analyzeVideo(s.id, 3);
        targetStreamId = res.stream_id;
      }
      await api.downloadExport(targetStreamId);
      toast.success("PDF Autopsy Report Downloaded!");
    } catch {
      toast.error("Failed to generate report.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  const purePastVideos = workspace?.past_videos || [];
  const ytPastLiveVods = workspace?.past_live_vods || [];

  // 🔥 STRICT PLATFORM ISOLATION: FILTER OUT TELEGRAM AND DEMO STREAMS!
  const allPastStreamsCombined = useMemo(() => {
    const map = new Map<string, any>();
    
    // Only include streams that are NOT telegram and NOT demo!
    const youtubeOnlyDbStreams = dbStreams.filter((s) => 
      !s.external_id?.startsWith("tg_") && 
      !s.external_id?.startsWith("demo_") && 
      s.source !== "demo"
    );

    youtubeOnlyDbStreams.forEach((s) => map.set(s.external_id, {
      id: s.id, title: s.title || s.external_id, created_at: s.created_at,
      total_messages: s.total_messages, total_signals: s.total_signals, isDb: true,
    }));

    ytPastLiveVods.forEach((v) => {
      if (!map.has(v.id)) {
        map.set(v.id, {
          id: v.id, title: v.title, created_at: v.published_at,
          total_messages: v.comment_count, total_signals: Math.round(v.comment_count / 4) || 0,
          thumbnail_url: v.thumbnail_url, isDb: false,
        });
      }
    });
    return Array.from(map.values());
  }, [dbStreams, ytPastLiveVods]);

  const filteredVideos = useMemo(() => advancedSearch(purePastVideos, searchQuery, (v) => v.title || ""), [purePastVideos, searchQuery]);
  const filteredStreams = useMemo(() => advancedSearch(allPastStreamsCombined, searchQuery, (s) => s.title || s.id || ""), [allPastStreamsCombined, searchQuery]);

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Synchronizing YouTube Channel Station..." />
      </main>
    );
  }

  const liveNow = workspace?.live_now || [];
  const isLive = liveNow.length > 0;

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/youtube")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold transition font-mono shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" /> ← View Channels Hub
            </button>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-300 tracking-wide">Command Station</span>
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

      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="glass-panel rounded-3xl p-8 border border-red-500/30 bg-gradient-to-br from-red-500/10 via-zinc-900/40 to-transparent mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center gap-5 z-10">
            {currentChannel?.thumbnail_url ? (
              <img src={currentChannel.thumbnail_url} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-zinc-700 flex items-center justify-center font-bold text-2xl text-red-500">YT</div>
            )}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
                  {currentChannel?.title || "Connected YouTube Channel"}
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  <ShieldCheck className="w-3 h-3" /> Verified OAuth Node
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
                <span><span className="text-red-400 font-bold">{formatCount(currentChannel?.subscriber_count || 0)}</span> subscribers</span>
                <span>·</span>
                <span><span className="text-purple-400 font-bold">{formatCount(currentChannel?.video_count || 0)}</span> public videos</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { loadData(); toast.success("Channel Telemetry Refreshed ✓"); }} 
            className="z-10 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold transition shadow-md self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" /> Sync Channel Telemetry
          </button>
        </div>

        <div className="mb-10">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Live Broadcast Gateway
          </h2>
          {isLive ? (
            <div className="space-y-4">
              {liveNow.map((live) => (
                <div key={live.id} className="glass-panel rounded-3xl p-6 border-rose-500/40 bg-rose-500/5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shadow-xl">
                  {live.thumbnail_url && (
                    <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden relative border border-zinc-800 shrink-0 shadow-lg">
                      <img src={live.thumbnail_url} alt="" className="object-cover w-full h-full" />
                      <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE NOW
                      </div>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{live.title}</h3>
                    {live.concurrent_viewers && (
                      <p className="text-xs text-rose-300 flex items-center gap-1.5 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl w-fit">
                        <Eye className="w-3.5 h-3.5" /> {live.concurrent_viewers} active viewers listening
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEnterLive(live)}
                    disabled={joiningLive || !live.live_chat_id}
                    className="shrink-0 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-rose-500/30"
                  >
                    {joiningLive ? "Connecting Engine..." : "Launch Command Center →"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 text-center border border-zinc-800 bg-zinc-900/30">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-300 mb-1">Studio is currently quiet</h3>
              <p className="text-xs text-zinc-500 font-mono">Go live on YouTube Studio to auto-activate PULSE ingestion gateway.</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
            <div className="flex gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
              <button
                onClick={() => setActiveTab("videos")}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "videos" ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Uploaded Videos ({filteredVideos.length})
              </button>
              <button
                onClick={() => setActiveTab("streams")}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "streams" ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Past Live Streams ({filteredStreams.length})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived content..."
                className="w-full pl-10 pr-9 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {activeTab === "videos" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}

          {activeTab === "streams" && (
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
                  className="group cursor-pointer glass-panel p-5 rounded-3xl flex flex-col border border-zinc-800 hover:border-red-500/50 transition-all relative overflow-hidden"
                >
                  <button
                    onClick={(e) => handleDownloadReport(e, s)}
                    className="absolute top-4 right-4 z-20 p-2 bg-zinc-900/90 hover:bg-red-600 text-zinc-400 hover:text-white rounded-xl transition-colors border border-zinc-700 shadow-lg"
                    title="Download Autopsy PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <h3 className="text-sm font-bold text-zinc-100 mb-1 truncate pr-10 group-hover:text-red-400 transition-colors">{s.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mb-4">{new Date(s.created_at).toLocaleDateString()}</p>
                  
                  <div className="mt-auto grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 font-mono">
                    <div>
                      <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Raw Msgs</span>
                      <span className="font-bold text-zinc-300">{s.total_messages}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Pure Signals</span>
                      <span className="font-bold text-red-400">{s.total_signals}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLiveStream && (
        <GenreSelectionModal
          isOpen={genreModalOpen}
          onClose={() => setGenreModalOpen(false)}
          onConfirm={handleConfirmStart}
          joiningLive={joiningLive}
        />
      )}
    </main>
  );
}

export default function YouTubeChannelStationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Connecting..." /></main>}>
      <YouTubeChannelStationContent />
    </Suspense>
  );
}