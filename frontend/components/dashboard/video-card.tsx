"use client";

import { PlayCircle, MessageSquare, ThumbsUp, Eye, Clock, Sparkles, Download, FileText } from "lucide-react";
import type { PastVideo } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";

interface VideoCardProps {
  video: PastVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const formatDuration = (iso: string) => {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "0:00";
    const h = match[1] || "";
    const m = match[2] || "0";
    const s = (match[3] || "0").padStart(2, "0");
    return h ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await api.analyzeVideo(video.id, 3);
      toast.success(`Analyzed ${result.comments_processed} comments → ${result.signals_created} signals`);
      router.push(`/dashboard/analysis/${result.stream_id}`);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setDownloading(true);
    try {
      toast.info("Extracting comments & generating PDF Report...");
      const result = await api.analyzeVideo(video.id, 3);
      await api.downloadExport(result.stream_id);
      toast.success("PDF Autopsy Report Downloaded! 📄");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden cursor-pointer hover:border-purple-500/50 hover:bg-zinc-900/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10"
    >
      {loading && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
          <p className="text-xs text-zinc-300 font-mono">Analyzing comments...</p>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
        <img 
          src={video.thumbnail_url} 
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
        
        {/* Direct PDF Download Button on VOD Card */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="absolute top-2 right-2 z-20 p-2 bg-black/70 hover:bg-purple-600 backdrop-blur border border-white/10 text-white rounded-lg transition-colors shadow-lg"
          title="Download PDF Autopsy"
        >
          {downloading ? (
            <FileText className="w-3.5 h-3.5 animate-pulse text-purple-300" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg backdrop-blur-sm">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium font-mono backdrop-blur-md">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-purple-300 transition-colors">
          {video.title}
        </h3>
        
        <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatCount(video.view_count)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {formatCount(video.like_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {formatCount(video.comment_count)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          <Clock className="w-3 h-3" />
          {formatDate(video.published_at)}
        </div>
      </div>
    </div>
  );
}