export type StreamState =
  | 'creating'
  | 'active'
  | 'cleanup_requested'
  | 'cleaning_up'
  | 'cleaned_up'
  | 'failed';

export interface TorrentMetadata {
  torrentId: string;
  addedAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface StreamInfo {
  torrentIdentifier: string;
  fileIndex: number;
  fileName: string;
  fileSize: number;
  startTime: number;
  lastActivity: number;
  stream: NodeJS.ReadableStream | null;
  state: StreamState;
  eventListeners: Array<{ target: any; event: string; listener: (...args: any[]) => void }>;
  cleanupRequested: boolean;
  errors: Array<{ type: string; error: string; timestamp: number }>;
  cleanupStartedAt?: number;
  cleanupCompletedAt?: number;
  cleanupDuration?: number;
  cleanupErrors?: string[];
  cleanupReason?: string;
}

export interface TorrentFileInfo {
  index: number;
  name: string;
  size: number;
  path: string;
  isVideo: boolean;
  isAudio: boolean;
  isSubtitle: boolean;
  isPlayable: boolean;
}

export interface EmbeddedSubInfo {
  streamIndex: number;
  codec?: string;
  language?: string;
  title?: string;
}

