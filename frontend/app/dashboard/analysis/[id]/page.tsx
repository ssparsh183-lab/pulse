// frontend/app/dashboard/analysis/[id]/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { Header } from "@/components/dashboard/header";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { PulseScoreGauge } from "@/components/analytics/pulse-score-gauge";
import { AudienceDNAPanel } from "@/components/analytics/audience-dna-panel";
import { TimelineHeatmap } from "@/components/analytics/timeline-heatmap";
import { SmartInsights } from "@/components/analytics/smart-insights";
import { MonetizationTip } from "@/components/analytics/monetization-tip";
import { SignalCard } from "@/components/signals/signal-card";
import { CategoryFilter } from "@/components/dashboard/category-filter";
import { Loader } from "@/components/shared/loader";
import { MultilingualInject } from "@/components/dashboard/multilingual-inject";
import { 
  ArrowLeft, Download, Radio, Archive, Sparkles, FileText, 
  Maximize2, Minimize2, Eye, ThumbsUp, MessageSquare, Clock, ShieldCheck,
  RefreshCw, Volume2, Send
} from "lucide-react";

function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function UnifiedAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  const { token, isHydrated, user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [syncingComments, setSyncingComments] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // BASE STATES
  const [videoMeta, setVideoMeta] = useState<any>(null);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  
  // ALWAYS LOCKED TO MIXED/GENERAL FOR ALL PAST AUTOPSIES (NO CONTEXT SLIDER)
  const [pulseScore, setPulseScore] = useState<any>(null);      
  const [timelineData, setTimelineData] = useState<any[]>([]);  
  const [dnaData, setDnaData] = useState<any>(null);            
  const [topStats, setTopStats] = useState<any>(null);          
  const [insightsSignals, setInsightsSignals] = useState<any[]>([]); 
  const [gridSignals, setGridSignals] = useState<any[]>([]);         
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !token) router.replace("/");
  }, [isHydrated, token, router]);

  const fetchAnalysisData = useCallback(async () => {
    try {
      const res = await api.getFullAnalysis(streamId, "mixed");
      
      setPulseScore(res.score);
      setTimelineData(res.timeline);
      setDnaData(res.audience);
      setGridSignals(res.signals);
      setInsightsSignals(res.signals);
      
      setTopStats({ 
        msgs: res.stream.total_messages, 
        users: res.stream.unique_participants,
        signals: res.stream.total_signals
      });
    } catch (e: any) {
      console.error(e);
    }
  }, [streamId]);

  useEffect(() => {
    if (!token || !streamId) return;
    (async () => {
      try {
        const res = await api.getFullAnalysis(streamId, "mixed");
        setStreamInfo(res.stream);
        await fetchAnalysisData();

        if (res?.stream?.external_id && !res?.stream?.external_id?.startsWith("tg_")) {
          try {
            const ws = await api.getWorkspace();
            const meta = ws.past_videos?.find((v: any) => v.id === res.stream.external_id);
            if (meta) setVideoMeta(meta);
          } catch {}
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to fetch session autopsy");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, streamId, fetchAnalysisData]);

  const isLive = streamInfo?.status === "live";

  // Dynamic comment sync for uploaded YouTube videos
  const handleSyncComments = async () => {
    if (!videoMeta?.id) return;
    setSyncingComments(true);
    try {
      toast.info("Extracting live comments from YouTube & updating PULSE signals...");
      const result = await api.analyzeVideo(videoMeta.id, 5);
      toast.success(`Synced ${result.comments_processed} real comments → ${result.signals_created} dynamic signals!`);
      await fetchAnalysisData();
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncingComments(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      toast.info("Generating Universal Forensic Report...");
      await api.downloadExport(streamId, "mixed"); // Strictly Universal Mixed Context
      toast.success("Autopsy Report Downloaded! 📄");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleResolve = async (sigId: string) => {
    if (!isLive) return;
    try {
      await api.resolveSignal(streamId, sigId);
      toast.success("Resolved ✓");
      setGridSignals(p => p.filter(s => s.id !== sigId));
    } catch { toast.error("Failed"); }
  };

  const handleDismiss = async (sigId: string) => {
    if (!isLive) return;
    try {
      await api.dismissSignal(streamId, sigId);
      toast.info("Dismissed");
      setGridSignals(p => p.filter(s => s.id !== sigId));
    } catch { toast.error("Failed"); }
  };

  const handleInjected = async () => {
    toast.success("Injected! Refreshing pipeline...");
    setTimeout(async () => {
      const res = await api.getFullAnalysis(streamId, "mixed");
      setPulseScore(res.score);
      setTimelineData(res.timeline);
      setDnaData(res.audience);
      setTopStats({ msgs: res.stream.total_messages, users: res.stream.unique_participants, signals: res.stream.total_signals });
      setGridSignals(res.signals);
      setInsightsSignals(res.signals);
    }, 1500);
  };

  if (!isHydrated || loading) {
    return <main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Loading forensic analysis..." /></main>;
  }
  if (!streamInfo) {
    return <main className="min-h-screen gradient-bg flex items-center justify-center"><p className="text-zinc-500">No session data found</p></main>;
  }

  const filteredSignals = selectedCategory
    ? gridSignals.filter((s: any) => s.category === selectedCategory)
    : gridSignals;
    
  const categoryCounts: Record<string, number> = {};
  gridSignals.forEach((s: any) => { if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });

  const externalId = streamInfo.external_id || "";
  const isTelegramContent = externalId.startsWith("tg_");
  
  // 🔥 DETECT TWITTER/X STREAMS (Prevents YouTube player hijacking!)
  const isTwitterContent = externalId.startsWith("x_") || streamInfo.source === "twitter";
  
  // Strictly uploaded YouTube videos & live streams
  const isUploadedVideo = !isTelegramContent && !isTwitterContent && (streamInfo.source === "youtube_video" || streamInfo.source === "video");
  const isYouTubeLiveStream = !isTelegramContent && !isTwitterContent && !isUploadedVideo && !externalId.startsWith("demo_");

  const title = videoMeta?.title || streamInfo.title || "Session Autopsy";

  // Exact Duration calculation
  let durationSeconds = 0;
  if (streamInfo.started_at && streamInfo.ended_at) {
    durationSeconds = Math.max(1, Math.round((new Date(streamInfo.ended_at).getTime() - new Date(streamInfo.started_at).getTime()) / 1000));
  } else {
    const match = title.match(/\((\d+)s\)/);
    if (match) durationSeconds = parseInt(match[1]);
  }

  // Parse Telegram media stream link safely
  let tgStreamUrl = "";
  if (isTelegramContent) {
    const raw = externalId.replace("tg_sess_", "");
    const lastUnderscore = raw.lastIndexOf("_");
    if (lastUnderscore !== -1) {
      const chId = raw.substring(0, lastUnderscore);
      const msgId = raw.substring(lastUnderscore + 1);
      tgStreamUrl = `${API_BASE_URL}/api/telegram/media/${chId}/${msgId}?type=file`;
    }
  }

  return (
    <main className="min-h-screen gradient-bg pb-16 relative z-10">
      <Header channelTitle={title} isLive={isLive} />

      <MonetizationTip pulseScore={pulseScore} isLive={isLive} />

      <div className="max-w-[1600px] mx-auto px-6 pt-6">

        {/* ================= HEADER STRIP ================= */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition font-mono"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Feed / Channel
          </button>
          
          <div className="flex items-center gap-3">
            {isUploadedVideo && (
              <button
                onClick={handleSyncComments}
                disabled={syncingComments}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingComments ? 'animate-spin' : ''}`} />
                {syncingComments ? "Syncing YouTube..." : "Sync Live Comments"}
              </button>
            )}

            {isLive ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse font-mono">
                <Radio className="w-3.5 h-3.5" /> LIVE IN PROGRESS
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
                <Archive className="w-3.5 h-3.5" /> {isUploadedVideo ? "VOD COMMENTS AUTOPSY" : "PAST SESSION AUTOPSY"}
              </div>
            )}
            
            {!isLive && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all font-mono"
              >
                {downloading ? (
                  <><FileText className="w-4 h-4 animate-pulse" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Export Full Autopsy (.pdf)</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ================= 1. REAL TELEGRAM STREAM PLAYER ================= */}
        {isTelegramContent && (
          <div className="glass-panel rounded-3xl p-7 border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-zinc-900/60 to-zinc-950 mb-8 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* 🔥 PLAYABLE PLAYER (With Graceful Fallback if host didn't record on Telegram) */}
              <div className="lg:col-span-6 aspect-video w-full rounded-2xl overflow-hidden bg-black/95 border border-sky-500/30 shadow-2xl relative flex items-center justify-center group">
                {!videoError && tgStreamUrl ? (
                  <video 
                    src={tgStreamUrl} 
                    controls 
                    playsInline
                    onError={() => setVideoError(true)}
                    className="w-full h-full object-contain z-10 relative"
                  >
                    Your browser does not support playing this live stream recording.
                  </video>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-sky-500/10 to-transparent">
                    {/* Live Waveform */}
                    <div className="flex items-center gap-1.5 mb-3 h-10">
                      <span className="w-1 h-5 rounded-full bg-sky-400/60 animate-pulse" />
                      <span className="w-1 h-8 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <span className="w-1 h-4 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-10 rounded-full bg-sky-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                      <span className="w-1 h-6 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                    </div>

                    <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold mb-1">
                      <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      <span>Live Broadcast Session ({durationSeconds}s)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono max-w-xs">
                      Live transmission concluded via MTProto Gateway. Host broadcasted live without server-side cloud recording.
                    </p>
                    <span className="mt-3 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-mono uppercase font-bold">
                      ● Verified Transmission
                    </span>
                  </div>
                )}
              </div>

              {/* Session Meta */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-mono font-bold uppercase">
                    TELEGRAM CHANNEL BROADCAST
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold flex items-center gap-1 border border-zinc-700">
                    <Clock className="w-3 h-3 text-sky-400" /> Exact Duration: {durationSeconds}s
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">{title}</h2>
                <p className="text-xs text-zinc-400 font-mono mb-4">
                  Stream ID: {streamInfo.external_id}
                </p>
                <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
                  <span className="px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-1.5 text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Broadcast Host: {user?.name || "Admin"}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= 1.5 REAL TWITTER / X SPACE & STREAM PLAYER ================= */}
        {isTwitterContent && (
          <div className="glass-panel rounded-3xl p-7 border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-zinc-900/60 to-zinc-950 mb-8 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Tactical Space Audio / Waveform Visualizer */}
              <div className="lg:col-span-6 aspect-video w-full rounded-2xl overflow-hidden bg-black/95 border border-sky-500/30 shadow-2xl relative flex items-center justify-center">
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-sky-500/10 to-transparent relative">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <TwitterIcon className="w-7 h-7 text-zinc-100" />
                  </div>
                  
                  {/* Dynamic Audio Waveform */}
                  <div className="flex items-center gap-1.5 mb-3 h-8">
                    <span className="w-1.5 h-4 rounded-full bg-sky-400/60 animate-pulse" />
                    <span className="w-1.5 h-7 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-10 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-6 rounded-full bg-sky-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1.5 h-8 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-5 rounded-full bg-sky-400/60 animate-pulse" style={{ animationDelay: '0.25s' }} />
                  </div>
                  
                  <span className="text-xs font-mono text-zinc-200 font-bold">X Space Recording · Real-Time Audio Transmission</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1">Duration: {durationSeconds}s · Archived via PULSE Ingestion Engine</span>
                </div>
              </div>

              {/* Space Metadata */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-mono font-bold uppercase">
                    OFFICIAL X SPACE ARCHIVE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold flex items-center gap-1 border border-zinc-700">
                    <Clock className="w-3 h-3 text-sky-400" /> Exact Duration: {durationSeconds}s
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">{title}</h2>
                <p className="text-xs text-zinc-400 font-mono mb-4">
                  Stream ID: {streamInfo.external_id}
                </p>
                <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
                  <span className="px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-1.5 text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Broadcast Host: {user?.name || "Verified Node"}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= 2. REAL YOUTUBE PLAYER (ONLY FOR TRUE YOUTUBE CONTENT!) ================= */}
        {(isUploadedVideo || isYouTubeLiveStream) && (
          <div className={`flex ${isTheater ? "flex-col" : "flex-col lg:flex-row"} gap-8 mb-8 items-start`}>
            <div className={`relative aspect-video rounded-3xl overflow-hidden border border-zinc-800 shrink-0 shadow-2xl bg-black transition-all duration-500 z-10 group ${isTheater ? "w-full mx-auto" : "w-full lg:w-[540px]"}`}>
              <iframe
                src={`https://www.youtube.com/embed/${externalId}?rel=0&modestbranding=1${isLive ? "&autoplay=1&mute=1" : ""}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen className="relative w-full h-full border-0 z-10"
              />
              <button onClick={() => setIsTheater(!isTheater)} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300">
                {isTheater ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            <div className={`flex flex-col justify-center py-2 flex-1 min-w-0 ${isTheater ? "items-center text-center w-full" : ""}`}>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight leading-tight mb-4">{title}</h1>
              {videoMeta && (
                <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-zinc-400 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50 w-fit">
                  <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-purple-400" /><span className="text-zinc-200 font-semibold">{videoMeta.view_count?.toLocaleString()}</span> views</span>
                  <span className="w-px h-4 bg-zinc-700 hidden sm:block" />
                  <span className="flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-blue-400" /><span className="text-zinc-200 font-semibold">{videoMeta.like_count?.toLocaleString()}</span> likes</span>
                  <span className="w-px h-4 bg-zinc-700 hidden sm:block" />
                  <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /><span className="text-zinc-200 font-semibold">{videoMeta.comment_count?.toLocaleString()}</span> comments</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STATS BAR ================= */}
        <div className="mb-6">
          <StatsBar 
            totalMessages={topStats?.msgs || 0} 
            activeSignals={gridSignals.length} 
            uniqueUsers={topStats?.users || 0} 
          />
        </div>

        {/* ================= LIQUID GAUGE & BREAKDOWN ================= */}
        {pulseScore && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PulseScoreGauge score={pulseScore.score} state={pulseScore.state} label={pulseScore.label} color={pulseScore.color} reasons={pulseScore.reasons} size="md" />
            <div className="md:col-span-2 glass-panel rounded-3xl p-6 flex flex-col justify-center border-purple-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Session Breakdown (Mixed/General Context)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(pulseScore.components || {}).map(([key, val]: any) => (
                  <div key={key} className="relative z-10">
                    <div className="flex justify-between text-[10px] mb-1.5"><span className="text-zinc-300 capitalize">{key.replace("_", " ")}</span><span className="text-zinc-400 font-mono font-bold">{(val * 100).toFixed(0)}%</span></div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000 ease-out" style={{ width: `${val * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= SMART INSIGHTS ================= */}
        <div className="mb-6">
          <SmartInsights 
            signals={insightsSignals} 
            score={pulseScore} 
            dna={dnaData?.dna} 
            streamMeta={{ title, view_count: videoMeta?.view_count || 0, like_count: videoMeta?.like_count || 0, comment_count: videoMeta?.comment_count || topStats?.msgs || 0 }} 
            isLive={isLive} 
          />
        </div>

        {/* ================= EXACT-TIMELINE HEATMAP (STRICTLY FOR PAST LIVE STREAMS! NEVER FOR UPLOADED VIDEOS!) ================= */}
        {!isUploadedVideo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className={`${isLive ? 'lg:col-span-8' : 'col-span-full'}`}>
              <TimelineHeatmap data={timelineData || []} isLive={isLive} />
            </div>
            {isLive && (
              <div className="lg:col-span-4">
                <MultilingualInject streamId={streamId} onInjected={handleInjected} />
              </div>
            )}
          </div>
        )}

        {/* ================= AUDIENCE DNA + MOMENTS ================= */}
        {dnaData && (
          <div className="mb-6">
            <AudienceDNAPanel dna={dnaData.dna} moments={dnaData.moments} />
          </div>
        )}

        {/* ================= EXTRACTED SIGNALS GRID ================= */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">
              {isLive ? "Live Signal Feed" : `Extracted Autopsy Signals (${gridSignals.length})`}
            </h2>
          </div>
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} counts={categoryCounts} />
          {filteredSignals.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-zinc-500 text-sm font-mono">No signals recorded during this session window.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSignals.map((sig: any) => (
                <SignalCard key={sig.id} signal={sig} onResolve={isLive ? handleResolve : undefined} onDismiss={isLive ? handleDismiss : undefined} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}