import rangeParser from "range-parser";
import mime from "mime-types";
import { 
  STREAM_STATES, 
  STREAM_TIMEOUT, 
  CLEANUP_INTERVAL,
  activeStreams,
  cleanupAttempts
} from "../utils/constants.js";
import { 
  addTrackedEventListener, 
  createStreamInfo, 
  formatStreamData, 
  getCleanupStats,
  createActivityTracker 
} from "../utils/streamUtils.js";
import { getStreamId } from "../utils/helpers.js";
import { performStreamCleanup, isCleanupTimerRunning } from "./cleanupService.js";

/**
 * Create and start a video stream
 * @param {Object} params - Stream parameters
 * @param {string} params.torrentIdentifier - Torrent identifier
 * @param {number} params.fileIndex - File index
 * @param {Object} params.file - Torrent file object
 * @param {Object} params.req - Express request object
 * @param {Object} params.res - Express response object
 * @returns {Promise<void>}
 */
export const createVideoStream = async ({ torrentIdentifier, fileIndex, file, req, res }) => {
  const streamId = getStreamId(torrentIdentifier, fileIndex);
  
  // Create enhanced stream info
  const streamInfo = createStreamInfo(torrentIdentifier, fileIndex, file);
  activeStreams.set(streamId, streamInfo);
  
  try {
    // Handle range requests
    const range = req.headers.range;
    const fileSize = file.length;
    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const ranges = rangeParser(fileSize, range);
      if (ranges && ranges.length > 0 && ranges.type === "bytes") {
        start = ranges[0].start;
        end = ranges[0].end;
      }
    }

    // Set headers
    const mimeType = mime.lookup(file.name) || "application/octet-stream";
    const headers = {
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (range) {
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
      res.status(206);
    } else {
      res.status(200);
    }

    res.set(headers);

    // Create stream with error handling
    const stream = file.createReadStream({ start, end });
    
    // Store the stream reference and mark as active
    streamInfo.stream = stream;
    streamInfo.state = STREAM_STATES.ACTIVE;
    
    // Create event listeners
    const dataListener = createActivityTracker(streamId, activeStreams);
    
    const streamErrorListener = async (err) => {
      console.error(`Stream error for ${streamId}:`, err);
      streamInfo.errors.push({ type: 'stream_error', error: err.message, timestamp: Date.now() });
      
      await performStreamCleanup(streamId, 'stream_error');
      
      if (!res.headersSent) {
        try {
          res.status(500).json({ error: "Stream error", details: err.message });
        } catch (responseError) {
          console.error(`Error sending error response for ${streamId}:`, responseError);
        }
      }
    };
    
    const requestCloseListener = async () => {
      console.log(`Client disconnected for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'client_disconnect');
    };
    
    const requestAbortListener = async () => {
      console.log(`Request aborted for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'request_aborted');
    };
    
    const responseFinishListener = async () => {
      console.log(`Response finished for stream: ${streamId}`);
      await performStreamCleanup(streamId, 'response_finished');
    };
    
    const responseErrorListener = async (err) => {
      console.error(`Response error for ${streamId}:`, err);
      streamInfo.errors.push({ type: 'response_error', error: err.message, timestamp: Date.now() });
      await performStreamCleanup(streamId, 'response_error');
    };
    
    // Add all event listeners with tracking
    addTrackedEventListener(streamInfo, stream, 'data', dataListener);
    addTrackedEventListener(streamInfo, stream, 'error', streamErrorListener);
    addTrackedEventListener(streamInfo, req, 'close', requestCloseListener);
    addTrackedEventListener(streamInfo, req, 'aborted', requestAbortListener);
    addTrackedEventListener(streamInfo, res, 'finish', responseFinishListener);
    addTrackedEventListener(streamInfo, res, 'error', responseErrorListener);
    
    // Pipe stream to response
    stream.pipe(res);
    
    console.log(`✓ Stream started successfully: ${streamId} (${file.name})`);
    
  } catch (streamCreationError) {
    console.error(`Failed to create stream for ${streamId}:`, streamCreationError);
    streamInfo.errors.push({ 
      type: 'creation_error', 
      error: streamCreationError.message, 
      timestamp: Date.now() 
    });
    
    await performStreamCleanup(streamId, 'creation_failed');
    throw streamCreationError;
  }
};

/**
 * Stop a specific stream
 * @param {string} streamId - Stream identifier
 * @returns {Promise<Object>} Cleanup result
 */
export const stopStream = async (streamId) => {
  if (!activeStreams.has(streamId)) {
    return { success: false, reason: 'not_found' };
  }

  console.log(`Manual stop requested for stream: ${streamId}`);
  return await performStreamCleanup(streamId, 'manual_stop');
};

/**
 * Get all active streams with enhanced information
 * @returns {Object} Streams information
 */
export const getStreamsInfo = () => {
  const now = Date.now();
  const streams = Array.from(activeStreams.entries())
    .map(([id, info]) => formatStreamData(id, info, now))
    .sort((a, b) => b.startTime - a.startTime); // Most recent first

  const cleanupStats = getCleanupStats(cleanupAttempts);

  return {
    activeStreams: activeStreams.size,
    streams,
    cleanup: {
      timeout: STREAM_TIMEOUT,
      interval: CLEANUP_INTERVAL,
      timerRunning: isCleanupTimerRunning(),
      stats: cleanupStats,
    },
    streamStates: STREAM_STATES,
  };
};

/**
 * Get stream count
 * @returns {number} Number of active streams
 */
export const getActiveStreamCount = () => {
  return activeStreams.size;
};