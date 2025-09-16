import type { StreamInfo, TorrentMetadata } from '@types/index';

export const STREAM_TIMEOUT = process.env.NODE_ENV === 'test' ? 10 * 1000 : 30 * 60 * 1000;
export const CLEANUP_INTERVAL = process.env.NODE_ENV === 'test' ? 5 * 1000 : 5 * 60 * 1000;
export const MAX_CONCURRENT_TORRENTS = Number(process.env.MAX_TORRENTS || 50);
export const TORRENT_INACTIVE_TIMEOUT = 60 * 60 * 1000;
export const MAX_CLEANUP_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

export const STREAM_STATES = {
  CREATING: 'creating',
  ACTIVE: 'active',
  CLEANUP_REQUESTED: 'cleanup_requested',
  CLEANING_UP: 'cleaning_up',
  CLEANED_UP: 'cleaned_up',
  FAILED: 'failed',
} as const;

export type StreamStateKey = keyof typeof STREAM_STATES;

export const activeTorrents = new Map<string, { torrent: any; metadata: TorrentMetadata }>();
export const activeStreams = new Map<string, StreamInfo>();
export const cleanupAttempts = new Map<
  string,
  { attempts: number; lastAttempt?: number; errors: string[] }
>();
