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

// Stream retry configuration
const STREAM_RETRY_CONFIG = {
  maxAttempts: 2,     // Max retry attempts per stream
  retryDelay: 5000,   // 5 seconds delay between retries
  retryableErrors: [
    'stream error',
    'connection',
    'network',
    'timeout',
    'peer',
    'econnreset',
    'enotfound'
  ]
};

/**
 * Classify stream errors for retry logic
 * @param {Error} error - The stream error
 * @returns {string} Error classification
 */
const classifyStreamError = (error) => {
  const message = error.message.toLowerCase();
  
  // Non-retryable permanent errors
  if (message.includes('file not found') ||
      message.includes('invalid file index') ||
      message.includes('no such file') ||
      message.includes('torrent not found') ||
      message.includes('permission denied') ||
      message.includes('access denied')) {
    return 'PERMANENT';
  }
  
  // Check for retryable error patterns
  const isRetryable = STREAM_RETRY_CONFIG.retryableErrors.some(pattern => 
    message.includes(pattern)
  );
  
  return isRetryable ? 'RETRYABLE' : 'UNKNOWN';
};

/**
 * Attempt to retry a failed stream
 * @param {string} streamId - Stream identifier
 * @param {Object} streamParams - Original stream parameters
 * @returns {Promise<boolean>} Success status
 */
const retryStream = async (streamId, streamParams) => {
  try {
    console.log(`🔄 Attempting stream retry for ${streamId}`);
    
    // Clean up the failed stream first
    await performStreamCleanup(streamId, 'retry_preparation');
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Attempt to recreate the stream
    await createVideoStream(streamParams);
    
    console.log(`✅ Stream retry successful for ${streamId}`);
    return true;
  } catch (retryError) {
    console.error(`❌ Stream retry failed for ${streamId}:`, retryError);
    return false;
  }
};

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
  
  // Create enhanced stream info with retry tracking
  const streamInfo = createStreamInfo(torrentIdentifier, fileIndex, file);
  streamInfo.retryCount = streamInfo.retryCount || 0;
  streamInfo.originalParams = { torrentIdentifier, fileIndex, file, req, res };
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
      
      // Check if error is recoverable and retry attempts remaining
      const errorType = classifyStreamError(err);
      const shouldRetry = (errorType === 'RETRYABLE' || errorType === 'UNKNOWN') && 
                         streamInfo.retryCount < STREAM_RETRY_CONFIG.maxAttempts;
      
      if (shouldRetry) {
        console.log(`⚠ Stream error (${errorType}) for ${streamId}, attempting retry ${streamInfo.retryCount + 1}/${STREAM_RETRY_CONFIG.maxAttempts}`);
        streamInfo.retryCount++;
        
        // Don't send error response yet, attempt retry first
        setTimeout(async () => {
          try {
            const retrySuccess = await retryStream(streamId, streamInfo.originalParams);
            if (!retrySuccess) {
              // Retry failed, perform cleanup and send error response
              await performStreamCleanup(streamId, 'retry_failed');
              
              if (!res.headersSent) {
                res.status(503).json({ 
                  error: "Stream retry failed", 
                  details: err.message,
                  type: errorType,
                  retryable: false,
                  attempts: streamInfo.retryCount
                });
              }
            }
          } catch (retryError) {
            console.error(`Retry attempt failed for ${streamId}:`, retryError);
            await performStreamCleanup(streamId, 'retry_exception');
            
            if (!res.headersSent) {
              res.status(503).json({ 
                error: "Stream retry exception", 
                details: retryError.message,
                originalError: err.message,
                type: errorType,
                retryable: false
              });
            }
          }
        }, STREAM_RETRY_CONFIG.retryDelay);
      } else {
        // Non-recoverable error or max retries reached
        console.error(`❌ Stream error (${errorType}) for ${streamId} - ${shouldRetry ? 'max retries reached' : 'non-recoverable'}`);
        await performStreamCleanup(streamId, 'stream_error_permanent');
        
        if (!res.headersSent) {
          try {
            const statusCode = errorType === 'PERMANENT' ? 400 : 503;
            res.status(statusCode).json({ 
              error: "Stream error", 
              details: err.message,
              type: errorType,
              retryable: false,
              ...(streamInfo.retryCount > 0 && { attempts: streamInfo.retryCount })
            });
          } catch (responseError) {
            console.error(`Error sending error response for ${streamId}:`, responseError);
          }
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