import { 
  MAX_CONCURRENT_TORRENTS,
  TORRENT_INACTIVE_TIMEOUT,
  activeTorrents,
  activeStreams
} from "../utils/constants.js";
import { 
  createTorrentMetadata, 
  updateTorrentAccess, 
  formatTorrentData,
  extractInfoHash,
  findExistingTorrent,
  isAtTorrentCapacity,
  getTorrentsForEviction,
  hasActiveStreams 
} from "../utils/torrentUtils.js";
import { prepareFileInfo, probeForSubs, sortFiles, formatBytes } from "../utils/helpers.js";

/**
 * Enforce torrent limits using LRU eviction
 */
export const enforceTorrentLimits = () => {
  if (activeTorrents.size <= MAX_CONCURRENT_TORRENTS) {
    return;
  }
  
  console.log(`Torrent limit exceeded (${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS}), starting LRU eviction`);
  
  // Get torrents suitable for eviction (sorted by LRU)
  const torrentsForEviction = getTorrentsForEviction(activeTorrents, activeStreams);
  
  // Calculate how many to remove
  const torrentsToRemove = activeTorrents.size - MAX_CONCURRENT_TORRENTS;
  const candidatesForRemoval = torrentsForEviction.slice(0, Math.min(torrentsToRemove, torrentsForEviction.length));
  
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

/**
 * Add torrent to WebTorrent client with capacity management
 * @param {Object} client - WebTorrent client
 * @param {string|Buffer} torrentInput - Torrent input (magnet or buffer)
 * @param {string} torrentId - Torrent identifier
 * @returns {Promise<Object>} Torrent object
 */
export const addTorrentToClient = async (client, torrentInput, torrentId) => {
  // Check capacity before adding new torrents
  if (isAtTorrentCapacity(activeTorrents)) {
    enforceTorrentLimits();
    
    if (isAtTorrentCapacity(activeTorrents)) {
      throw new Error(`Server at capacity: ${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS} torrents. Please try again later.`);
    }
  }

  // Check if we already have this torrent
  let torrentData = activeTorrents.get(torrentId);
  let torrent = torrentData?.torrent;

  if (!torrent) {
    // Check WebTorrent client's internal torrents
    const infoHash = extractInfoHash(torrentInput);
    const existingTorrent = findExistingTorrent(client, infoHash);

    if (existingTorrent) {
      const metadata = createTorrentMetadata(torrentId);
      activeTorrents.set(torrentId, { torrent: existingTorrent, metadata });
      return existingTorrent;
    }

    // Add new torrent
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
          const metadata = createTorrentMetadata(torrentId);
          activeTorrents.set(torrentId, { torrent: newTorrent, metadata });
          resolve(newTorrent);
        });

        newTorrent.on("error", (err) => {
          clearTimeout(timeoutId);
          console.error("Torrent error:", err);

          // Handle duplicate torrent error
          if (err.message && err.message.includes("duplicate torrent")) {
            const hash = err.message.match(/([a-fA-F0-9]{40})/)?.[1];
            if (hash) {
              const existingTorrent = findExistingTorrent(client, hash);
              if (existingTorrent) {
                const metadata = createTorrentMetadata(torrentId);
                activeTorrents.set(torrentId, { torrent: existingTorrent, metadata });
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
    updateTorrentAccess(torrentData);
  }

  return torrent;
};

/**
 * Build torrent response with file information
 * @param {Object} torrent - Torrent object
 * @param {string} torrentId - Torrent identifier
 * @returns {Promise<Object>} Torrent response
 */
export const buildTorrentResponse = async (torrent, torrentId) => {
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

/**
 * Get torrent data by identifier
 * @param {string} torrentIdentifier - Torrent identifier
 * @param {string} magnetFallback - Magnet URI fallback
 * @returns {Object|null} Torrent data or null if not found
 */
export const getTorrentData = (torrentIdentifier, magnetFallback = null) => {
  let torrentData = activeTorrents.get(torrentIdentifier);
  
  if (!torrentData && magnetFallback) {
    torrentData = activeTorrents.get(magnetFallback);
  }
  
  if (torrentData) {
    updateTorrentAccess(torrentData);
  }
  
  return torrentData;
};

/**
 * Remove torrent and associated streams
 * @param {string} torrentIdentifier - Torrent identifier
 * @param {string} magnetFallback - Magnet URI fallback
 * @returns {Object} Removal result
 */
export const removeTorrent = (torrentIdentifier, magnetFallback = null) => {
  let torrentData = activeTorrents.get(torrentIdentifier);
  let actualKey = torrentIdentifier;

  if (!torrentData && magnetFallback) {
    torrentData = activeTorrents.get(magnetFallback);
    actualKey = magnetFallback;
  }

  if (!torrentData) {
    return { success: false, message: "Torrent not found" };
  }

  const torrent = torrentData.torrent;

  // Stop related streams
  const streamsToStop = Array.from(activeStreams.entries())
    .filter(([_, info]) =>
      info.torrentIdentifier === torrentIdentifier ||
      (magnetFallback && info.magnet === magnetFallback) ||
      info.magnet === torrentIdentifier
    )
    .map(([id]) => id);

  streamsToStop.forEach((id) => activeStreams.delete(id));

  // Remove torrent
  try {
    torrent.destroy();
    activeTorrents.delete(actualKey);
    
    return {
      success: true,
      message: "Torrent removed",
      stoppedStreams: streamsToStop.length,
    };
  } catch (error) {
    console.error(`Error removing torrent ${actualKey}:`, error);
    return {
      success: false,
      message: "Error removing torrent",
      error: error.message,
    };
  }
};

/**
 * Get all torrents with metadata
 * @returns {Object} Torrents information
 */
export const getTorrentsInfo = () => {
  const now = Date.now();
  const torrents = Array.from(activeTorrents.entries())
    .map(([id, torrentData]) => formatTorrentData(id, torrentData, now, activeStreams))
    .sort((a, b) => b.metadata.lastAccessed - a.metadata.lastAccessed); // Most recent first

  return {
    activeTorrents: activeTorrents.size,
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    utilization: Math.round((activeTorrents.size / MAX_CONCURRENT_TORRENTS) * 100),
    torrents,
    limits: {
      maxConcurrent: MAX_CONCURRENT_TORRENTS,
      inactiveTimeout: TORRENT_INACTIVE_TIMEOUT,
    },
  };
};

/**
 * Get active torrent count
 * @returns {number} Number of active torrents
 */
export const getActiveTorrentCount = () => {
  return activeTorrents.size;
};

/**
 * Destroy all torrents (for graceful shutdown)
 */
export const destroyAllTorrents = () => {
  activeTorrents.forEach((torrentData) => {
    try {
      torrentData.torrent.destroy();
    } catch (error) {
      console.error('Error destroying torrent during shutdown:', error);
    }
  });
  activeTorrents.clear();
};