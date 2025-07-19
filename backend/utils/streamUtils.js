import { formatBytes, getStreamId } from "./helpers.js";
import { STREAM_STATES, STREAM_TIMEOUT } from "./constants.js";

/**
 * Helper function to safely add event listeners with tracking
 * @param {Object} streamInfo - Stream information object
 * @param {Object} target - Event target (stream, req, res)
 * @param {string} event - Event name
 * @param {Function} listener - Event listener function
 */
export const addTrackedEventListener = (streamInfo, target, event, listener) => {
  target.on(event, listener);
  streamInfo.eventListeners.push({ target, event, listener });
};

/**
 * Create enhanced stream information object
 * @param {string} torrentIdentifier - Torrent identifier
 * @param {number} fileIndex - File index
 * @param {Object} file - Torrent file object
 * @returns {Object} Stream information object
 */
export const createStreamInfo = (torrentIdentifier, fileIndex, file) => {
  return {
    torrentIdentifier,
    fileIndex,
    fileName: file.name,
    fileSize: file.length,
    startTime: Date.now(),
    lastActivity: Date.now(),
    stream: null,
    state: STREAM_STATES.CREATING,
    eventListeners: [],
    cleanupRequested: false,
    errors: [],
  };
};

/**
 * Create enhanced stream data for API responses
 * @param {string} streamId - Stream ID
 * @param {Object} streamInfo - Stream information
 * @param {number} now - Current timestamp
 * @returns {Object} Enhanced stream data
 */
export const formatStreamData = (streamId, streamInfo, now) => {
  return {
    id: streamId,
    torrentIdentifier: streamInfo.torrentIdentifier,
    fileIndex: streamInfo.fileIndex,
    fileName: streamInfo.fileName,
    fileSize: formatBytes(streamInfo.fileSize),
    startTime: streamInfo.startTime,
    duration: now - streamInfo.startTime,
    lastActivity: streamInfo.lastActivity,
    timeSinceLastActivity: now - streamInfo.lastActivity,
    isActive: (now - streamInfo.lastActivity) < STREAM_TIMEOUT,
    state: streamInfo.state,
    errors: streamInfo.errors || [],
    eventListenerCount: streamInfo.eventListeners?.length || 0,
    cleanupInfo: {
      requested: streamInfo.cleanupRequested,
      startedAt: streamInfo.cleanupStartedAt,
      reason: streamInfo.cleanupReason,
    },
  };
};

/**
 * Calculate cleanup statistics
 * @param {Map} cleanupAttempts - Map of cleanup attempts
 * @returns {Object} Cleanup statistics
 */
export const getCleanupStats = (cleanupAttempts) => {
  const totalAttempts = Array.from(cleanupAttempts.values())
    .reduce((sum, attempt) => sum + attempt.attempts, 0);
  
  return {
    totalAttempts,
    failedCleanups: cleanupAttempts.size,
    avgAttemptsPerCleanup: cleanupAttempts.size > 0 
      ? totalAttempts / cleanupAttempts.size 
      : 0,
  };
};

/**
 * Create activity tracking listener for streams
 * @param {string} streamId - Stream ID
 * @param {Map} activeStreams - Active streams map
 * @returns {Function} Data listener function
 */
export const createActivityTracker = (streamId, activeStreams) => {
  return () => {
    try {
      const currentStreamInfo = activeStreams.get(streamId);
      if (currentStreamInfo && currentStreamInfo.state === STREAM_STATES.ACTIVE) {
        currentStreamInfo.lastActivity = Date.now();
      }
    } catch (error) {
      console.error(`Error updating stream activity for ${streamId}:`, error);
    }
  };
};