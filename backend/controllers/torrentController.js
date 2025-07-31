import { getTorrentId } from "../utils/helpers.js";
import { getStreamId } from "../utils/helpers.js";
import { formatBytes } from "../utils/helpers.js";
import { 
  MAX_CONCURRENT_TORRENTS,
  STREAM_TIMEOUT,
  CLEANUP_INTERVAL,
  TORRENT_INACTIVE_TIMEOUT
} from "../utils/constants.js";
import { 
  addTorrentToClient, 
  buildTorrentResponse, 
  getTorrentData, 
  removeTorrent as removeTorrentService,
  getTorrentsInfo,
  getActiveTorrentCount,
  classifyTorrentError
} from "../services/torrentManager.js";
import { 
  createVideoStream, 
  stopStream as stopStreamService, 
  getStreamsInfo,
  getActiveStreamCount 
} from "../services/streamManager.js";
import { isCleanupTimerRunning } from "../services/cleanupService.js";

/**
 * Classify stream-related errors for retry logic
 * @param {Error} error - The error to classify  
 * @returns {string} Error classification
 */
const classifyStreamError = (error) => {
  const message = error.message.toLowerCase();
  
  // Non-retryable errors
  if (message.includes('file not found') ||
      message.includes('invalid file index') ||
      message.includes('no such file') ||
      message.includes('torrent not found')) {
    return 'PERMANENT';
  }
  
  // Retryable infrastructure errors
  if (message.includes('stream error') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('peer') ||
      message.includes('not ready')) {
    return 'RETRYABLE';
  }
  
  return 'RETRYABLE'; // Default to retryable
};

// Health check endpoint
export const getHealth = (req, res) => {
  const client = req.app.locals.webTorrentClient;

  res.json({
    status: "ok",
    activeTorrents: getActiveTorrentCount(),
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    torrentUtilization: `${getActiveTorrentCount()}/${MAX_CONCURRENT_TORRENTS} (${Math.round((getActiveTorrentCount() / MAX_CONCURRENT_TORRENTS) * 100)}%)`,
    activeStreams: getActiveStreamCount(),
    webTorrentRatio: client.ratio,
    downloadSpeed: formatBytes(client.downloadSpeed),
    uploadSpeed: formatBytes(client.uploadSpeed),
    cleanupTimer: {
      running: isCleanupTimerRunning(),
      interval: CLEANUP_INTERVAL,
      streamTimeout: STREAM_TIMEOUT,
      torrentTimeout: TORRENT_INACTIVE_TIMEOUT,
    },
  });
};

// Note: GET /torrent/info endpoint removed - frontend only uses POST

// Get torrent info via POST (supports both magnet URIs and torrent files)
export const postTorrentInfo = async (req, res) => {
  let torrentInput;
  let torrentId;
  let isFileUpload = false;

  // Handle file upload
  if (req.file) {
    torrentInput = req.file.buffer;
    torrentId = getTorrentId(torrentInput);
    isFileUpload = true;
  }
  // Handle JSON payload
  else if (req.body) {
    const { magnet, torrentData } = req.body;

    // Validate input
    if (!magnet && !torrentData) {
      return res.status(400).json({
        error: "Either magnet URI, torrent file data, or file upload is required",
      });
    }

    if (magnet && !magnet.startsWith("magnet:")) {
      return res.status(400).json({ error: "Invalid magnet URI" });
    }

    torrentInput = magnet || Buffer.from(torrentData, "base64");
    torrentId = getTorrentId(torrentInput);
  } else {
    return res.status(400).json({
      error: "Either magnet URI, torrent file data, or file upload is required",
    });
  }

  try {
    const client = req.app.locals.webTorrentClient;
    const torrent = await addTorrentToClient(client, torrentInput, torrentId);
    const response = await buildTorrentResponse(torrent, torrentId);

    // Add upload info if it was a file upload
    if (isFileUpload) {
      response.uploadedFileName = req.file.originalname;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting torrent info:", error);
    
    // Enhanced error response with retry guidance
    const errorType = error.type || classifyTorrentError(error);
    let statusCode = 500; // Default to server error
    
    // Set appropriate HTTP status codes
    if (errorType === 'PERMANENT') {
      statusCode = 400; // Bad Request for permanent failures
    } else if (errorType === 'CAPACITY') {
      statusCode = 503; // Service Unavailable for capacity issues
    } else if (errorType === 'RETRYABLE') {
      statusCode = 500; // Server Error for infrastructure issues
    }
    
    res.status(statusCode).json({
      error: error.message || "Failed to get torrent information",
      type: errorType,
      retryable: errorType !== 'PERMANENT',
      torrentId: torrentId,
      ...(error.attempts && { attempts: error.attempts }),
      ...(errorType === 'CAPACITY' && { 
        suggestion: "Server is at capacity. Please try again in a few minutes." 
      }),
      ...(errorType === 'RETRYABLE' && { 
        suggestion: "Temporary network issue. You can retry this request." 
      }),
      ...(errorType === 'PERMANENT' && { 
        suggestion: "Invalid torrent or magnet URI. Please check and try a different torrent." 
      })
    });
  }
};

// Stream torrent file
export const streamTorrent = async (req, res) => {
  const { magnet, torrent_id, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;
  const torrentIdentifier = magnet || torrent_id;

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  try {
    // Find torrent
    const torrentData = getTorrentData(torrentIdentifier, magnet);

    if (!torrentData) {
      return res.status(404).json({
        error: "Torrent not found. Please load torrent info first.",
        type: 'RETRYABLE',
        retryable: true,
        action: 'reload_torrent',
        suggestion: "The torrent needs to be loaded first. Please try fetching torrent info again."
      });
    }
    
    const torrent = torrentData.torrent;

    if (!torrent.ready) {
      return res.status(202).json({
        error: "Torrent not ready yet. Please wait.",
        type: 'RETRYABLE',
        retryable: true,
        action: 'wait_and_retry',
        suggestion: "The torrent is still loading. Please wait a moment and try again.",
        progress: Math.round(torrent.progress * 100) || 0
      });
    }

    const file = torrent.files[fileIndex];
    if (!file) {
      return res.status(404).json({ 
        error: "File not found",
        type: 'PERMANENT',
        retryable: false,
        fileIndex: fileIndex,
        availableFiles: torrent.files.length,
        suggestion: `File index ${fileIndex} not found. Available files: 0-${torrent.files.length - 1}`
      });
    }

    // Create and start the video stream
    await createVideoStream({
      torrentIdentifier,
      fileIndex,
      file,
      req,
      res
    });

  } catch (error) {
    console.error("Error starting stream:", error);
    
    if (!res.headersSent) {
      const errorType = classifyStreamError(error);
      const statusCode = errorType === 'PERMANENT' ? 400 : 503;
      
      res.status(statusCode).json({
        error: error.message || "Failed to start stream",
        type: errorType,
        retryable: errorType !== 'PERMANENT',
        torrentIdentifier: torrentIdentifier,
        fileIndex: fileIndex,
        ...(errorType === 'RETRYABLE' && {
          suggestion: "Stream failed to start due to a temporary issue. Please try again."
        }),
        ...(errorType === 'PERMANENT' && {
          suggestion: "Stream cannot be started. Please check the torrent and file index."
        })
      });
    }
  }
};

// Stop stream using robust cleanup
export const stopStream = async (req, res) => {
  const { magnet, torrent_id, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;
  const torrentIdentifier = magnet || torrent_id;

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  const streamId = getStreamId(torrentIdentifier, fileIndex);

  try {
    const cleanupResult = await stopStreamService(streamId);
    
    if (cleanupResult.success) {
      res.json({ 
        message: "Stream stopped successfully",
        cleanupDuration: cleanupResult.duration,
        streamId 
      });
    } else if (cleanupResult.reason === 'not_found') {
      res.json({ message: "Stream not found or already stopped" });
    } else {
      res.status(500).json({ 
        message: "Stream stop initiated but cleanup failed",
        error: cleanupResult.reason,
        streamId,
        details: cleanupResult.errors 
      });
    }
  } catch (error) {
    console.error(`Error stopping stream ${streamId}:`, error);
    res.status(500).json({ 
      message: "Error stopping stream",
      error: error.message,
      streamId 
    });
  }
};

// List active streams with enhanced information
export const listStreams = (_req, res) => {
  try {
    const streamsInfo = getStreamsInfo();
    res.json(streamsInfo);
  } catch (error) {
    console.error("Error listing streams:", error);
    res.status(500).json({ error: "Failed to list streams" });
  }
};

// List active torrents with metadata
export const listTorrents = (_req, res) => {
  try {
    const torrentsInfo = getTorrentsInfo();
    res.json(torrentsInfo);
  } catch (error) {
    console.error("Error listing torrents:", error);
    res.status(500).json({ error: "Failed to list torrents" });
  }
};

// Remove torrent
export const removeTorrent = (req, res) => {
  const { magnet, torrent_id } = req.query;
  const torrentIdentifier = magnet || torrent_id;

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  try {
    const result = removeTorrentService(torrentIdentifier, magnet);
    
    if (result.success) {
      res.json({
        message: result.message,
        stoppedStreams: result.stoppedStreams,
      });
    } else {
      res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error removing torrent:", error);
    res.status(500).json({ 
      error: "Failed to remove torrent",
      details: error.message 
    });
  }
};