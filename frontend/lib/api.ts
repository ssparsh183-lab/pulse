// frontend/lib/api.ts

import { API_BASE_URL, ENDPOINTS } from "./constants";
import { useAuthStore } from "@/store/auth";
import type {
  User,
  WorkspaceData,
  Stream,
  Signal,
  VideoSummary,
  DemoResult,
  DemoPreview,
  FetchChatResult,
  VideoAnalyzeResult,
  StreamStartRequest,
} from "@/types";

function getStoredToken(): string | null {
  const fromStore = useAuthStore.getState().token;
  if (fromStore) return fromStore;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pulse-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const tok = parsed?.state?.token;
    const usr = parsed?.state?.user;
    if (tok && usr) useAuthStore.getState().setAuth(usr, tok);
    return tok ?? null;
  } catch {
    return null;
  }
}

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    requireAuth = true,
    headers: customHeaders,
    query,
    timeoutMs = 120000, 
    ...fetchOptions
  } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  // 🔥 BYPASS NGROK FREE TIER WARNING PAGE (Add this line!)
  headers.set("ngrok-skip-browser-warning", "true");

  if (requireAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      throw new Error("No authentication token found. Please sign in.");
    }
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    const q = params.toString();
    if (q) url += `?${q}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let msg = `API Error ${response.status}`;
      try {
        const errBody = await response.json();
        msg = errBody.detail || errBody.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Server request timed out. Please retry.");
    }
    throw error;
  }
}

export interface InjectResponse {
  ok: boolean;
  outcome: string;
  similarity_score?: number | null;
  text: string;
  signal_count: number;
  signal: any | null;
}

export interface TelegramChannelItem {
  id: string;
  title: string;
  username?: string | null;
  members_count: number;
  is_creator: boolean;
  is_broadcast: boolean;
  unread_count: number;
}

export interface TelegramChannelsResponse {
  created: TelegramChannelItem[];
  joined: TelegramChannelItem[];
}

export const api = {
  getGoogleAuthUrl: () =>
    fetchApi<{ auth_url: string }>(ENDPOINTS.authGoogleUrl, {
      requireAuth: false,
    }),

  googleCallback: (code: string) =>
    fetchApi<{ access_token: string; token_type: string; user: User }>(
      ENDPOINTS.authGoogleCallback,
      {
        method: "POST",
        body: JSON.stringify({ code }),
        requireAuth: false,
      }
    ),

  getMe: () => fetchApi<User>(ENDPOINTS.authMe),

  getWorkspace: () =>
    fetchApi<WorkspaceData>(ENDPOINTS.workspace, { timeoutMs: 120000 }),

  listStreams: (status?: string) =>
    fetchApi<Stream[]>(ENDPOINTS.streams, { query: { status } }),

  getStream: (id: string, genre: string = "mixed") => 
    fetchApi<Stream>(ENDPOINTS.streamById(id), {
      query: { genre }
    }),

  startStream: (data: StreamStartRequest) =>
    fetchApi<Stream>(ENDPOINTS.streamStart, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  endStream: (id: string) =>
    fetchApi<{ status: string; stream_id: string }>(ENDPOINTS.streamEnd(id), {
      method: "POST",
    }),

  getStreamSignals: (id: string, category?: string, genre: string = "mixed") =>
    fetchApi<Signal[]>(ENDPOINTS.streamSignals(id), {
      query: { category, genre },
    }),

  fetchLiveChat: (id: string, liveChatId: string, pageToken?: string) =>
    fetchApi<FetchChatResult>(ENDPOINTS.streamFetchChat(id), {
      method: "POST",
      query: { live_chat_id: liveChatId, page_token: pageToken },
    }),

  resolveSignal: (streamId: string, signalId: string) =>
    fetchApi<any>(ENDPOINTS.resolveSignal(streamId, signalId), {
      method: "POST",
    }),

  dismissSignal: (streamId: string, signalId: string) =>
    fetchApi<any>(ENDPOINTS.dismissSignal(streamId, signalId), {
      method: "POST",
    }),

  injectMessage: (
    streamId: string,
    payload: {
      text: string;
      participant_name?: string;
      participant_id?: string;
    },
    genre: string = "mixed"
  ) =>
    fetchApi<InjectResponse>(ENDPOINTS.streamInject(streamId), {
      method: "POST",
      body: JSON.stringify(payload),
      query: { genre }
    }),

  analyzeVideo: (videoId: string, maxPages: number = 5) =>
    fetchApi<VideoAnalyzeResult>(ENDPOINTS.videoAnalyze(videoId), {
      method: "POST",
      query: { max_pages: maxPages },
      timeoutMs: 120000,
    }),

  getVideoSignals: (videoId: string, category?: string) =>
    fetchApi<Signal[]>(ENDPOINTS.videoSignals(videoId), {
      query: { category },
    }),

  getVideoSummary: (videoId: string) =>
    fetchApi<VideoSummary>(ENDPOINTS.videoSummary(videoId)),

  startDemo: (dataset: string = "demo_stream.jsonl", speed: number = 0, genre: string = "mixed") =>
    fetchApi<DemoResult>(ENDPOINTS.demoStart, {
      method: "POST",
      query: { dataset, speed, genre },
      timeoutMs: 120000,
    }),

  previewDemo: (dataset: string = "demo_stream.jsonl", limit: number = 10) =>
    fetchApi<DemoPreview>(ENDPOINTS.demoPreview, {
      requireAuth: false,
      query: { dataset, limit },
    }),

  getPulseScore: (streamId: string, genre: string = "mixed") =>
    fetchApi<any>(`/api/streams/${streamId}/score`, { query: { genre } }),

  getAudienceDNA: (streamId: string, genre: string = "mixed") =>
    fetchApi<any>(`/api/streams/${streamId}/audience`, { query: { genre } }),

  getTimeline: (streamId: string, genre: string = "mixed") =>
    fetchApi<any>(`/api/streams/${streamId}/timeline`, { query: { genre } }),

  getFullAnalysis: (streamId: string, genre: string = "mixed") =>
    fetchApi<any>(`/api/streams/${streamId}/full-analysis`, {
      query: { genre }
    }),

  getCovrtAutopsy: (targetUrl: string, genre: string = "mixed") =>
    fetchApi<any>("/api/intel/covert-autopsy", {
      query: { target: targetUrl, genre },
      timeoutMs: 120000,
    }),

  getExportUrl: (streamId: string) => {
    const token = getStoredToken();
    return `${API_BASE_URL}/api/streams/${streamId}/export?token=${token || ""}`;
  },

  sendTelegramCode: (phoneNumber: string) =>
    fetchApi<{ ok: boolean; phone_number: string; phone_code_hash: string; message: string }>(
      "/api/telegram/auth/send-code",
      {
        method: "POST",
        body: JSON.stringify({ phone_number: phoneNumber }),
      }
    ),

  verifyTelegramCode: (data: {
    phone_number: string;
    phone_code_hash: string;
    code: string;
    password?: string;
  }) =>
    fetchApi<{ ok: boolean; status: string; phone_number: string; message: string }>(
      "/api/telegram/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getTelegramChannels: () =>
    fetchApi<TelegramChannelsResponse>("/api/telegram/channels"),

  getTelegramChannelFeed: (channelId: string) =>
    fetchApi<any>(`/api/telegram/channel/${channelId}/feed`),

  disconnectTelegram: () =>
    fetchApi<any>("/api/telegram/auth/disconnect", { method: "POST" }),

  analyzeTelegramChannel: (channelId: string) => 
    fetchApi<any>(`/api/telegram/channel/${channelId}/analyze`),

  // 🔥 NEW: Spawns / Fetches Exact-Timeline Session Autopsy for Past Telegram Streams!
  getTelegramSessionAutopsy: (channelId: string, sessionMsgId: string) =>
    fetchApi<{ stream_id: string }>(`/api/telegram/channel/${channelId}/session/${sessionMsgId}/autopsy`, {
      method: "POST",
    }),

  // ==================== TWITTER / X API ====================
  getTwitterMe: () =>
    fetchApi<{ connected: boolean; handle?: string }>("/api/twitter/me"),

  disconnectTwitter: () =>
    fetchApi<any>("/api/twitter/auth/disconnect", { method: "POST" }),

  getTwitterAuthUrl: () =>
    fetchApi<{ auth_url: string }>("/api/twitter/auth/url"),

  twitterCallback: (code: string, state: string) =>
    fetchApi<any>("/api/twitter/auth/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    }),
  
  getTwitterHandles: () =>
    fetchApi<any[]>("/api/twitter/handles"),

  getTwitterHandleFeed: (handle: string) =>
    fetchApi<any>(`/api/twitter/handles/${encodeURIComponent(handle)}/feed`),

  getTwitterIncidents: (status?: string, handle?: string) =>
    fetchApi<any[]>("/api/twitter/incidents", { query: { status, handle } }),

  getTwitterTweetsStream: (handle: string) =>
    fetchApi<any[]>(`/api/twitter/handles/${encodeURIComponent(handle)}/tweets`),

  addressTwitterIncident: (incidentId: string, replyText: string, officerName?: string) =>
    fetchApi<any>(`/api/twitter/incidents/${incidentId}/address`, {
      method: "POST",
      body: JSON.stringify({ reply_text: replyText, officer_name: officerName }),
    }),

  resetTwitterDemo: () =>
    fetchApi<any>("/api/twitter/reset", { method: "POST" }),

  getTwitterPostAutopsy: (postId: string, handle?: string) =>
    fetchApi<any>(`/api/twitter/posts/${postId}/autopsy`, { query: { handle } }),

  startTwitterLiveSpace: (handle: string, title?: string) =>
    fetchApi<{ stream_id: string }>(`/api/twitter/handles/${encodeURIComponent(handle)}/live-session`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getTwitterSpaceAutopsy: (handle: string, sessionId: string, duration?: number) =>
    fetchApi<{ stream_id: string }>(`/api/twitter/handles/${encodeURIComponent(handle)}/session/${sessionId}/autopsy`, {
      method: "POST",
      query: { duration },
    }),

  injectTwitterReport: (data: {
    text: string;
    photo?: string | null;
    handle?: string;
    post_id?: string | null;
  }) =>
    fetchApi<any>("/api/twitter/inject", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ============================================================
  // 🔥 UNIVERSAL BULLETPROOF DOWNLOAD HELPER (Bypasses ngrok & browser shields)
  // ============================================================
  downloadFileFromEndpoint: async (endpoint: string, fallbackFilename: string) => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true", // Bypasses ngrok free tier
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!res.ok) {
      let msg = `Download failed (${res.status})`;
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const contentDisp = res.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisp.match(/filename=["']?([^"';]+)["']?/);
    const filename = filenameMatch ? filenameMatch[1] : fallbackFilename;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },

  // 1. YouTube & Live Stream Export
  downloadExport: async (streamId: string, genre: string = "mixed") => {
    await api.downloadFileFromEndpoint(
      `/api/streams/${streamId}/export?genre=${genre}`,
      `pulse_report_${streamId.slice(0, 8)}.html`
    );
  },

  // 2. Telegram Channel Autopsy Export
  downloadTelegramExport: async (channelId: string) => {
    await api.downloadFileFromEndpoint(
      `/api/telegram/channel/${channelId}/export`,
      `pulse_tg_autopsy_${channelId}.html`
    );
  },

  // 3. Twitter Incident Autopsy Export
  downloadTwitterReport: async (incidentId: string) => {
    await api.downloadFileFromEndpoint(
      `/api/twitter/incidents/${incidentId}/report`,
      `pulse_incident_autopsy_${incidentId}.html`
    );
  },
};