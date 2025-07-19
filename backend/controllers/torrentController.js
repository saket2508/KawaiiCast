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
  getActiveTorrentCount
} from "../services/torrentManager.js";
import { 
  createVideoStream, 
  stopStream as stopStreamService, 
  getStreamsInfo,
  getActiveStreamCount 
} from "../services/streamManager.js";
import { isCleanupTimerRunning } from "../services/cleanupService.js";

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
    res.status(500).json({
      error: error.message || "Failed to get torrent information",
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
      });
    }
    
    const torrent = torrentData.torrent;

    if (!torrent.ready) {
      return res.status(202).json({
        error: "Torrent not ready yet. Please wait.",
      });
    }

    const file = torrent.files[fileIndex];
    if (!file) {
      return res.status(404).json({ error: "File not found" });
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
      res.status(500).json({
        error: error.message || "Failed to start stream",
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