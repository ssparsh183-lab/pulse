// frontend/app/dashboard/stream/[id]/page.tsx

"use client";

import { PulseScoreGauge } from "@/components/analytics/pulse-score-gauge";
import { AudienceDNAPanel } from "@/components/analytics/audience-dna-panel";
import { MonetizationTip } from "@/components/analytics/monetization-tip";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { Signal, Stream } from "@/types";
import { Header } from "@/components/dashboard/header";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { CategoryFilter } from "@/components/dashboard/category-filter";
import { SignalCard } from "@/components/signals/signal-card";
import { Loader } from "@/components/shared/loader";
import { MultilingualInject } from "@/components/dashboard/multilingual-inject";
import { ContextSlider } from "@/components/dashboard/context-slider";
import {
  ArrowLeft,
  Radio,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  StopCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ChatMsg {
  message_id: string;
  author_name: string;
  text: string;
  published_at: string;
  isNew?: boolean;
}

export default function LiveStreamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const streamId = params.id as string;
  const liveChatId = searchParams.get("liveChatId") || "";
  const { token, isHydrated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<Stream | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // Active Context-Aware Sliding Genre State (Mixed by default!)
  const [activeGenre, setActiveGenre] = useState<string>("mixed");

  const [pulseScore, setPulseScore] = useState<any>(null);
  const [audienceData, setAudienceData] = useState<any>(null);

  const pageTokenRef = useRef<string | undefined>(undefined);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHydrated && !token) router.replace("/");
  }, [isHydrated, token, router]);

  // Initial Load (Defaults to Mixed context baseline)
  useEffect(() => {
    if (!token || !streamId) return;
    (async () => {
      try {
        const [s, initialSigs, score, dna] = await Promise.all([
          api.getStream(streamId, "mixed"),
          api.getStreamSignals(streamId, undefined, "mixed"),
          api.getPulseScore(streamId, "mixed").catch(() => null),
          api.getAudienceDNA(streamId, "mixed").catch(() => null),
        ]);
        setStream(s);
        setSignals(initialSigs);
        if (score) setPulseScore(score);
        if (dna) setAudienceData(dna);
      } catch (e: any) {
        toast.error(e.message || "Stream not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, streamId]);

  // Real-Time Engine Polling & Auto-End Detection from X
  useEffect(() => {
    if (!token || !streamId) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        if (liveChatId) {
          const res: any = await api.fetchLiveChat(streamId, liveChatId, pageTokenRef.current);
          if (res.next_page_token) pageTokenRef.current = res.next_page_token;
          
          if (res.messages && res.messages.length > 0) {
            setChatMessages((prev) => {
              const combined = [...prev, ...res.messages];
              const unique = combined.filter(
                (msg, idx, self) =>
                  self.findIndex((m) => m.message_id === msg.message_id) === idx
              );
              return unique.slice(-100);
            });
          }
        }

        const [sigs, score, dna, s] = await Promise.all([
          api.getStreamSignals(streamId, selectedCategory || undefined, activeGenre),
          api.getPulseScore(streamId, activeGenre).catch(() => null),
          api.getAudienceDNA(streamId, activeGenre).catch(() => null),
          api.getStream(streamId, activeGenre).catch(() => null),
        ]);

        if (sigs) setSignals(sigs);
        if (score) setPulseScore(score);
        if (dna) setAudienceData(dna);

        // 🔥 STEP 2: AUTO-DETECT STREAM CONCLUSION FROM X / TWITTER
        if (s) {
          setStream(s);
          if (s.status === "ended") {
            cancelled = true;
            toast.info("Broadcast has concluded on X. Returning to Command Station...");
            setTimeout(() => {
              const h = s.external_id?.startsWith("x_live_")
                ? `@${s.external_id.replace("x_live_", "").split("_")[0]}`
                : "@sparshsharmai";
              router.push(`/dashboard/twitter/channel?handle=${encodeURIComponent(h)}`);
            }, 1000);
            return;
          }
        }
      } catch (e) {}

      if (!cancelled) setTimeout(tick, 2500);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [token, streamId, liveChatId, selectedCategory, activeGenre, router]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleResolve = async (sigId: string) => {
    try {
      await api.resolveSignal(streamId, sigId);
      toast.success("Resolved ✓");
      fetchSignals();
    } catch {
      toast.error("Resolve failed");
    }
  };

  const handleDismiss = async (sigId: string) => {
    try {
      await api.dismissSignal(streamId, sigId);
      toast.info("Dismissed");
      fetchSignals();
    } catch {
      toast.error("Dismiss failed");
    }
  };

  const fetchSignals = useCallback(async (genreToFetch = activeGenre) => {
    if (!stream) return;
    try {
      const [sigs, score, dna] = await Promise.all([
        api.getStreamSignals(stream.id, selectedCategory || undefined, genreToFetch),
        api.getPulseScore(stream.id, genreToFetch).catch(() => null),
        api.getAudienceDNA(stream.id, genreToFetch).catch(() => null),
      ]);
      setSignals(sigs);
      if (score) setPulseScore(score);
      if (dna) setAudienceData(dna);
    } catch (e) {
      console.error(e);
    }
  }, [stream, selectedCategory, activeGenre]);

  const handleGenreChange = async (newGenre: string) => {
    if (!stream) return;
    setActiveGenre(newGenre);
    try {
      toast.info(`Recalibrating context space to: ${newGenre.toUpperCase()}...`);
      await fetchSignals(newGenre);
      toast.success(`Context space calibrated to: ${newGenre.toUpperCase()}! 🎯`);
    } catch (e: any) {
      toast.error(e?.message || "Recalibration failed");
    }
  };

  const handleEndStream = async () => {
    if (!confirm("End this live analysis session? You'll be taken to the full report.")) return;
    setEnding(true);
    try {
      await api.endStream(streamId);
      toast.success("Session archived — opening analysis...");
      setTimeout(() => router.push(`/dashboard/analysis/${streamId}`), 500);
    } catch {
      toast.error("End session failed");
    } finally {
      setEnding(false);
    }
  };

  const handleInjected = async (text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        message_id: `inj_${Date.now()}`,
        author_name: "citizen_live",
        text: text,
        published_at: new Date().toISOString(),
        isNew: true,
      },
    ]);
  };

  if (!isHydrated || loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Connecting to Live Command Center..." />
      </main>
    );
  }

  const isXLiveStream = Boolean(stream?.external_id?.startsWith("x_live_"));

  const graphData = signals.slice(0, 5).map((sig) => ({
    name: sig.label.length > 15 ? sig.label.substring(0, 15) + "..." : sig.label,
    users: sig.unique_participant_count,
  }));

  const categoryCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });

  return (
    <main className="min-h-screen gradient-bg pb-12 relative z-10">
      <Header channelTitle="PULSE Command Center" isLive />

      <MonetizationTip pulseScore={pulseScore} isLive />

      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        
        <ContextSlider 
          activeGenre={activeGenre} 
          onGenreChange={handleGenreChange} 
          disabled={ending} 
        />

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (isXLiveStream) {
                const h = `@${stream?.external_id?.replace("x_live_", "").split("_")[0]}`;
                router.push(`/dashboard/twitter/channel?handle=${encodeURIComponent(h || "@sparshsharmai")}`);
              } else {
                router.push("/dashboard");
              }
            }}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            {isXLiveStream ? "Back to X Command Station" : "Back to Workspace"}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE STREAM RUNNING
            </div>
            
            {stream && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[var(--brand-light)] text-xs font-bold uppercase font-mono tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-bounce">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                {activeGenre === "coding" ? "CODING/EDUCATIONAL" : (activeGenre === "gaming" ? "GAMING/TECH" : "MIXED/GENERAL")} CONTEXT
              </div>
            )}

            {/* Manual End Session button hidden for X Live Streams (X manages it via Auto-End) */}
            {!isXLiveStream && (
              <button
                onClick={handleEndStream}
                disabled={ending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-400 text-zinc-400 text-xs font-semibold transition-colors font-mono"
              >
                <StopCircle className="w-3.5 h-3.5" />
                {ending ? "Ending..." : "End Session"}
              </button>
            )}
          </div>
        </div>

        {stream && (
          <div className="mt-2 mb-6">
            <StatsBar
              totalMessages={stream.total_messages}
              activeSignals={signals.length}
              uniqueUsers={stream.unique_participants}
            />
          </div>
        )}

        {pulseScore && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PulseScoreGauge
              score={pulseScore.score}
              state={pulseScore.state}
              label={pulseScore.label}
              color={pulseScore.color}
              reasons={pulseScore.reasons}
              size="md"
            />

            <div className="md:col-span-2 glass-panel rounded-3xl p-6 flex flex-col justify-center border-purple-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Live Health Breakdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(pulseScore.components || {}).map(([key, val]: any) => (
                  <div key={key} className="relative z-10">
                    <div className="flex justify-between text-[10px] mb-1.5 font-mono">
                      <span className="text-zinc-300 capitalize">{key.replace("_", " ")}</span>
                      <span className="text-zinc-400 font-bold">{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000 ease-out"
                        style={{ width: `${val * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {audienceData && (
          <div className="mb-6">
            <AudienceDNAPanel dna={audienceData.dna} moments={audienceData.moments} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col h-[400px] overflow-hidden shadow-md">
              <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200 font-mono">Raw Stream Feed</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {chatMessages.length} MSGS
                </span>
              </div>

              <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs text-center p-6 font-mono">
                    <Sparkles className="w-6 h-6 text-purple-500/40 mb-2 animate-pulse" /> Live broadcast active. Waiting for citizen chats.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={`${msg.message_id}-${idx}`}
                      className={`p-2 rounded-xl border transition-all ${
                        msg.isNew
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-zinc-950/60 border-zinc-800/60"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className={`font-semibold ${msg.isNew ? "text-blue-400" : "text-purple-400"}`}>
                          {msg.author_name}
                        </span>
                        <span className="text-zinc-600 font-mono text-[9px]">
                          {new Date(msg.published_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-xs font-mono">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <MultilingualInject 
              streamId={streamId} 
              onInjected={handleInjected} 
              genre={activeGenre}
            />
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="glass-panel p-5 rounded-3xl flex flex-col h-[200px] mb-2 border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-zinc-300 font-mono">Live Semantic Growth</h3>
                <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md font-mono uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> Liquid Render
                </span>
              </div>
              {graphData.length > 0 ? (
                <div className="flex-1 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graphData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa" }} />
                      <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "#71717a" }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#27272a", borderRadius: "8px", fontSize: "10px" }} />
                      <Bar dataKey="users" name="Unique Voices" radius={[4, 4, 0, 0]} animationDuration={2500}>
                        {graphData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx === 0 ? "#a855f7" : "#52525b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 font-mono">Awaiting momentum...</div>
              )}
            </div>

            <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} counts={categoryCounts} />

            {signals.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 p-12 text-center bg-zinc-900/10">
                <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-pulse" />
                <p className="text-zinc-400 text-sm mb-4 font-mono">Awaiting audience consensus...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signals.map((sig) => (
                  <SignalCard key={sig.id} signal={sig} onResolve={handleResolve} onDismiss={handleDismiss} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}