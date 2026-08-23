"use client";

import { PulseScoreGauge } from "@/components/analytics/pulse-score-gauge";
import { AudienceDNAPanel } from "@/components/analytics/audience-dna-panel";
import { MonetizationTip } from "@/components/analytics/monetization-tip";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Radio,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

interface ChatMsg {
  id: string;
  user: string;
  text: string;
  time: string;
  isNew?: boolean;
}

export default function DemoStreamPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuthStore();
  const ranOnce = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [booting, setBooting] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chatFeed, setChatFeed] = useState<ChatMsg[]>([]);

  const [pulseScore, setPulseScore] = useState<any>(null);
  const [audienceData, setAudienceData] = useState<any>(null);

  useEffect(() => {
    if (isHydrated && !token) router.replace("/");
  }, [isHydrated, token, router]);

  const handleRunDemo = useCallback(async () => {
    setDemoLoading(true);
    try {
      toast.info("Replaying demo through PULSE engine...");

      try {
        const preview = await api.previewDemo("demo_stream.jsonl", 50);
        const feed: ChatMsg[] = (preview.preview || []).map(
          (m: any, i: number) => ({
            id: `demo_${i}`,
            user: m.user || `user_${i}`,
            text: m.text || "",
            time: `${m.offset_seconds ?? i}s`,
          })
        );
        setChatFeed(feed);
      } catch {}

      const demoResult = await api.startDemo("demo_stream.jsonl", 0);
      const streamDetail = await api.getStream(demoResult.stream_id);
      setActiveStream(streamDetail);

      const sigs = await api.getStreamSignals(demoResult.stream_id);
      setSignals(sigs);

      try {
        const [score, dna] = await Promise.all([
          api.getPulseScore(demoResult.stream_id),
          api.getAudienceDNA(demoResult.stream_id),
        ]);
        setPulseScore(score);
        setAudienceData(dna);
      } catch (e) {
        console.error("Analytics fetch failed", e);
      }

      toast.success(
        `${demoResult.messages_replayed} msgs → ${demoResult.final_signals} signals 🔥`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Demo failed");
    } finally {
      setDemoLoading(false);
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (!token || ranOnce.current) return;
    ranOnce.current = true;
    handleRunDemo();
  }, [token, handleRunDemo]);

  const fetchSignals = useCallback(async () => {
    if (!activeStream) return;
    try {
      const [sigs, score, dna] = await Promise.all([
        api.getStreamSignals(activeStream.id, selectedCategory || undefined),
        api.getPulseScore(activeStream.id).catch(() => null),
        api.getAudienceDNA(activeStream.id).catch(() => null),
      ]);
      setSignals(sigs);
      if (score) setPulseScore(score);
      if (dna) setAudienceData(dna);
    } catch (e) {
      console.error(e);
    }
  }, [activeStream, selectedCategory]);

  useEffect(() => {
    if (activeStream) fetchSignals();
  }, [activeStream, selectedCategory, fetchSignals]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatFeed]);

  const handleResolve = async (sigId: string) => {
    if (!activeStream) return;
    try {
      await api.resolveSignal(activeStream.id, sigId);
      toast.success("Resolved ✓");
      fetchSignals();
    } catch {
      toast.error("Resolve failed");
    }
  };

  const handleDismiss = async (sigId: string) => {
    if (!activeStream) return;
    try {
      await api.dismissSignal(activeStream.id, sigId);
      toast.info("Dismissed");
      fetchSignals();
    } catch {
      toast.error("Dismiss failed");
    }
  };

  const handleInjected = async (text: string) => {
    setChatFeed((prev) => [
      ...prev,
      {
        id: `inj_${Date.now()}`,
        user: "judge_demo",
        text: text,
        time: "Live",
        isNew: true,
      },
    ]);
    if (activeStream) {
      fetchSignals();
      setActiveStream((prev) =>
        prev ? { ...prev, total_messages: prev.total_messages + 1 } : prev
      );
    }
  };

  if (!isHydrated || booting) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Running demo through PULSE engine..." />
      </main>
    );
  }

  const categoryCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.category)
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });

  return (
    <main className="min-h-screen gradient-bg pb-12">
      <Header
        channelTitle="Demo Stream"
        isLive={!!activeStream}
        onRunDemo={handleRunDemo}
        demoLoading={demoLoading}
      />

      {/* 💰 MONETIZATION POPUP (works in demo since it's treated as live) */}
      <MonetizationTip pulseScore={pulseScore} isLive={!!activeStream} />

      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workspace
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5" />
            DEMO REPLAY
          </div>
        </div>

        {activeStream && (
          <div className="mt-2 mb-6">
            <StatsBar
              totalMessages={activeStream.total_messages}
              activeSignals={signals.length}
              uniqueUsers={activeStream.unique_participants}
            />
          </div>
        )}

        {pulseScore && activeStream && (
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
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Live Health Breakdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(pulseScore.components || {}).map(
                  ([key, val]: any) => (
                    <div key={key} className="relative z-10">
                      <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-zinc-300 capitalize">
                          {key.replace("_", " ")}
                        </span>
                        <span className="text-zinc-400 font-mono font-bold">
                          {(val * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000 ease-out"
                          style={{ width: `${val * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {audienceData && (
          <div className="mb-6">
            <AudienceDNAPanel
              dna={audienceData.dna}
              moments={audienceData.moments}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col h-[320px] overflow-hidden shadow-md">
              <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">
                    Raw Chat Feed
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {chatFeed.length} MSGS
                </span>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 p-3 overflow-y-auto space-y-2"
              >
                {chatFeed.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs text-center p-6">
                    <Sparkles className="w-6 h-6 text-purple-500/40 mb-2" />
                    Chat loads with demo replay
                  </div>
                ) : (
                  chatFeed.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded-xl border transition-all ${
                        msg.isNew
                          ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "bg-zinc-950/60 border-zinc-800/60"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span
                          className={`font-semibold ${
                            msg.isNew ? "text-blue-400" : "text-purple-400"
                          }`}
                        >
                          {msg.user}
                        </span>
                        <span className="text-zinc-600">{msg.time}</span>
                      </div>
                      <p className="text-zinc-200 text-xs">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <MultilingualInject
              streamId={activeStream?.id || null}
              onInjected={handleInjected}
              disabled={demoLoading || !activeStream}
            />
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">PULSE Signals</h2>
              {activeStream && (
                <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
                  {activeStream.external_id}
                </span>
              )}
            </div>

            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              counts={categoryCounts}
            />

            {signals.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 p-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm mb-4">No signals yet</p>
                <button
                  onClick={handleRunDemo}
                  disabled={demoLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold"
                >
                  <PlayCircle className="w-4 h-4" /> Run Demo Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signals.map((sig) => (
                  <SignalCard
                    key={sig.id}
                    signal={sig}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}