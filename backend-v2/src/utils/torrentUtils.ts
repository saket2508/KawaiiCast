import { formatBytes } from '@utils/helpers';
import { MAX_CONCURRENT_TORRENTS, TORRENT_INACTIVE_TIMEOUT } from '@utils/constants';

export const createTorrentMetadata = (torrentId: string) => ({
  torrentId,
  addedAt: Date.now(),
  lastAccessed: Date.now(),
  accessCount: 1,
});

export const updateTorrentAccess = (torrentData: { metadata: { lastAccessed: number; accessCount: number } }) => {
  torrentData.metadata.lastAccessed = Date.now();
  torrentData.metadata.accessCount++;
};

export const formatTorrentData = (
  torrentId: string,
  torrentData: any,
  now: number,
  activeStreams: Map<string, { torrentIdentifier: string }>,
) => ({
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
    isInactive: now - torrentData.metadata.lastAccessed > TORRENT_INACTIVE_TIMEOUT,
  },
  hasActiveStreams: Array.from(activeStreams.values()).some((s) => s.torrentIdentifier === torrentId),
});

export const hasActiveStreams = (torrentId: string, activeStreams: Map<string, { torrentIdentifier: string }>) =>
  Array.from(activeStreams.values()).some((s) => s.torrentIdentifier === torrentId);

export const extractInfoHash = (magnetUri: string | Buffer | null) => {
  if (typeof magnetUri === 'string' && magnetUri.startsWith('magnet:')) {
    const m = magnetUri.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
    return m ? m[1].toLowerCase() : null;
  }
  return null;
};

export const findExistingTorrent = (client: any, infoHash: string | null) => {
  if (!infoHash) return null;
  return client.torrents.find((t: any) => t.infoHash.toLowerCase() === infoHash) || null;
};

export const isAtTorrentCapacity = (activeTorrents: Map<string, any>) => activeTorrents.size >= MAX_CONCURRENT_TORRENTS;

export const getTorrentsForEviction = (
  activeTorrents: Map<string, any>,
  activeStreams: Map<string, { torrentIdentifier: string }>,
) =>
  Array.from(activeTorrents.entries())
    .filter(([torrentId]) => !hasActiveStreams(torrentId, activeStreams))
    .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);

