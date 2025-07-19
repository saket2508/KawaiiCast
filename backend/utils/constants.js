// Configuration constants
export const STREAM_TIMEOUT = process.env.NODE_ENV === 'test' ? 10 * 1000 : 30 * 60 * 1000; // 10s for testing, 30min for production
export const CLEANUP_INTERVAL = process.env.NODE_ENV === 'test' ? 5 * 1000 : 5 * 60 * 1000; // 5s for testing, 5min for production
export const MAX_CONCURRENT_TORRENTS = process.env.MAX_TORRENTS || 50; // Maximum concurrent torrents
export const TORRENT_INACTIVE_TIMEOUT = 60 * 60 * 1000; // Remove inactive torrents after 1 hour

// Stream states for robust lifecycle management
export const STREAM_STATES = {
  CREATING: 'creating',
  ACTIVE: 'active', 
  CLEANUP_REQUESTED: 'cleanup_requested',
  CLEANING_UP: 'cleaning_up',
  CLEANED_UP: 'cleaned_up',
  FAILED: 'failed'
};

// Cleanup configuration
export const MAX_CLEANUP_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;

// Storage for active torrents and streams
export const activeTorrents = new Map(); // torrentId -> { torrent, metadata }
export const activeStreams = new Map(); // streamId -> stream info
export const cleanupAttempts = new Map(); // streamId -> { attempts, lastAttempt, errors }