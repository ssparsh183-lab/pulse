// frontend/app/dashboard/telegram/channel/page.tsx

"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api, TelegramChannelItem } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Loader } from "@/components/shared/loader";
import {
  Send, Eye, RefreshCw, Pin, 
  Search, X, LogOut, MessageSquare, Share2, Zap, 
  Layers, FileText, Play, ExternalLink, Sparkles, Radio, Download, Clock, ArrowRight
} from "lucide-react";

function formatCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n ?? 0);
}

function TelegramChannelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get("channelId") || "";

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [startingLive, setStartingLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelMeta, setChannelMeta] = useState<TelegramChannelItem | null>(null);
  const [feedData, setFeedData] = useState<any>(null);

  // Tabs: 'posts' (Broadcast Feed) or 'streams' (Past Live Streams)
  const [activeTab, setActiveTab] = useState<"posts" | "streams">("posts");

  // Active Video Player Modal
  const [activeVideo, setActiveVideo] = useState<{ id: number; title: string; src: string } | null>(null);
  
  // Full Photo Lightbox
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const loadChannelData = async () => {
    setLoading(true);
    try {
      const channels = await api.getTelegramChannels();
      const allChns = [...(channels.created || []), ...(channels.joined || [])];
      const current = allChns.find((c: any) => String(c.id) === String(channelId)) || allChns[0];
      if (current) setChannelMeta(current);

      const feed = await api.getTelegramChannelFeed(channelId || current?.id || "default");
      setFeedData(feed);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load channel telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannelData();
  }, [channelId]);

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  const isOwner = channelMeta?.is_creator ?? false;
  const broadcasts = feedData?.broadcasts || [];
  const pastLiveStreams = feedData?.past_voice_sessions || [];
  const isLiveActive = feedData?.is_voice_chat_active || false;
  const activeLiveInfo = feedData?.active_live_stream || null;

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter((b: any) => 
      (b.text || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.top_sentiment || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [broadcasts, searchQuery]);

  const filteredStreams = useMemo(() => {
    return pastLiveStreams.filter((s: any) =>
      (s.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pastLiveStreams, searchQuery]);

  // Launch live command room
  const handleLaunchLiveCommandCenter = async () => {
    setStartingLive(true);
    try {
      toast.info("Initializing Live Surveillance Command Center...");
      const stream = await api.startStream({
        source: "youtube_live",
        external_id: `tg_live_${channelId}`,
        title: activeLiveInfo?.title || `${channelMeta?.title} Telegram Live`,
        genre: "mixed"
      });
      toast.success("Connected to PULSE Live Engine! 🚀");
      router.push(`/dashboard/stream/${stream.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to initialize live command center.");
    } finally {
      setStartingLive(false);
    }
  };

  // 🔥 REAL SESSION AUTOPSY ROUTER (Navigates to the true /dashboard/analysis/[id] page!)
  const handleOpenSessionAutopsy = async (sessionMsgId: string) => {
    try {
      toast.info("Opening Live Stream Forensic Autopsy...");
      const res = await api.getTelegramSessionAutopsy(channelId, sessionMsgId);
      router.push(`/dashboard/analysis/${res.stream_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load session autopsy");
    }
  };

  const handleDownloadStreamReport = async (e: React.MouseEvent, sessionMsgId: string) => {
    e.stopPropagation();
    try {
      toast.info("Compiling Live Stream PDF Autopsy...");
      const res = await api.getTelegramSessionAutopsy(channelId, sessionMsgId);
      await api.downloadExport(res.stream_id);
      toast.success("Stream Autopsy Downloaded! 📄");
    } catch {
      toast.error("Download failed");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Synchronizing Telegram MTProto Feed..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Top Navbar */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/telegram")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-bold transition font-mono shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" /> ← View Channels Hub
            </button>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl">
              <Send className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-sky-300 tracking-wide">
                {isOwner ? "Creator Command Station" : "Telegram Stream Feed"}
              </span>
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

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Channel Profile Header */}
        <div className="glass-panel rounded-2xl p-5 border border-sky-500/30 bg-zinc-950/80 mb-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-lg shrink-0">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-100">{channelMeta?.title || "Telegram Channel"}</h1>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${isOwner ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'}`}>
                  {isOwner ? "OWNER" : "SUBSCRIBER"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {channelMeta?.username || `@node_${channelId.slice(-6)}`} · <span className="text-sky-400 font-bold">{formatCount(channelMeta?.members_count || 0)}</span> subscribers
              </p>
            </div>
          </div>
          
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/dashboard/telegram/analyze/${channelId}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-900/20 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-3.5 h-3.5" /> Analyze Channel ⚡
            </button>
            <button 
              onClick={loadChannelData} 
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all" 
              title="Sync Feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 🔴 LIVE BROADCAST GATEWAY */}
        {isOwner && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Live Broadcast Gateway
            </h2>

            {isLiveActive && activeLiveInfo ? (
              <div className="glass-panel rounded-3xl p-6 border-rose-500/40 bg-rose-500/5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 animate-pulse">
                    <Radio className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider font-mono mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE BROADCAST NOW
                    </span>
                    <h3 className="text-lg font-bold text-zinc-100">{activeLiveInfo.title}</h3>
                    <p className="text-xs text-rose-300 font-mono mt-0.5">
                      <Eye className="w-3.5 h-3.5 inline mr-1" /> {activeLiveInfo.viewers} connected reach
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLaunchLiveCommandCenter}
                  disabled={startingLive}
                  className="shrink-0 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-7 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-rose-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {startingLive ? "Connecting Room..." : "Launch Live Command Center →"}
                </button>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-7 text-center border border-zinc-800 bg-zinc-900/30 shadow-md">
                <div className="w-10 h-10 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto mb-2 text-zinc-500">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-300 mb-0.5">Channel Studio is currently quiet</h3>
                <p className="text-xs text-zinc-500 font-mono max-w-md mx-auto">
                  Start a Live Stream or Video Chat on Telegram to auto-activate the PULSE Real-Time Ingestion Gateway.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 🎛️ DUAL TABS */}
        {isOwner && (
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "posts" 
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/20" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Broadcast Content
              </button>
              <button
                onClick={() => setActiveTab("streams")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "streams" 
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/20" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Past Live Streams ({filteredStreams.length})
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Pinned Message */}
        {activeTab === "posts" && feedData?.pinned_message && (
          <div className="mb-6 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200 shadow-md">
            <Pin className="w-4 h-4 text-sky-400 rotate-45 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sky-400 block mb-0.5">Pinned Message</span>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-mono line-clamp-3 whitespace-pre-wrap">
                {feedData.pinned_message}
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "posts" ? "Search lectures, notes, syllabus..." : "Search past live streams..."}
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ================= TAB 1: BROADCAST FEED ================= */}
        {activeTab === "posts" && (
          <div className="space-y-6">
            {filteredBroadcasts.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-2xl text-zinc-500 text-xs font-mono">
                No messages found in this channel feed.
              </div>
            ) : (
              filteredBroadcasts.map((msg: any) => {
                const mediaThumb = msg.media_url ? `${API_BASE_URL}${msg.media_url}?type=thumb&ngrok-skip-browser-warning=true`: null;
                const fileStreamUrl = msg.media_url ? `${API_BASE_URL}${msg.media_url}?type=file&ngrok-skip-browser-warning=true`: null;

                const isVideo = msg.media_type === "video";
                const isPhoto = msg.media_type === "photo";
                const isDoc = msg.media_type === "document";

                return (
                  <div
                    key={msg.id}
                    className="rounded-2xl border border-zinc-800/90 bg-[#0f1722]/95 backdrop-blur-md p-4 shadow-xl h-fit w-full"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold">
                        {msg.top_sentiment}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        ⚡ {msg.signals_extracted} Signal
                      </span>
                    </div>

                    {/* Video Card */}
                    {isVideo && (
                      <div 
                        onClick={() => {
                          if (fileStreamUrl) {
                            setActiveVideo({ id: msg.id, title: msg.file_name || "Telegram Lecture Video", src: fileStreamUrl });
                          }
                        }}
                        className="mb-3 max-w-[460px] rounded-xl overflow-hidden border border-zinc-800 bg-black relative group cursor-pointer shadow-lg hover:border-sky-500 transition-all"
                      >
                        <div className="w-full relative bg-zinc-950 flex items-center justify-center min-h-[220px]">
                          {mediaThumb ? (
                            <img src={mediaThumb} alt="" className="w-full h-auto max-h-[420px] object-contain" />
                          ) : (
                            <div className="p-8 text-center text-xs text-zinc-500 font-mono">Video Preview</div>
                          )}
                          <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute w-14 h-14 rounded-full bg-black/70 border border-white/30 flex items-center justify-center text-white group-hover:scale-110 transition-transform backdrop-blur-md shadow-2xl">
                            <Play className="w-6 h-6 fill-current translate-x-0.5 text-sky-400" />
                          </div>
                          {msg.duration && (
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/85 text-white font-mono text-xs font-bold border border-white/10 shadow-md">
                              {msg.duration}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Photo Viewer */}
                    {isPhoto && (
                      <div 
                        onClick={() => mediaThumb && setActivePhoto(mediaThumb)}
                        className="mb-3 max-w-[460px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer group hover:border-purple-500 transition-all min-h-[160px] flex items-center justify-center"
                      >
                        {mediaThumb ? (
                          <img 
                            src={mediaThumb} 
                            alt="Telegram Media" 
                            className="w-full h-auto max-h-[440px] object-contain rounded-xl"
                            loading="lazy" 
                          />
                        ) : (
                          <div className="p-6 text-center text-xs text-zinc-400">Photo Attachment</div>
                        )}
                      </div>
                    )}

                    {/* PDF Card */}
                    {isDoc && (
                      <a
                        href={fileStreamUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-blue-500/50 flex items-center justify-between text-xs font-mono text-zinc-300 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate max-w-[280px]">
                            <p className="font-bold text-zinc-200 truncate group-hover:text-blue-300 transition-colors">{msg.file_name || "Document"}</p>
                            <p className="text-[10px] text-zinc-500">{msg.file_size || ""} · Click to Open File</p>
                          </div>
                        </div>
                        <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </span>
                      </a>
                    )}

                    {msg.text && (
                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans mb-3 break-words">
                        {msg.text}
                      </p>
                    )}

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-auto">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {msg.views || 0}</span>
                        <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-sky-400" /> {msg.forwards || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {msg.comments_count || 0}</span>
                      </div>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= TAB 2: PAST LIVE STREAMS ================= */}
        {activeTab === "streams" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredStreams.length === 0 ? (
              <div className="col-span-2 glass-panel p-8 text-center rounded-2xl text-zinc-500 text-xs font-mono">
                No past live broadcast records found on this channel.
              </div>
            ) : (
              filteredStreams.map((s: any) => (
                <div
                  key={s.id}
                  // 🔥 REAL SESSION AUTOPSY ROUTER: Opens YouTube-style /dashboard/analysis/[id]!
                  onClick={() => handleOpenSessionAutopsy(s.id)}
                  className="group cursor-pointer glass-panel p-5 rounded-3xl flex flex-col border border-zinc-800 hover:border-sky-500/50 transition-all relative overflow-hidden bg-zinc-900/40 shadow-lg"
                >
                  <button
                    onClick={(e) => handleDownloadStreamReport(e, s.id)}
                    className="absolute top-4 right-4 z-20 p-2 bg-zinc-900/90 hover:bg-sky-600 text-zinc-400 hover:text-white rounded-xl transition-colors border border-zinc-700 shadow-md"
                    title="Download Autopsy Report"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      ARCHIVED STREAM
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{s.date}</span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 mb-3 truncate pr-10 group-hover:text-sky-400 transition-colors">
                    {s.title}
                  </h3>
                  
                  <div className="mt-auto grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <div>
                        <span className="text-zinc-500 text-[9px] uppercase block">Exact Duration</span>
                        <span className="font-bold text-zinc-300">{s.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <div>
                        <span className="text-zinc-500 text-[9px] uppercase block">Peak Reach</span>
                        <span className="font-bold text-sky-400">{s.views}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-sky-400 font-mono font-bold">
                    <span>Open Session Autopsy</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* 🎬 MODAL: REAL TELEGRAM HTML5 VIDEO PLAYER */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl glass-panel rounded-3xl p-2 border border-purple-500/30 bg-zinc-950 shadow-2xl relative">
            <div className="flex items-center justify-between p-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 truncate max-w-lg">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" /> {activeVideo.title}
              </h3>
              <button 
                onClick={() => setActiveVideo(null)} 
                className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono transition"
              >
                Close
              </button>
            </div>
            
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center">
              <video 
                src={activeVideo.src} 
                controls 
                autoPlay 
                playsInline
                preload="metadata"
                className="w-full h-full object-contain z-10"
              >
                Your browser does not support playing this video stream.
              </video>
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                PULSE // MTProto High-Speed Stream
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4"
        >
          <div className="fixed top-5 right-6 z-[110] flex items-center gap-3">
            <button
              onClick={() => setActivePhoto(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-mono shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            >
              <X className="w-4 h-4 text-zinc-400" /> Close
            </button>
          </div>
          <div className="w-full h-full overflow-auto flex items-center justify-center p-2 cursor-zoom-out" onClick={() => setActivePhoto(null)}>
            <img 
              src={activePhoto} 
              alt="Full Preview" 
              onClick={(e) => e.stopPropagation()} 
              className="w-auto h-auto cursor-default rounded-xl shadow-2xl border border-zinc-800/80" 
              style={{ maxWidth: 'none', maxHeight: 'none', display: 'block' }} 
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function TelegramChannelPage() {
  return (
    <Suspense fallback={<main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Connecting..." /></main>}>
      <TelegramChannelContent />
    </Suspense>
  );
}