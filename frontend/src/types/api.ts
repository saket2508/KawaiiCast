// API Types for Anime Streaming App
// These match exactly with backend/services/anilistService.js and torrentService.js

export interface Anime {
  id: number;
  anilistId: number;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  titleNative?: string;
  description?: string;
  coverImage?: string;
  bannerImage?: string;
  episodes?: number;
  status:
    | "FINISHED"
    | "RELEASING"
    | "NOT_YET_RELEASED"
    | "CANCELLED"
    | "HIATUS";
  year?: number;
  genres?: string;
  score?: number;
  format?: "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";
  duration?: number;
  studios?: string;
  characters?: Character[];
  relations?: AnimeRelation[];
}

export interface Character {
  name: string;
  image?: string;
}

export interface AnimeRelation {
  id: number;
  title: string;
  coverImage?: string;
  type: string;
  format?: string;
}

export interface SearchResponse {
  results: Anime[];
  pageInfo: {
    hasNextPage: boolean;
    currentPage: number;
    lastPage: number;
  };
}

export interface Episode {
  id?: number;
  animeId?: number;
  number: number;
  episodeNumber?: number;
  title: string;
  airDate?: string;
  watched?: boolean;
  watchedAt?: string;
  torrents: EpisodeTorrent[];
  hasTorrents: boolean;
}

export interface EpisodeTorrent {
  title: string;
  magnet: string;
  size: number;
  sizeText: string;
  seeders: number;
  quality: string;
  releaseGroup: string;
  episodeNumber: number;
}

export interface Torrent {
  id?: string;
  title: string;
  magnet?: string;
  infoHash?: string;
  link?: string;
  size: number;
  sizeText: string;
  seeders: number;
  leechers: number;
  publishDate: Date;
  episodeNumber?: number;
  quality: string; // "1080p", "720p", "480p", "Unknown"
  releaseGroup: string; // "SubsPlease", "Erai-raws", etc.
}

export interface TorrentInfo {
  name: string;
  infoHash: string;
  length: number;
  files: TorrentFile[];
  ready: boolean;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  ratio: number;
}

export interface TorrentFile {
  name: string;
  length: number;
  path: string;
  type: "video" | "audio" | "subtitle" | "other";
}

export interface StreamInfo {
  id: string;
  magnet: string;
  fileIndex: number;
  fileName: string;
  streamUrl: string;
  torrentInfo: TorrentInfo;
  startedAt: string;
  animeId?: number;
  episodeNumber?: number;
  isOptimistic?: boolean; // For optimistic updates
  mutationId?: number; // For race condition handling
}

export interface WatchHistory {
  id: number;
  sessionId: string;
  animeId: number;
  episodeNumber: number;
  watchedAt: string;
  progress?: number; // Watch progress percentage
  currentTime?: number; // Current playback time in seconds
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filter types
export interface TorrentFilters {
  quality?: string[];
  releaseGroup?: string[];
  minSeeders?: number;
  maxSize?: number; // in bytes
  episodeNumber?: number;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  progress?: number;
}

export interface AnimeCardVariant {
  size: "small" | "medium" | "large";
  layout: "grid" | "list";
  showMetadata: boolean;
  showProgress?: boolean;
}

// Theme and preferences
export interface UserPreferences {
  theme: "dark" | "light" | "auto";
  language: "en" | "jp";
  autoplay: boolean;
  quality: "auto" | "1080p" | "720p" | "480p";
  preferredReleaseGroups: string[];
  subtitles: boolean;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface TorrentError extends ApiError {
  magnet?: string;
  torrentId?: string;
  type: "NETWORK" | "PARSE" | "TIMEOUT" | "NOT_FOUND" | "PERMISSION";
}

// Form types
export interface SearchFormData {
  query: string;
}

export interface StreamStartData {
  magnet: string;
  fileIndex: number;
  animeId?: number;
  episodeNumber?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// Utility types
export type AnimeStatus = Anime["status"];
export type AnimeFormat = Anime["format"];
export type TorrentQuality = "1080p" | "720p" | "480p" | "Unknown";
export type FileType = TorrentFile["type"];

// Type guards
export const isAnime = (obj: unknown): obj is Anime => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "title" in obj &&
    typeof (obj as Record<string, unknown>).id === "number" &&
    typeof (obj as Record<string, unknown>).title === "string"
  );
};

export const isTorrent = (obj: unknown): obj is Torrent => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "title" in obj &&
    "seeders" in obj &&
    typeof (obj as Record<string, unknown>).title === "string" &&
    typeof (obj as Record<string, unknown>).seeders === "number"
  );
};

export const isVideoFile = (file: TorrentFile): boolean => {
  return (
    file.type === "video" ||
    /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i.test(file.name)
  );
};

// Constants
export const ANIME_STATUSES: AnimeStatus[] = [
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "CANCELLED",
  "HIATUS",
];

export const ANIME_FORMATS: AnimeFormat[] = [
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "MUSIC",
];

export const TORRENT_QUALITIES: TorrentQuality[] = [
  "1080p",
  "720p",
  "480p",
  "Unknown",
];

export const POPULAR_RELEASE_GROUPS = [
  "SubsPlease",
  "Erai-raws",
  "HorribleSubs",
  "EMBER",
  "Judas",
];
