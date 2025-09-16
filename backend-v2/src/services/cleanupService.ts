import {
  STREAM_STATES,
  STREAM_TIMEOUT,
  TORRENT_INACTIVE_TIMEOUT,
  MAX_CLEANUP_RETRIES,
  RETRY_DELAY_MS,
  CLEANUP_INTERVAL,
  activeStreams,
  activeTorrents,
  cleanupAttempts,
} from '@utils/constants';
import { hasActiveStreams } from '@utils/torrentUtils';

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const performStreamCleanup = async (
  streamId: string,
  reason: string = 'unknown',
  retryCount: number = 0,
): Promise<{ success: boolean; reason?: string; duration?: number; errors?: string[]; attempts?: number }> => {
  const streamInfo = activeStreams.get(streamId);
  if (!streamInfo) {
    console.log(`Stream cleanup skipped - stream ${streamId} not found`);
    return { success: true, reason: 'not_found' };
  }
  if (streamInfo.state === STREAM_STATES.CLEANED_UP) {
    console.log(`Stream cleanup skipped - ${streamId} already cleaned up`);
    return { success: true, reason: 'already_cleaned' };
  }
  if (streamInfo.state === STREAM_STATES.CLEANING_UP) {
    console.log(`Stream cleanup skipped - ${streamId} cleanup in progress`);
    return { success: false, reason: 'cleanup_in_progress' };
  }

  streamInfo.state = STREAM_STATES.CLEANING_UP;
  streamInfo.cleanupStartedAt = Date.now();
  streamInfo.cleanupReason = reason;
  console.log(`Starting stream cleanup: ${streamId} (reason: ${reason}, attempt: ${retryCount + 1})`);

  const errors: string[] = [];
  let success = true;

  try {
    if (streamInfo.stream && typeof (streamInfo.stream as any).destroy === 'function') {
      try {
        const s: any = streamInfo.stream;
        if (!s.destroyed) s.destroy();
        console.log(`✓ Stream ${streamId} destroyed successfully`);
      } catch (e: any) {
        const err = `Failed to destroy stream: ${e.message}`;
        errors.push(err);
        console.error(`✗ ${err}`);
        success = false;
      }
    }

    if ((streamInfo as any).activityTimer) {
      clearTimeout((streamInfo as any).activityTimer);
      (streamInfo as any).activityTimer = null;
    }

    if (streamInfo.eventListeners) {
      try {
        streamInfo.eventListeners.forEach(({ target, event, listener }) => {
          target.removeListener?.(event, listener);
          target.off?.(event, listener);
        });
      } catch (e: any) {
        const err = `Failed to remove listeners: ${e.message}`;
        errors.push(err);
        console.error(`✗ ${err}`);
      }
    }

    if (success) {
      streamInfo.state = STREAM_STATES.CLEANED_UP;
      streamInfo.cleanupCompletedAt = Date.now();
      streamInfo.cleanupDuration = streamInfo.cleanupCompletedAt - (streamInfo.cleanupStartedAt || streamInfo.startTime);
    } else {
      streamInfo.state = STREAM_STATES.FAILED;
      streamInfo.cleanupErrors = errors;
    }

    const attemptInfo = cleanupAttempts.get(streamId) || { attempts: 0, errors: [] as string[] };
    attemptInfo.attempts++;
    attemptInfo.lastAttempt = Date.now();
    attemptInfo.errors.push(...errors);
    cleanupAttempts.set(streamId, attemptInfo);

    if (success) {
      console.log(`✓ Stream cleanup completed: ${streamId} (${streamInfo.cleanupDuration}ms)`);
      activeStreams.delete(streamId);
      cleanupAttempts.delete(streamId);
      return { success: true, reason, duration: streamInfo.cleanupDuration };
    }
  } catch (e: any) {
    const err = `Unexpected cleanup error: ${e.message}`;
    errors.push(err);
    console.error(`✗ ${err}`);
    success = false;
  }

  if (!success && retryCount < MAX_CLEANUP_RETRIES) {
    console.log(`Retrying cleanup for ${streamId} in ${RETRY_DELAY_MS}ms (attempt ${retryCount + 2})`);
    streamInfo.state = STREAM_STATES.CLEANUP_REQUESTED;
    setTimeout(() => {
      performStreamCleanup(streamId, `${reason}_retry`, retryCount + 1);
    }, RETRY_DELAY_MS * (retryCount + 1));
    return { success: false, reason: 'retrying', errors };
  }

  console.error(`✗ Stream cleanup failed permanently: ${streamId} after ${retryCount + 1} attempts`);
  streamInfo.state = STREAM_STATES.FAILED;
  return { success: false, reason: 'permanent_failure', errors, attempts: retryCount + 1 };
};

export const cleanupInactiveStreams = async () => {
  const now = Date.now();
  const toCleanup: string[] = [];
  for (const [id, info] of activeStreams.entries()) {
    const idle = now - info.lastActivity;
    if (info.state === STREAM_STATES.CLEANING_UP || info.state === STREAM_STATES.CLEANED_UP) continue;
    if (idle > STREAM_TIMEOUT) toCleanup.push(id);
  }
  await Promise.allSettled(toCleanup.map((id) => performStreamCleanup(id, 'timeout_inactive')));
  if (toCleanup.length) console.log(`Cleaned up ${toCleanup.length} inactive streams`);
};

export const cleanupInactiveTorrents = () => {
  const now = Date.now();
  const toRemove: string[] = [];
  for (const [torrentId, torrentData] of activeTorrents.entries()) {
    const idle = now - torrentData.metadata.lastAccessed;
    if (!hasActiveStreams(torrentId, activeStreams) && idle > TORRENT_INACTIVE_TIMEOUT) toRemove.push(torrentId);
  }
  toRemove.forEach((id) => {
    const data = activeTorrents.get(id);
    if (!data) return;
    try {
      data.torrent.destroy();
      activeTorrents.delete(id);
    } catch (e) {
      console.error(`Error removing inactive torrent ${id}:`, e);
    }
  });
  if (toRemove.length) console.log(`Cleaned up ${toRemove.length} inactive torrents`);
};

export const startCleanupTimer = () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  const run = () => {
    cleanupInactiveStreams();
    cleanupInactiveTorrents();
  };
  cleanupTimer = setInterval(run, CLEANUP_INTERVAL);
  console.log(`Started cleanup timer (${CLEANUP_INTERVAL / 1000}s)`);
};

export const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('Stopped cleanup timer');
  }
};

export const isCleanupTimerRunning = () => cleanupTimer !== null;
