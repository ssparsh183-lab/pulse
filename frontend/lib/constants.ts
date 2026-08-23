// ============================================================
// PULSE — Frontend Constants
// ============================================================

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// ---------- CATEGORIES ----------
export interface CategoryMeta {
  label: string;
  icon: string;
  accent: string;
  bg: string;
  border: string;
  glow: string;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  technical_issue: {
    label: "Technical Issue",
    icon: "⚠️",
    accent: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/20",
  },
  doubt: {
    label: "Doubt",
    icon: "❓",
    accent: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
  },
  content_request: {
    label: "Content Request",
    icon: "📚",
    accent: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    glow: "shadow-sky-500/20",
  },
  feedback: {
    label: "Feedback",
    icon: "💬",
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/20",
  },
  engagement: {
    label: "Engagement",
    icon: "🙋",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
  },
  off_topic: {
    label: "Off-Topic",
    icon: "💭",
    accent: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    glow: "shadow-zinc-500/10",
  },
  unclassified: {
    label: "Unclassified",
    icon: "❔",
    accent: "text-zinc-500",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    glow: "shadow-zinc-500/10",
  },
};

// ---------- SIGNAL STATES ----------
export interface StateMeta {
  label: string;
  icon: string;
  color: string;
  pulseAnim: boolean;
}

export const SIGNAL_STATES: Record<string, StateMeta> = {
  noise: { label: "Noise", icon: "·", color: "text-zinc-600", pulseAnim: false },
  emerging: { label: "Emerging", icon: "🌱", color: "text-zinc-300", pulseAnim: false },
  rising: { label: "Rising", icon: "↑", color: "text-rose-400", pulseAnim: true },
  active: { label: "Active", icon: "●", color: "text-blue-400", pulseAnim: false },
  declining: { label: "Declining", icon: "↓", color: "text-zinc-500", pulseAnim: false },
  resolved: { label: "Resolved", icon: "✓", color: "text-emerald-400", pulseAnim: false },
  re_emerging: { label: "Re-Emerging", icon: "↺", color: "text-orange-400", pulseAnim: true },
};

// ---------- PRIORITY BUCKETS ----------
export function getPriorityBucket(priority: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (priority >= 0.6)
    return {
      label: "HIGH",
      color: "text-rose-300",
      bg: "bg-rose-500/20 border-rose-500/40",
    };
  if (priority >= 0.35)
    return {
      label: "MED",
      color: "text-amber-300",
      bg: "bg-amber-500/20 border-amber-500/40",
    };
  return {
    label: "LOW",
    color: "text-zinc-400",
    bg: "bg-zinc-500/20 border-zinc-500/40",
  };
}

// ---------- SUPPORTED LANGUAGES (UI proof strip) ----------
export const SUPPORTED_LANGUAGES = [
  { code: "EN", flag: "🇬🇧", name: "English" },
  { code: "HI", flag: "🇮🇳", name: "Hindi / Hinglish" },
  { code: "ES", flag: "🇪🇸", name: "Spanish" },
  { code: "FR", flag: "🇫🇷", name: "French" },
  { code: "ZH", flag: "🇨🇳", name: "Chinese" },
  { code: "DE", flag: "🇩🇪", name: "German" },
  { code: "JA", flag: "🇯🇵", name: "Japanese" },
  { code: "AR", flag: "🇸🇦", name: "Arabic" },
];

// ---------- API ENDPOINTS ----------
export const ENDPOINTS = {
  authGoogleUrl: "/api/auth/google/url",
  authGoogleCallback: "/api/auth/google/callback",
  authMe: "/api/auth/me",
  workspace: "/api/workspace/",
  streams: "/api/streams",
  streamById: (id: string) => `/api/streams/${id}`,
  streamStart: "/api/streams/start",
  streamEnd: (id: string) => `/api/streams/${id}/end`,
  streamSignals: (id: string) => `/api/streams/${id}/signals`,
  streamFetchChat: (id: string) => `/api/streams/${id}/fetch-chat`,
  streamInject: (id: string) => `/api/streams/${id}/inject`,
  resolveSignal: (streamId: string, sigId: string) =>
    `/api/streams/${streamId}/signals/${sigId}/resolve`,
  dismissSignal: (streamId: string, sigId: string) =>
    `/api/streams/${streamId}/signals/${sigId}/dismiss`,
  videoAnalyze: (id: string) => `/api/videos/${id}/analyze`,
  videoSignals: (id: string) => `/api/videos/${id}/signals`,
  videoSummary: (id: string) => `/api/videos/${id}/summary`,
  demoStart: "/api/demo/start",
  demoPreview: "/api/demo/preview",
  wsStream: (id: string, token: string) =>
    `${WS_BASE_URL}/ws/streams/${id}?token=${token}`,
};