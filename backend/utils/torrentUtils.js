import { formatBytes, getTorrentId } from "./helpers.js";
import { MAX_CONCURRENT_TORRENTS, TORRENT_INACTIVE_TIMEOUT } from "./constants.js";

/**
 * Create torrent metadata object
 * @param {string} torrentId - Torrent identifier
 * @returns {Object} Torrent metadata
 */
export const createTorrentMetadata = (torrentId) => {
  return {
    torrentId,
    addedAt: Date.now(),
    lastAccessed: Date.now(),
    accessCount: 1,
  };
};

/**
 * Update torrent access information
 * @param {Object} torrentData - Torrent data object
 */
export const updateTorrentAccess = (torrentData) => {
  torrentData.metadata.lastAccessed = Date.now();
  torrentData.metadata.accessCount++;
};

/**
 * Format torrent data for API responses
 * @param {string} torrentId - Torrent ID
 * @param {Object} torrentData - Torrent data
 * @param {number} now - Current timestamp
 * @param {Map} activeStreams - Active streams map
 * @returns {Object} Formatted torrent data
 */
export const formatTorrentData = (torrentId, torrentData, now, activeStreams) => {
  return {
    id: torrentId,
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
      .some(stream => stream.torrentIdentifier === torrentId),
  };
};

/**
 * Check if torrent has active streams
 * @param {string} torrentId - Torrent identifier
 * @param {Map} activeStreams - Active streams map
 * @returns {boolean} True if torrent has active streams
 */
export const hasActiveStreams = (torrentId, activeStreams) => {
  return Array.from(activeStreams.values())
    .some(stream => stream.torrentIdentifier === torrentId);
};

/**
 * Extract info hash from magnet URI
 * @param {string} magnetUri - Magnet URI
 * @returns {string|null} Info hash or null if not found
 */
export const extractInfoHash = (magnetUri) => {
  if (typeof magnetUri === 'string' && magnetUri.startsWith('magnet:')) {
    const magnetMatch = magnetUri.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
    return magnetMatch ? magnetMatch[1].toLowerCase() : null;
  }
  return null;
};

/**
 * Find existing torrent in WebTorrent client
 * @param {Object} client - WebTorrent client
 * @param {string} infoHash - Info hash to search for
 * @returns {Object|null} Existing torrent or null
 */
export const findExistingTorrent = (client, infoHash) => {
  if (!infoHash) return null;
  
  return client.torrents.find(t => 
    t.infoHash.toLowerCase() === infoHash
  ) || null;
};

/**
 * Check if server is at torrent capacity
 * @param {Map} activeTorrents - Active torrents map
 * @returns {boolean} True if at capacity
 */
export const isAtTorrentCapacity = (activeTorrents) => {
  return activeTorrents.size >= MAX_CONCURRENT_TORRENTS;
};

/**
 * Get torrents suitable for LRU eviction
 * @param {Map} activeTorrents - Active torrents map
 * @param {Map} activeStreams - Active streams map
 * @returns {Array} Array of [torrentId, torrentData] suitable for eviction
 */
export const getTorrentsForEviction = (activeTorrents, activeStreams) => {
  return Array.from(activeTorrents.entries())
    .filter(([torrentId, _]) => !hasActiveStreams(torrentId, activeStreams))
    .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);
};