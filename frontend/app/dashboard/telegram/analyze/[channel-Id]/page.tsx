// frontend/app/dashboard/telegram/analyze/[channelId]/page.tsx

"use client";

import { useEffect, useState, useMemo} from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader } from "@/components/shared/loader";
import { 
  ArrowLeft, Download, Activity, 
  FileText, Video, Image as ImageIcon, MessageSquare, ShieldCheck, Sparkles, Lock, Unlock, Users, Link2,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

export default function TelegramAnalyzePage() {
  const params = useParams();
  const router = useRouter();
  
  const channelId = useMemo(() => {
    if (params?.channelId) return String(params.channelId);
    if (params?.["channel-Id"]) return String(params["channel-Id"]);
    if (params?.id) return String(params.id);
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || "";
    }
    return "";
  }, [params]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!channelId || channelId === "undefined") return;

    setLoading(true);
    api.analyzeTelegramChannel(channelId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Telemetry compile failed.");
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  const handleDownloadPDF = async () => {
    if (!channelId) return;
    setExporting(true);
    try {
      toast.info("Compiling Telegram Channel PDF Autopsy...");
      await api.downloadTelegramExport(channelId);
      toast.success("Autopsy Report Downloaded! 📄");
    } catch {
      toast.error("Download failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Compiling Deep Telegram Telemetry..." />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center text-zinc-500 font-mono">
        Channel Telemetry unavailable for target node.
      </main>
    );
  }

  const { channel, score, telemetry, top_signals, admin_depth } = data;

  const mediaPieData = [
    { name: "Videos", value: telemetry.media_breakdown.video, color: "#a855f7" },
    { name: "PDFs / Docs", value: telemetry.media_breakdown.document, color: "#38bdf8" },
    { name: "Photos", value: telemetry.media_breakdown.photo, color: "#34d399" },
    { name: "Text Posts", value: telemetry.media_breakdown.text, color: "#71717a" },
  ].filter(d => d.value > 0);

  const categoryBarData = Object.entries(telemetry.category_distribution || {}).map(([cat, val]) => ({
    name: cat.replace("_", " "),
    count: val as number,
  }));

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <button 
              onClick={() => router.back()} 
              className="text-zinc-400 hover:text-zinc-200 text-xs font-mono flex items-center gap-1.5 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5"/> Back to Channel
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">{channel.title}</h1>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${channel.is_admin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'}`}>
                {channel.is_admin ? "🛡️ OWNED / ADMIN" : "👀 JOINED FEED"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {channel.username} · {channel.subscribers?.toLocaleString() || 0} Subscribers · Sampled {telemetry.total_analyzed_posts} Posts
            </p>
          </div>

          <button 
            onClick={handleDownloadPDF} 
            disabled={exporting}
            className="px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            {exporting ? (
              <><Activity className="w-4 h-4 animate-spin" /> Compiling...</>
            ) : (
              <><Download className="w-4 h-4" /> Export Channel Autopsy (.pdf)</>
            )}
          </button>
        </div>

        {/* 🛡️ ADMIN COMMAND DECK (Rendered ONLY if user is Creator/Admin) */}
        {channel.is_admin && admin_depth && (
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-900/40 to-transparent mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">
                  Admin Command Deck & Channel Governance
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 font-bold">
                {admin_depth.channel_visibility}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Administrators</span>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-amber-400"/> {admin_depth.administrators_count} Active</span>
              </div>
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Invite Links</span>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-sky-400"/> {admin_depth.active_invite_links} Active Link</span>
              </div>
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Broadcast Cadence</span>
                <span className="text-sm font-bold text-purple-400">{admin_depth.broadcast_cadence}</span>
              </div>
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Forward Conversion</span>
                <span className="text-sm font-bold text-emerald-400">{admin_depth.forward_conversion}</span>
              </div>
            </div>

            <div className="text-xs text-amber-200/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-mono flex items-center justify-between">
              <span>💡 <strong>AI Governance Recommendation:</strong> {admin_depth.recommended_action}</span>
            </div>
          </div>
        )}

        {/* 4 Impactful Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 rounded-3xl border border-sky-500/20 bg-zinc-900/40">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest block mb-1">Total Reach</span>
            <div className="text-2xl font-bold text-zinc-100 font-mono">{telemetry.total_views.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">~{telemetry.avg_views_per_post.toLocaleString()} views / post</p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 bg-zinc-900/40">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest block mb-1">Viral Velocity</span>
            <div className="text-2xl font-bold text-purple-400 font-mono">{telemetry.virality_multiplier}</div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">{telemetry.total_forwards.toLocaleString()} total forwards</p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-zinc-900/40">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest block mb-1">Pulse Score</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{score.score} / 100</div>
            <p className="text-[10px] text-emerald-400/80 mt-1 font-mono font-semibold">{score.label}</p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-pink-500/20 bg-zinc-900/40">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest block mb-1">Total Comments</span>
            <div className="text-2xl font-bold text-pink-400 font-mono">{telemetry.total_comments.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Active discussions</p>
          </div>
        </div>

        {/* 2-Column Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Left: Media Composition Breakdown */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-1">Media Composition</h3>
              <p className="text-[10px] text-zinc-500 font-mono mb-4">Content assets across sampled broadcasts</p>
            </div>

            <div className="h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mediaPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                    {mediaPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-800/60 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-purple-400"><Video className="w-3.5 h-3.5"/> <span>{telemetry.media_breakdown.video} Videos</span></div>
              <div className="flex items-center gap-2 text-sky-400"><FileText className="w-3.5 h-3.5"/> <span>{telemetry.media_breakdown.document} PDFs</span></div>
              <div className="flex items-center gap-2 text-emerald-400"><ImageIcon className="w-3.5 h-3.5"/> <span>{telemetry.media_breakdown.photo} Photos</span></div>
              <div className="flex items-center gap-2 text-zinc-400"><MessageSquare className="w-3.5 h-3.5"/> <span>{telemetry.media_breakdown.text} Text</span></div>
            </div>
          </div>

          {/* Right: Semantic Topic Distribution */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-1">Semantic Topics Spectrum</h3>
              <p className="text-[10px] text-zinc-500 font-mono mb-4">PULSE LaBSE classification distribution</p>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                    {categoryBarData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? "#38bdf8" : "#a855f7"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Extracted Thematic Signals Grid */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> High-Impact Signals & Vectors ({top_signals.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {top_signals.map((sig: any, idx: number) => (
              <div key={idx} className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20 uppercase font-bold">
                      {sig.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {sig.count} Broadcasts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 mb-2">{sig.label}</h4>
                  <p className="text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 mb-3 truncate">
                    &quot;{sig.sample}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                  <span>Reach: <strong className="text-zinc-300">{sig.views.toLocaleString()}</strong></span>
                  <span>Forwards: <strong className="text-emerald-400">{sig.forwards.toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}