import { 
  STREAM_STATES, 
  STREAM_TIMEOUT, 
  TORRENT_INACTIVE_TIMEOUT,
  MAX_CLEANUP_RETRIES,
  RETRY_DELAY_MS,
  CLEANUP_INTERVAL,
  activeStreams,
  activeTorrents,
  cleanupAttempts
} from "../utils/constants.js";
import { hasActiveStreams } from "../utils/torrentUtils.js";

let cleanupTimer = null;

/**
 * Centralized, robust stream cleanup function
 * @param {string} streamId - Stream identifier
 * @param {string} reason - Reason for cleanup
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Cleanup result
 */
export const performStreamCleanup = async (streamId, reason = 'unknown', retryCount = 0) => {
  // Get current stream info
  const streamInfo = activeStreams.get(streamId);
  
  if (!streamInfo) {
    console.log(`Stream cleanup skipped - stream ${streamId} not found`);
    return { success: true, reason: 'not_found' };
  }
  
  // Check if already cleaned up or in process
  if (streamInfo.state === STREAM_STATES.CLEANED_UP) {
    console.log(`Stream cleanup skipped - ${streamId} already cleaned up`);
    return { success: true, reason: 'already_cleaned' };
  }
  
  if (streamInfo.state === STREAM_STATES.CLEANING_UP) {
    console.log(`Stream cleanup skipped - ${streamId} cleanup in progress`);
    return { success: false, reason: 'cleanup_in_progress' };
  }
  
  // Mark as cleaning up to prevent race conditions
  streamInfo.state = STREAM_STATES.CLEANING_UP;
  streamInfo.cleanupStartedAt = Date.now();
  streamInfo.cleanupReason = reason;
  
  console.log(`Starting stream cleanup: ${streamId} (reason: ${reason}, attempt: ${retryCount + 1})`);
  
  const errors = [];
  let success = true;
  
  try {
    // Step 1: Destroy the readable stream
    if (streamInfo.stream && typeof streamInfo.stream.destroy === 'function') {
      try {
        if (!streamInfo.stream.destroyed) {
          streamInfo.stream.destroy();
          console.log(`✓ Stream ${streamId} destroyed successfully`);
        }
      } catch (streamError) {
        const error = `Failed to destroy stream: ${streamError.message}`;
        errors.push(error);
        console.error(`✗ ${error}`);
        success = false;
      }
    }
    
    // Step 2: Clean up any timers or intervals
    if (streamInfo.activityTimer) {
      clearTimeout(streamInfo.activityTimer);
      streamInfo.activityTimer = null;
    }
    
    // Step 3: Remove event listeners
    if (streamInfo.eventListeners) {
      try {
        streamInfo.eventListeners.forEach(({ target, event, listener }) => {
          target.removeListener(event, listener);
        });
      } catch (listenerError) {
        const error = `Failed to remove listeners: ${listenerError.message}`;
        errors.push(error);
        console.error(`✗ ${error}`);
      }
    }
    
    // Step 4: Update stream state
    if (success) {
      streamInfo.state = STREAM_STATES.CLEANED_UP;
      streamInfo.cleanupCompletedAt = Date.now();
      streamInfo.cleanupDuration = streamInfo.cleanupCompletedAt - streamInfo.cleanupStartedAt;
    } else {
      streamInfo.state = STREAM_STATES.FAILED;
      streamInfo.cleanupErrors = errors;
    }
    
    // Step 5: Record cleanup attempt
    const attemptInfo = cleanupAttempts.get(streamId) || { attempts: 0, errors: [] };
    attemptInfo.attempts++;
    attemptInfo.lastAttempt = Date.now();
    attemptInfo.errors.push(...errors);
    cleanupAttempts.set(streamId, attemptInfo);
    
    if (success) {
      console.log(`✓ Stream cleanup completed: ${streamId} (${streamInfo.cleanupDuration}ms)`);
      
      // Remove from active streams after successful cleanup
      activeStreams.delete(streamId);
      cleanupAttempts.delete(streamId);
      
      return { success: true, reason, duration: streamInfo.cleanupDuration };
    }
    
  } catch (unexpectedError) {
    const error = `Unexpected cleanup error: ${unexpectedError.message}`;
    errors.push(error);
    console.error(`✗ ${error}`);
    success = false;
  }
  
  // Handle cleanup failure
  if (!success && retryCount < MAX_CLEANUP_RETRIES) {
    console.log(`Retrying cleanup for ${streamId} in ${RETRY_DELAY_MS}ms (attempt ${retryCount + 2})`);
    
    // Reset state for retry
    streamInfo.state = STREAM_STATES.CLEANUP_REQUESTED;
    
    setTimeout(() => {
      performStreamCleanup(streamId, `${reason}_retry`, retryCount + 1);
    }, RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
    
    return { success: false, reason: 'retrying', errors };
  }
  
  // Final failure after all retries
  console.error(`✗ Stream cleanup failed permanently: ${streamId} after ${retryCount + 1} attempts`);
  streamInfo.state = STREAM_STATES.FAILED;
  
  return { success: false, reason: 'permanent_failure', errors, attempts: retryCount + 1 };
};

/**
 * Clean up inactive streams using robust cleanup
 */
export const cleanupInactiveStreams = async () => {
  const now = Date.now();
  const streamsToCleanup = [];
  
  // Check each active stream for inactivity
  for (const [streamId, streamInfo] of activeStreams.entries()) {
    const timeSinceLastActivity = now - streamInfo.lastActivity;
    
    // Skip streams already being cleaned up
    if (streamInfo.state === STREAM_STATES.CLEANING_UP || streamInfo.state === STREAM_STATES.CLEANED_UP) {
      continue;
    }
    
    if (timeSinceLastActivity > STREAM_TIMEOUT) {
      console.log(`Marking inactive stream for cleanup: ${streamId} (inactive for ${Math.round(timeSinceLastActivity / 1000)}s)`);
      streamsToCleanup.push(streamId);
    }
  }
  
  // Perform robust cleanup for each inactive stream
  const cleanupResults = await Promise.allSettled(
    streamsToCleanup.map(streamId => 
      performStreamCleanup(streamId, 'timeout_inactive')
    )
  );
  
  const successfulCleanups = cleanupResults.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length;
  
  if (streamsToCleanup.length > 0) {
    console.log(`Cleaned up ${successfulCleanups}/${streamsToCleanup.length} inactive streams`);
  }
};

/**
 * Clean up inactive torrents
 */
export const cleanupInactiveTorrents = () => {
  const now = Date.now();
  const torrentsToRemove = [];
  
  // Check each torrent for inactivity
  for (const [torrentId, torrentData] of activeTorrents.entries()) {
    const timeSinceLastActivity = now - torrentData.metadata.lastAccessed;
    
    // Don't remove torrents that have active streams
    if (!hasActiveStreams(torrentId, activeStreams) && 
        timeSinceLastActivity > TORRENT_INACTIVE_TIMEOUT) {
      console.log(`Marking inactive torrent for removal: ${torrentId} (inactive for ${Math.round(timeSinceLastActivity / 1000)}s)`);
      torrentsToRemove.push(torrentId);
    }
  }
  
  // Remove inactive torrents
  torrentsToRemove.forEach(torrentId => {
    const torrentData = activeTorrents.get(torrentId);
    if (torrentData) {
      try {
        torrentData.torrent.destroy();
        activeTorrents.delete(torrentId);
      } catch (error) {
        console.error(`Error removing inactive torrent ${torrentId}:`, error);
      }
    }
  });
  
  if (torrentsToRemove.length > 0) {
    console.log(`Cleaned up ${torrentsToRemove.length} inactive torrents`);
  }
};

/**
 * Start the cleanup timer
 */
export const startCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }
  
  // Combined cleanup function
  const performCleanup = () => {
    cleanupInactiveStreams();
    cleanupInactiveTorrents();
  };
  
  cleanupTimer = setInterval(performCleanup, CLEANUP_INTERVAL);
  console.log(`Started cleanup timer (${CLEANUP_INTERVAL / 1000}s interval) - streams & torrents`);
};

/**
 * Stop the cleanup timer
 */
export const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('Stopped cleanup timer');
  }
};

/**
 * Get cleanup timer status
 */
export const isCleanupTimerRunning = () => {
  return cleanupTimer !== null;
};