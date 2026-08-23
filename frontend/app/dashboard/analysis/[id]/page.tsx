"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
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
  Maximize2, Minimize2, Eye, ThumbsUp, MessageSquare 
} from "lucide-react";

export default function UnifiedAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  const { token, isHydrated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isTheater, setIsTheater] = useState(false);

  // BASE STATES (Fetched once on load)
  const [videoMeta, setVideoMeta] = useState<any>(null);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  
  // ⏱️ INDIVIDUAL THROTTLED STATES
  const [pulseScore, setPulseScore] = useState<any>(null);      // Liquid (2.5s)
  const [timelineData, setTimelineData] = useState<any[]>([]);  // Liquid (2.5s)
  const [dnaData, setDnaData] = useState<any>(null);            // 5s update
  const [topStats, setTopStats] = useState<any>(null);          // 10s update
  const [insightsSignals, setInsightsSignals] = useState<any[]>([]); // 15s update
  const [gridSignals, setGridSignals] = useState<any[]>([]);         // 15s update
  
  // UI States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !token) router.replace("/");
  }, [isHydrated, token, router]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    if (!token || !streamId) return;
    (async () => {
      try {
        const res = await api.getFullAnalysis(streamId);
        
        setStreamInfo(res.stream);
        setPulseScore(res.score);
        setTimelineData(res.timeline);
        setDnaData(res.audience);
        setTopStats({ msgs: res.stream.total_messages, users: res.stream.unique_participants });
        setInsightsSignals(res.signals);
        setGridSignals(res.signals);

        if (res?.stream?.external_id && res?.stream?.source === "youtube_video") {
          try {
            const ws = await api.getWorkspace();
            const meta = ws.past_videos?.find((v: any) => v.id === res.stream.external_id);
            if (meta) setVideoMeta(meta);
          } catch {}
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to fetch analysis");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, streamId]);

  const isLive = streamInfo?.status === "live";

  // ============================================================
  // THROTTLED LIVE POLLING SYSTEM (MIND-BLOWING UX)
  // ============================================================
  useEffect(() => {
    if (!isLive) return;

    // 1. LIQUID POLL (Every 2.5s) -> Pulse Score & Timeline Graph
    const liquidTimer = setInterval(async () => {
      try {
        const [score, timeline] = await Promise.all([
          api.getPulseScore(streamId).catch(() => null),
          api.getTimeline(streamId).catch(() => null)
        ]);
        if (score) setPulseScore(score);
        if (timeline?.timeline) setTimelineData(timeline.timeline);
      } catch {}
    }, 2500);

    // 2. FAST POLL (Every 5s) -> Audience DNA
    const dnaTimer = setInterval(async () => {
      try {
        const dna = await api.getAudienceDNA(streamId);
        // Only update if data actually changed to prevent unnecessary re-renders of moments
        setDnaData((prev: any) => {
          if (JSON.stringify(prev) !== JSON.stringify(dna)) return dna;
          return prev;
        });
      } catch {}
    }, 5000);

    // 3. MEDIUM POLL (Every 10s) -> Top Stats Bar
    const statsTimer = setInterval(async () => {
      try {
        const s = await api.getStream(streamId);
        setTopStats({ msgs: s.total_messages, users: s.unique_participants });
      } catch {}
    }, 10000);

    // 4. SLOW POLL (Every 15s) -> Smart Insights & Signal Cards Grid
    const cardsTimer = setInterval(async () => {
      try {
        const sigs = await api.getStreamSignals(streamId, selectedCategory || undefined);
        setGridSignals(sigs);
        setInsightsSignals(sigs); // This triggers the SmartInsights 15s rotation inherently
      } catch {}
    }, 15000);

    return () => {
      clearInterval(liquidTimer);
      clearInterval(dnaTimer);
      clearInterval(statsTimer);
      clearInterval(cardsTimer);
    };
  }, [isLive, streamId, selectedCategory]);


  // ============================================================
  // HANDLERS
  // ============================================================
  const handleDownload = async () => {
    setDownloading(true);
    try {
      toast.info("Generating Report...");
      await api.downloadExport(streamId);
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
      // Immediate optimistic update for UX
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
    // Give backend 1s to process the vector math, then force an immediate refresh of EVERYTHING
    setTimeout(async () => {
      const res = await api.getFullAnalysis(streamId);
      setPulseScore(res.score);
      setTimelineData(res.timeline);
      setDnaData(res.audience);
      setTopStats({ msgs: res.stream.total_messages, users: res.stream.unique_participants });
      setGridSignals(res.signals);
      setInsightsSignals(res.signals);
    }, 1500);
  };

  if (!isHydrated || loading) {
    return <main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Loading deep analysis..." /></main>;
  }
  if (!streamInfo) {
    return <main className="min-h-screen gradient-bg flex items-center justify-center"><p className="text-zinc-500">No data found</p></main>;
  }

  const filteredSignals = selectedCategory
    ? gridSignals.filter((s: any) => s.category === selectedCategory)
    : gridSignals;
    
  const categoryCounts: Record<string, number> = {};
  gridSignals.forEach((s: any) => { if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });

  const externalId = streamInfo.external_id;
  const isYouTubeContent = streamInfo.source === "youtube_video" || streamInfo.source === "youtube_live";
  const showPlayer = externalId && isYouTubeContent && !externalId.startsWith("demo_");
  const title = videoMeta?.title || streamInfo.title || "Session Analysis";

  return (
    <main className="min-h-screen gradient-bg pb-16">
      <Header channelTitle={title} isLive={isLive} />

      <MonetizationTip pulseScore={pulseScore} isLive={isLive} />

      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        
        {/* ================= HEADER STRIP ================= */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Workspace
          </button>
          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse">
                <Radio className="w-3.5 h-3.5" /> LIVE IN PROGRESS
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Archive className="w-3.5 h-3.5" /> POST-SESSION AUTOPSY
              </div>
            )}
            
            {!isLive && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all"
              >
                {downloading ? (
                  <><FileText className="w-4 h-4 animate-pulse" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Export Report</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ================= YOUTUBE PLAYER ================= */}
        {showPlayer && (
          <div className={`flex ${isTheater ? "flex-col" : "flex-col lg:flex-row"} gap-8 mb-8 items-start`}>
            <div className={`relative aspect-video rounded-3xl overflow-hidden border border-zinc-800 shrink-0 shadow-2xl bg-black transition-all duration-500 z-10 group ${isTheater ? "w-full mx-auto" : "w-full lg:w-[540px]"}`}>
              <div className="absolute -inset-4 bg-purple-500/20 blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
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

        {/* ================= 10S THROTTLED STATS BAR ================= */}
        <div className="mb-6">
          <StatsBar 
            totalMessages={topStats?.msgs || 0} 
            activeSignals={gridSignals.length} 
            uniqueUsers={topStats?.users || 0} 
          />
        </div>

        {/* ================= LIQUID GAUGE & BREAKDOWN (2.5s) ================= */}
        {pulseScore && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PulseScoreGauge score={pulseScore.score} state={pulseScore.state} label={pulseScore.label} color={pulseScore.color} reasons={pulseScore.reasons} size="md" />
            <div className="md:col-span-2 glass-panel rounded-3xl p-6 flex flex-col justify-center border-purple-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                {isLive ? "Live Component Breakdown" : "Final Session Breakdown"}
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

        {/* ================= SMART INSIGHTS (15s Rotation) ================= */}
        <div className="mb-6">
          <SmartInsights 
            signals={insightsSignals} 
            score={pulseScore} 
            dna={dnaData?.dna} 
            streamMeta={{ title, view_count: videoMeta?.view_count || 0, like_count: videoMeta?.like_count || 0, comment_count: videoMeta?.comment_count || topStats?.msgs || 0 }} 
            isLive={isLive} 
          />
        </div>

        {/* ================= LIQUID TIMELINE HEATMAP (2.5s) & INJECT ================= */}
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

        {/* ================= AUDIENCE DNA (5s) + MOMENTS (Peak based) ================= */}
        {dnaData && (
          <div className="mb-6">
            <AudienceDNAPanel dna={dnaData.dna} moments={dnaData.moments} />
          </div>
        )}

        {/* ================= EXTRACTED SIGNALS GRID (15s) ================= */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">
              {isLive ? "Live Signal Feed" : `Extracted Autopsy Signals (${gridSignals.length})`}
            </h2>
            {isLive && (
              <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">Updates every 15s</span>
            )}
          </div>
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} counts={categoryCounts} />
          {filteredSignals.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-zinc-500 text-sm">No signals in this category.</div>
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