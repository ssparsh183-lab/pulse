export interface User {
  id: string;
  email: string;
  name: string;
  picture_url?: string | null;
}

export interface Channel {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  custom_url?: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  uploads_playlist_id?: string;
}

export interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  scheduled_start?: string;
  actual_start?: string;
  life_cycle_status?: string;
  live_chat_id?: string;
  concurrent_viewers?: string | number;
}

export interface UpcomingStream {
  id: string;
  title: string;
  scheduled_start?: string;
  thumbnail_url?: string;
}

export interface PastVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  published_at: string;
  duration: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_live_vod?: boolean;
}

export interface WorkspaceData {
  user: User;
  channel: Channel;
  channels?: Channel[]; // <--- Yeh line add kar de bhai!
  live_now: LiveStream[];
  upcoming: UpcomingStream[];
  past_videos: PastVideo[];
  past_live_vods?: PastVideo[];
}

export type StreamStatus = "pending" | "live" | "ended" | "archived" | "failed";
export type StreamSource = "youtube_live" | "youtube_video" | "demo";

export interface Stream {
  id: string;
  source: StreamSource | string;
  external_id: string;
  title?: string | null;
  status: StreamStatus | string;
  total_messages: number;
  total_signals: number;
  unique_participants: number;
  genre?: string | null;            // <--- Added genre
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface StreamStartRequest {
  source: string;
  external_id: string;
  title?: string;
  genre?: string;                  // <--- Added genre
}


export type SignalState = "noise" | "emerging" | "rising" | "active" | "declining" | "resolved" | "re_emerging";
export type SignalCategory = "technical_issue" | "doubt" | "content_request" | "feedback" | "engagement" | "off_topic" | "unclassified";

export interface Signal {
  id: string;
  label: string;
  category?: SignalCategory | string | null;
  category_confidence?: number;
  state: SignalState | string;
  unique_participant_count: number;
  message_count: number;
  momentum?: number;
  priority?: number;
  reasons?: string[];
  representative_messages?: string[];
  first_seen_at?: string;
  last_seen_at?: string;
}

export interface LiveChatMessage {
  message_id: string;
  text: string;
  author_name: string;
  author_id: string;
  published_at: string;
}

export interface FetchChatResult {
  fetched: number;
  outcomes: Record<string, number>;
  next_page_token?: string;
  polling_interval_ms?: number;
  messages?: LiveChatMessage[];
}

export interface WSSignalsUpdate {
  type: "signals_update";
  stream_id: string;
  signal_count: number;
  signals: Signal[];
}

export interface VideoSummary {
  stream_id: string;
  video_id: string;
  status: string;
  total_comments: number;
  unique_commenters: number;
  total_signals: number;
  category_breakdown: Record<string, number>;
  top_signals: Array<{
    label: string;
    category?: string;
    unique_users: number;
    priority: number;
    sample_messages: string[];
  }>;
  analyzed_at?: string;
}

export interface VideoAnalyzeResult {
  stream_id: string;
  video_id: string;
  comments_fetched?: number;
  comments_processed: number;
  signals_created: number;
  signals_persisted?: number;
  unique_commenters?: number;
  outcomes?: Record<string, number>;
  message?: string;
}

export interface DemoResult {
  stream_id: string;
  messages_replayed: number;
  outcomes: Record<string, number>;
  final_signals: number;
  signals_persisted: number;
  unique_users: number;
}

export interface DemoPreview {
  dataset: string;
  total_messages: number;
  preview: Array<{
    user: string;
    text: string;
    offset_seconds?: number;
  }>;
}