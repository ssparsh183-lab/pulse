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
    timeoutMs = 30000,
    ...fetchOptions
  } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

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
    fetchApi<WorkspaceData>(ENDPOINTS.workspace, { timeoutMs: 30000 }),

  listStreams: (status?: string) =>
    fetchApi<Stream[]>(ENDPOINTS.streams, { query: { status } }),

  getStream: (id: string) => fetchApi<Stream>(ENDPOINTS.streamById(id)),

  startStream: (data: StreamStartRequest) =>
    fetchApi<Stream>(ENDPOINTS.streamStart, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  endStream: (id: string) =>
    fetchApi<{ status: string; stream_id: string }>(ENDPOINTS.streamEnd(id), {
      method: "POST",
    }),

  getStreamSignals: (id: string, category?: string) =>
    fetchApi<Signal[]>(ENDPOINTS.streamSignals(id), {
      query: { category },
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
    }
  ) =>
    fetchApi<InjectResponse>(ENDPOINTS.streamInject(streamId), {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  analyzeVideo: (videoId: string, maxPages: number = 5) =>
    fetchApi<VideoAnalyzeResult>(ENDPOINTS.videoAnalyze(videoId), {
      method: "POST",
      query: { max_pages: maxPages },
      timeoutMs: 45000,
    }),

  getVideoSignals: (videoId: string, category?: string) =>
    fetchApi<Signal[]>(ENDPOINTS.videoSignals(videoId), {
      query: { category },
    }),

  getVideoSummary: (videoId: string) =>
    fetchApi<VideoSummary>(ENDPOINTS.videoSummary(videoId)),

  // ⚡ Demo Timeout Bumped to 60s for Heavy Ingestion
  startDemo: (dataset: string = "demo_stream.jsonl", speed: number = 0) =>
    fetchApi<DemoResult>(ENDPOINTS.demoStart, {
      method: "POST",
      query: { dataset, speed },
      timeoutMs: 60000,
    }),

  previewDemo: (dataset: string = "demo_stream.jsonl", limit: number = 10) =>
    fetchApi<DemoPreview>(ENDPOINTS.demoPreview, {
      requireAuth: false,
      query: { dataset, limit },
    }),

  getPulseScore: (streamId: string) =>
    fetchApi<any>(`/api/streams/${streamId}/score`),

  getAudienceDNA: (streamId: string) =>
    fetchApi<any>(`/api/streams/${streamId}/audience`),

  getTimeline: (streamId: string) =>
    fetchApi<any>(`/api/streams/${streamId}/timeline`),

  getFullAnalysis: (streamId: string) =>
    fetchApi<any>(`/api/streams/${streamId}/full-analysis`),

  getExportUrl: (streamId: string) => {
    const token = getStoredToken();
    return `${API_BASE_URL}/api/streams/${streamId}/export?token=${token || ""}`;
  },

  downloadExport: async (streamId: string) => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/api/streams/${streamId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const contentDisp = res.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisp.match(/filename=(.+)/);
    const filename = filenameMatch
      ? filenameMatch[1]
      : `pulse_report_${streamId.slice(0, 8)}.html`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};