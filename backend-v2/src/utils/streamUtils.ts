import { STREAM_STATES, STREAM_TIMEOUT } from "@utils/constants";
import { formatBytes } from "@utils/helpers";
import type { StreamInfo } from "../types/index";

export const addTrackedEventListener = (
  streamInfo: StreamInfo,
  target: any,
  event: string,
  listener: (...args: any[]) => void
) => {
  target.on(event, listener);
  streamInfo.eventListeners.push({ target, event, listener });
};

export const createStreamInfo = (
  torrentIdentifier: string,
  fileIndex: number,
  file: { name: string; length: number }
): StreamInfo => ({
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
});

export const formatStreamData = (
  streamId: string,
  streamInfo: StreamInfo,
  now: number
) => ({
  id: streamId,
  torrentIdentifier: streamInfo.torrentIdentifier,
  fileIndex: streamInfo.fileIndex,
  fileName: streamInfo.fileName,
  fileSize: formatBytes(streamInfo.fileSize),
  startTime: streamInfo.startTime,
  duration: now - streamInfo.startTime,
  lastActivity: streamInfo.lastActivity,
  timeSinceLastActivity: now - streamInfo.lastActivity,
  isActive: now - streamInfo.lastActivity < STREAM_TIMEOUT,
  state: streamInfo.state,
  errors: streamInfo.errors || [],
  eventListenerCount: streamInfo.eventListeners?.length || 0,
  cleanupInfo: {
    requested: streamInfo.cleanupRequested,
    startedAt: streamInfo.cleanupStartedAt,
    reason: streamInfo.cleanupReason,
  },
});

export const getCleanupStats = (
  attempts: Map<
    string,
    { attempts: number; lastAttempt?: number; errors: string[] }
  >
) => {
  const totalAttempts = Array.from(attempts.values()).reduce(
    (s, a) => s + a.attempts,
    0
  );
  return {
    totalAttempts,
    failedCleanups: attempts.size,
    avgAttemptsPerCleanup:
      attempts.size > 0 ? totalAttempts / attempts.size : 0,
  };
};

export const createActivityTracker = (
  streamId: string,
  activeStreams: Map<string, StreamInfo>
) => {
  return () => {
    try {
      const current = activeStreams.get(streamId);
      if (current && current.state === STREAM_STATES.ACTIVE)
        current.lastActivity = Date.now();
    } catch (err) {
      console.error(`Error updating stream activity for ${streamId}:`, err);
    }
  };
};
