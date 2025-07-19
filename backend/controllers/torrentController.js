import rangeParser from "range-parser";
import mime from "mime-types";
import {
  formatBytes,
  getStreamId,
  getTorrentId,
  prepareFileInfo,
  probeForSubs,
  sortFiles,
} from "../utils/helpers.js";

// Storage for active torrents and streams
export const activeTorrents = new Map(); // torrentId -> { torrent, metadata }
export const activeStreams = new Map(); // streamId -> stream info

// Stream timeout configuration
const STREAM_TIMEOUT = process.env.NODE_ENV === 'test' ? 10 * 1000 : 30 * 60 * 1000; // 10s for testing, 30min for production
const CLEANUP_INTERVAL = process.env.NODE_ENV === 'test' ? 5 * 1000 : 5 * 60 * 1000; // 5s for testing, 5min for production

// Torrent limits configuration
const MAX_CONCURRENT_TORRENTS = process.env.MAX_TORRENTS || 50; // Maximum concurrent torrents
const TORRENT_INACTIVE_TIMEOUT = 60 * 60 * 1000; // Remove inactive torrents after 1 hour

// Cleanup timer for abandoned streams
let cleanupTimer = null;

// Function to clean up inactive streams
const cleanupInactiveStreams = () => {
  const now = Date.now();
  const streamsToDelete = [];
  
  // Check each active stream for inactivity
  for (const [streamId, streamInfo] of activeStreams.entries()) {
    const timeSinceLastActivity = now - streamInfo.lastActivity;
    
    if (timeSinceLastActivity > STREAM_TIMEOUT) {
      console.log(`Cleaning up inactive stream: ${streamId} (inactive for ${Math.round(timeSinceLastActivity / 1000)}s)`);
      streamsToDelete.push(streamId);
      
      // Destroy the stream if it exists
      if (streamInfo.stream) {
        try {
          streamInfo.stream.destroy();
        } catch (error) {
          console.error(`Error destroying stream ${streamId}:`, error);
        }
      }
    }
  }
  
  // Remove inactive streams from the map
  streamsToDelete.forEach(streamId => activeStreams.delete(streamId));
  
  if (streamsToDelete.length > 0) {
    console.log(`Cleaned up ${streamsToDelete.length} inactive streams`);
  }
};

// Function to clean up inactive torrents
const cleanupInactiveTorrents = () => {
  const now = Date.now();
  const torrentsToRemove = [];
  
  // Check each torrent for inactivity
  for (const [torrentId, torrentData] of activeTorrents.entries()) {
    const timeSinceLastActivity = now - torrentData.metadata.lastAccessed;
    
    // Don't remove torrents that have active streams
    const hasActiveStreams = Array.from(activeStreams.values())
      .some(stream => stream.torrentIdentifier === torrentId);
    
    if (!hasActiveStreams && timeSinceLastActivity > TORRENT_INACTIVE_TIMEOUT) {
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

// Function to enforce torrent limits using LRU eviction
const enforceTorrentLimits = () => {
  if (activeTorrents.size <= MAX_CONCURRENT_TORRENTS) {
    return; // Within limits
  }
  
  console.log(`Torrent limit exceeded (${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS}), starting LRU eviction`);
  
  // Sort torrents by last accessed time (LRU first)
  const torrentEntries = Array.from(activeTorrents.entries())
    .filter(([_, torrentData]) => {
      // Don't evict torrents with active streams
      const hasActiveStreams = Array.from(activeStreams.values())
        .some(stream => stream.torrentIdentifier === torrentData.metadata.torrentId);
      return !hasActiveStreams;
    })
    .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);
  
  // Calculate how many to remove
  const torrentsToRemove = activeTorrents.size - MAX_CONCURRENT_TORRENTS;
  const candidatesForRemoval = torrentEntries.slice(0, Math.min(torrentsToRemove, torrentEntries.length));
  
  // Remove LRU torrents
  candidatesForRemoval.forEach(([torrentId, torrentData]) => {
    console.log(`Evicting LRU torrent: ${torrentId}`);
    try {
      torrentData.torrent.destroy();
      activeTorrents.delete(torrentId);
    } catch (error) {
      console.error(`Error evicting torrent ${torrentId}:`, error);
    }
  });
  
  console.log(`Evicted ${candidatesForRemoval.length} torrents to enforce limits`);
};

// Start the cleanup timer
const startCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }
  
  // Combined cleanup function
  const performCleanup = () => {
    cleanupInactiveStreams();
    cleanupInactiveTorrents();
    enforceTorrentLimits();
  };
  
  cleanupTimer = setInterval(performCleanup, CLEANUP_INTERVAL);
  console.log(`Started cleanup timer (${CLEANUP_INTERVAL / 1000}s interval) - streams & torrents`);
};

// Stop the cleanup timer
const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('Stopped stream cleanup timer');
  }
};

// Health check
export const getHealth = (req, res) => {
  const client = req.app.locals.webTorrentClient;

  res.json({
    status: "ok",
    activeTorrents: activeTorrents.size,
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    torrentUtilization: `${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS} (${Math.round((activeTorrents.size / MAX_CONCURRENT_TORRENTS) * 100)}%)`,
    activeStreams: activeStreams.size,
    webTorrentRatio: client.ratio,
    downloadSpeed: formatBytes(client.downloadSpeed),
    uploadSpeed: formatBytes(client.uploadSpeed),
    cleanupTimer: {
      running: cleanupTimer !== null,
      interval: CLEANUP_INTERVAL,
      streamTimeout: STREAM_TIMEOUT,
      torrentTimeout: TORRENT_INACTIVE_TIMEOUT,
    },
  });
};

// Export cleanup functions for use in app.js
export { startCleanupTimer, stopCleanupTimer };

// Get torrent info via GET (magnet URI)
export const getTorrentInfo = async (req, res) => {
  const { magnet } = req.query;

  if (!magnet) {
    return res.status(400).json({ error: "Magnet URI is required" });
  }

  if (!magnet.startsWith("magnet:")) {
    return res.status(400).json({ error: "Invalid magnet URI" });
  }

  try {
    const client = req.app.locals.webTorrentClient;
    const torrent = await addTorrentToClient(client, magnet, magnet);
    const response = await buildTorrentResponse(torrent, magnet);

    res.json(response);
  } catch (error) {
    console.error("Error getting torrent info:", error);
    res.status(500).json({
      error: error.message || "Failed to get torrent information",
    });
  }
};

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
        error:
          "Either magnet URI, torrent file data, or file upload is required",
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
    let torrentData = activeTorrents.get(torrentIdentifier);
    if (!torrentData && magnet) {
      torrentData = activeTorrents.get(magnet);
    }

    if (!torrentData) {
      return res.status(404).json({
        error: "Torrent not found. Please load torrent info first.",
      });
    }
    
    const torrent = torrentData.torrent;
    
    // Update last accessed time
    torrentData.metadata.lastAccessed = Date.now();

    if (!torrent.ready) {
      return res.status(202).json({
        error: "Torrent not ready yet. Please wait.",
      });
    }

    const file = torrent.files[fileIndex];
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const streamId = getStreamId(torrentIdentifier, fileIndex);

    // Store stream info with activity tracking
    const streamInfo = {
      torrentIdentifier,
      fileIndex,
      fileName: file.name,
      fileSize: file.length,
      startTime: Date.now(),
      lastActivity: Date.now(), // Track when stream was last active
      stream: null, // Will store the actual stream object
    };
    
    activeStreams.set(streamId, streamInfo);

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

    // Create and pipe stream
    const stream = file.createReadStream({ start, end });
    
    // Store the stream reference for cleanup
    streamInfo.stream = stream;

    // Track activity on data reads
    stream.on('data', () => {
      // Update last activity timestamp when data is actually read
      const currentStreamInfo = activeStreams.get(streamId);
      if (currentStreamInfo) {
        currentStreamInfo.lastActivity = Date.now();
      }
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      // Clean up on error
      activeStreams.delete(streamId);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error" });
      }
    });

    // Enhanced cleanup function
    const cleanupStream = () => {
      console.log(`Cleaning up stream: ${streamId}`);
      try {
        stream.destroy();
      } catch (error) {
        console.error(`Error destroying stream ${streamId}:`, error);
      }
      activeStreams.delete(streamId);
    };

    req.on("close", cleanupStream);
    req.on("aborted", cleanupStream);

    // Also cleanup if response finishes normally
    res.on('finish', () => {
      activeStreams.delete(streamId);
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Error starting stream:", error);
    res.status(500).json({
      error: error.message || "Failed to start stream",
    });
  }
};

// Stop stream
export const stopStream = (req, res) => {
  const { magnet, torrent_id, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;
  const torrentIdentifier = magnet || torrent_id;

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  const streamId = getStreamId(torrentIdentifier, fileIndex);

  if (activeStreams.has(streamId)) {
    activeStreams.delete(streamId);
    res.json({ message: "Stream stopped" });
  } else {
    res.json({ message: "Stream not found or already stopped" });
  }
};

// List active streams
export const listStreams = (_req, res) => {
  const now = Date.now();
  const streams = Array.from(activeStreams.entries()).map(([id, info]) => ({
    id,
    torrentIdentifier: info.torrentIdentifier,
    fileIndex: info.fileIndex,
    fileName: info.fileName,
    fileSize: info.fileSize,
    startTime: info.startTime,
    duration: now - info.startTime,
    lastActivity: info.lastActivity,
    timeSinceLastActivity: now - info.lastActivity,
    isActive: (now - info.lastActivity) < STREAM_TIMEOUT,
  }));

  res.json({
    activeStreams: activeStreams.size,
    streams,
    cleanup: {
      timeout: STREAM_TIMEOUT,
      interval: CLEANUP_INTERVAL,
      timerRunning: cleanupTimer !== null,
    },
  });
};

// List active torrents with metadata
export const listTorrents = (_req, res) => {
  const now = Date.now();
  const torrents = Array.from(activeTorrents.entries()).map(([id, torrentData]) => ({
    id,
    name: torrentData.torrent.name,
    infoHash: torrentData.torrent.infoHash,
    size: formatBytes(torrentData.torrent.length),
    progress: Math.round(torrentData.torrent.progress * 100),
    downloadSpeed: formatBytes(torrentData.torrent.downloadSpeed),
    uploadSpeed: formatBytes(torrentData.torrent.uploadSpeed),
    numPeers: torrentData.torrent.numPeers,
    ready: torrentData.torrent.ready,
    metadata: {
      ...torrentData.metadata,
      age: now - torrentData.metadata.addedAt,
      timeSinceLastAccess: now - torrentData.metadata.lastAccessed,
      isInactive: (now - torrentData.metadata.lastAccessed) > TORRENT_INACTIVE_TIMEOUT,
    },
    hasActiveStreams: Array.from(activeStreams.values())
      .some(stream => stream.torrentIdentifier === id),
  }));

  res.json({
    activeTorrents: activeTorrents.size,
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    utilization: Math.round((activeTorrents.size / MAX_CONCURRENT_TORRENTS) * 100),
    torrents: torrents.sort((a, b) => b.metadata.lastAccessed - a.metadata.lastAccessed), // Most recent first
    limits: {
      maxConcurrent: MAX_CONCURRENT_TORRENTS,
      inactiveTimeout: TORRENT_INACTIVE_TIMEOUT,
    },
  });
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

  // Find torrent
  let torrentData = activeTorrents.get(torrentIdentifier);
  let actualKey = torrentIdentifier;

  if (!torrentData && magnet) {
    torrentData = activeTorrents.get(magnet);
    actualKey = magnet;
  }

  if (torrentData) {
    const torrent = torrentData.torrent;
    // Stop related streams
    const streamsToStop = Array.from(activeStreams.entries())
      .filter(
        ([_, info]) =>
          info.torrentIdentifier === torrentIdentifier ||
          (magnet && info.magnet === magnet) ||
          info.magnet === torrentIdentifier
      )
      .map(([id]) => id);

    streamsToStop.forEach((id) => activeStreams.delete(id));

    // Remove torrent
    torrent.destroy();
    activeTorrents.delete(actualKey);

    res.json({
      message: "Torrent removed",
      stoppedStreams: streamsToStop.length,
    });
  } else {
    res.json({ message: "Torrent not found" });
  }
};

// Helper functions
const addTorrentToClient = async (client, torrentInput, torrentId) => {
  // Check if we're at capacity before adding new torrents
  if (activeTorrents.size >= MAX_CONCURRENT_TORRENTS) {
    // Try to enforce limits first
    enforceTorrentLimits();
    
    // If still at capacity after cleanup, reject the request
    if (activeTorrents.size >= MAX_CONCURRENT_TORRENTS) {
      throw new Error(`Server at capacity: ${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS} torrents. Please try again later.`);
    }
  }

  // Check if we already have this torrent in our Map
  let torrentData = activeTorrents.get(torrentId);
  let torrent = torrentData?.torrent;

  if (!torrent) {
    // Also check the WebTorrent client's internal torrents
    // In case of magnet links, we need to extract the info hash to match
    let infoHash;
    if (
      typeof torrentInput === "string" &&
      torrentInput.startsWith("magnet:")
    ) {
      const magnetMatch = torrentInput.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
      if (magnetMatch) {
        infoHash = magnetMatch[1].toLowerCase();
      }
    }

    // Check if torrent already exists in the client
    const existingTorrent = client.torrents.find((t) => {
      if (infoHash) {
        return t.infoHash.toLowerCase() === infoHash;
      }
      // For buffer inputs, we'll need to let it try and catch the duplicate error
      return false;
    });

    if (existingTorrent) {
      const torrentMetadata = {
        torrentId,
        addedAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
      };
      activeTorrents.set(torrentId, { torrent: existingTorrent, metadata: torrentMetadata });
      return existingTorrent;
    }

    torrent = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timeout: Could not fetch torrent metadata"));
      }, 240000);

      try {
        const newTorrent = client.add(torrentInput, {
          destroyStoreOnDestroy: true,
          storeCacheSlots: 20,
        });

        newTorrent.on("ready", () => {
          clearTimeout(timeoutId);
          const torrentMetadata = {
            torrentId,
            addedAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1,
          };
          activeTorrents.set(torrentId, { torrent: newTorrent, metadata: torrentMetadata });
          resolve(newTorrent);
        });

        newTorrent.on("error", (err) => {
          clearTimeout(timeoutId);
          console.error("Torrent error:", err);

          // If it's a duplicate error, try to find the existing torrent
          if (err.message && err.message.includes("duplicate torrent")) {
            const hash = err.message.match(/([a-fA-F0-9]{40})/)?.[1];
            if (hash) {
              const existingTorrent = client.torrents.find(
                (t) => t.infoHash.toLowerCase() === hash.toLowerCase()
              );
              if (existingTorrent) {
                const torrentMetadata = {
                  torrentId,
                  addedAt: Date.now(),
                  lastAccessed: Date.now(),
                  accessCount: 1,
                };
                activeTorrents.set(torrentId, { torrent: existingTorrent, metadata: torrentMetadata });
                resolve(existingTorrent);
                return;
              }
            }
          }

          reject(err);
        });
      } catch (syncError) {
        clearTimeout(timeoutId);
        reject(syncError);
      }
    });
  } else {
    // Update access info for existing torrent
    torrentData.metadata.lastAccessed = Date.now();
    torrentData.metadata.accessCount++;
  }

  return torrent;
};

const buildTorrentResponse = async (torrent, torrentId) => {
  const files = await Promise.all(
    torrent.files.map(async (file) => ({
      ...prepareFileInfo([file])[0],
      embeddedSubs: file.name.endsWith(".mkv") ? await probeForSubs(file) : [],
    }))
  );

  const sortedFiles = sortFiles(files);

  return {
    name: torrent.name,
    infoHash: torrent.infoHash,
    magnetURI: torrent.magnetURI,
    torrentId,
    files: sortedFiles,
    totalSize: torrent.length,
    progress: Math.round(torrent.progress * 100),
    downloadSpeed: formatBytes(torrent.downloadSpeed),
    uploadSpeed: formatBytes(torrent.uploadSpeed),
    numPeers: torrent.numPeers,
    ready: torrent.ready,
  };
};
