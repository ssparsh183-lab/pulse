// frontend/app/dashboard/youtube/classified/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader } from "@/components/shared/loader";
import { ContextSlider } from "@/components/dashboard/context-slider";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { 
  Lock, ShieldAlert, Terminal, Search, ArrowLeft, 
  Sparkles, ShieldCheck, Cpu, Activity
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function ClassifiedIntelPage() {
  const router = useRouter();
  
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState("mixed");
  const [intelData, setIntelData] = useState<any>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === "sih2026_ntro") {
      setAuthenticated(true);
      toast.success("Security Clearance Granted. Welcome to NTRO Vault.");
    } else {
      toast.error("Access Denied: Invalid Security Passcode.");
    }
  };

  const executeAutopsy = async (genreToFetch = activeGenre) => {
    if (!targetUrl.trim()) {
      toast.error("Please enter a valid YouTube Target URL or ID.");
      return;
    }

    setLoading(true);
    try {
      toast.info(`Executing live multi-brain analysis under [${genreToFetch.toUpperCase()}] brain...`);
      const res = await api.getCovrtAutopsy(targetUrl.trim(), genreToFetch);
      setIntelData(res);
      toast.success("Real-Data Intelligence Compiled!");
    } catch (e: any) {
      toast.error(e?.message || "Intel extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenreSwitch = async (newGenre: string) => {
    setActiveGenre(newGenre);
    if (intelData && intelData.target_meta) {
      await executeAutopsy(newGenre);
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center p-6 relative z-10">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />
        <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-red-500/30 shadow-2xl relative z-20 bg-zinc-950/90">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-5 shadow-lg">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 text-center mb-1">Classified Intel Vault</h2>
          <p className="text-[11px] text-zinc-500 text-center font-mono mb-6 uppercase tracking-wider">NTRO / SIH-2026 Secured Terminal</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Security Passcode</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode (sih2026_ntro)..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-100 focus:outline-none focus:border-red-500 font-mono"
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2">
              <Terminal className="w-4 h-4" /> Authenticate & Access Terminal
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between">
            <button onClick={() => router.push("/dashboard/youtube")} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Workspace
            </button>
            <span className="text-[9px] text-zinc-600 font-mono">ENCRYPTED 256-BIT</span>
          </div>
        </div>
      </main>
    );
  }

  const meta = intelData?.target_meta;
  const metrics = intelData?.intel_metrics;
  const signals = intelData?.classified_signals || [];
  const categoryChartData = metrics?.category_distribution 
    ? Object.entries(metrics.category_distribution).map(([name, count]) => ({ name: name.replace("_", " "), count }))
    : [];

  return (
    <main className="min-h-screen gradient-bg pb-20 relative z-10 font-sans">
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard/youtube")} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Exit Vault
            </button>
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 text-xs font-bold font-mono">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> CLASSIFIED INTEL TERMINAL [ACTIVE]
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800 hidden md:block">
              RESTRICTED · REAL-DATA RECONNAISSANCE
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="glass-panel rounded-3xl p-6 border border-red-500/30 bg-gradient-to-br from-red-500/5 via-zinc-900/40 to-transparent mb-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-red-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Target Asset Reconnaissance Search</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") executeAutopsy(); }}
                placeholder="Paste YouTube Video URL, Short, or Live Stream ID..."
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <button onClick={() => executeAutopsy()} disabled={loading} className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-3.5 rounded-2xl text-xs font-bold shadow-lg disabled:opacity-50 shrink-0 flex items-center justify-center gap-2">
              {loading ? <>Analyzing Feed...</> : <><Cpu className="w-4 h-4" /> Execute Real-Data Autopsy</>}
            </button>
          </div>
        </div>

        {loading && <div className="py-20 flex justify-center"><Loader label="Ingesting public telemetry & running LaBSE vector models..." /></div>}

        {!loading && intelData && meta && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <div className="text-center mb-3"><span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Switch Context Brain to Re-Evaluate Real Data</span></div>
              <ContextSlider activeGenre={activeGenre} onGenreChange={handleGenreSwitch} disabled={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 aspect-video rounded-3xl overflow-hidden border border-zinc-800 bg-black shadow-2xl relative">
                <iframe src={`https://www.youtube.com/embed/${meta.video_id}?rel=0&modestbranding=1`} allowFullScreen className="w-full h-full border-0" />
              </div>

              <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Real-Data Telemetry</h3>
                    <span className="text-[9px] font-mono bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20 uppercase font-bold">Brain: {intelData.active_brain}</span>
                  </div>

                  <h2 className="text-base font-bold text-zinc-100 mb-4 line-clamp-2">{meta.title}</h2>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Extracted Comments / Chat</span>
                      <span className="text-xl font-bold text-zinc-100 font-mono">{metrics.total_analyzed_messages.toLocaleString()}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Unique Human Voices</span>
                      <span className="text-xl font-bold text-blue-400 font-mono">{metrics.unique_human_voices.toLocaleString()}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Bot / Off-Topic Ratio</span>
                      <span className="text-xl font-bold text-rose-400 font-mono">{metrics.bot_spam_ratio_percent}%</span>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Threat Velocity Index</span>
                      <span className="text-xl font-bold text-amber-400 font-mono">{metrics.threat_velocity_index} / 100</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span>Channel: {meta.channel_title}</span>
                  <span>Total Views: {meta.view_count?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Real Data Category Distribution Chart */}
            <div className="glass-panel rounded-3xl p-6 border border-zinc-800 bg-zinc-900/30">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> Real-Time Category Distribution (From Target Data)</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }} />
                    <Bar dataKey="count" name="Signals Count" radius={[4, 4, 0, 0]}>
                      {categoryChartData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? "#a855f7" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Extracted Signals */}
            <div>
              <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2 font-mono"><Sparkles className="w-4 h-4 text-purple-400" /> Extracted Real-Data Signals ({signals.length})</h3>
              {signals.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center text-zinc-500 text-xs font-mono">No significant signals extracted under this context brain.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {signals.map((sig: any) => (
                    <div key={sig.id} className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded uppercase font-bold border border-purple-500/20">{sig.category}</span>
                          <span className="text-xs font-mono text-zinc-400 font-semibold">{sig.unique_participants} unique voices</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 mb-2">{sig.label}</h4>
                        {sig.samples && sig.samples.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {sig.samples.map((msg: string, idx: number) => (
                              <div key={idx} className="text-[11px] text-zinc-400 bg-zinc-950/80 px-2.5 py-1 rounded-lg font-mono truncate">&quot;{msg}&quot;</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}