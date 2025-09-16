import {
  MAX_CONCURRENT_TORRENTS,
  activeTorrents,
  activeStreams,
} from "@utils/constants";
import {
  createTorrentMetadata,
  updateTorrentAccess,
  extractInfoHash,
  findExistingTorrent,
  isAtTorrentCapacity,
  getTorrentsForEviction,
} from "@utils/torrentUtils";
import { prepareFileInfo, sortFiles, formatBytes } from "@utils/helpers";
import { probeEmbeddedSubs } from "@utils/ffprobe";

export const enforceTorrentLimits = () => {
  if (activeTorrents.size <= MAX_CONCURRENT_TORRENTS) return;
  const candidates = getTorrentsForEviction(activeTorrents, activeStreams);
  const toRemove = activeTorrents.size - MAX_CONCURRENT_TORRENTS;
  const removeList = candidates.slice(0, Math.min(toRemove, candidates.length));
  removeList.forEach(([torrentId, data]) => {
    try {
      data.torrent.destroy();
      activeTorrents.delete(torrentId);
    } catch (e) {
      console.error(`Error evicting torrent ${torrentId}:`, e);
    }
  });
};

export const addTorrentToClient = async (
  client: any,
  torrentInput: string | Buffer,
  torrentId: string
) => {
  if (isAtTorrentCapacity(activeTorrents)) {
    enforceTorrentLimits();
    if (isAtTorrentCapacity(activeTorrents)) {
      throw new Error(
        `Server at capacity: ${activeTorrents.size}/${MAX_CONCURRENT_TORRENTS} torrents. Please try again later.`
      );
    }
  }

  let torrentData = activeTorrents.get(torrentId);
  let torrent = torrentData?.torrent;

  if (!torrent) {
    const infoHash = extractInfoHash(torrentInput as any);
    const existing = findExistingTorrent(client, infoHash);
    if (existing) {
      const metadata = createTorrentMetadata(torrentId);
      activeTorrents.set(torrentId, { torrent: existing, metadata });
      return existing;
    }

    torrent = await new Promise<any>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Timeout: Could not fetch torrent metadata")),
        240000
      );
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
        newTorrent.on("error", (err: any) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      } catch (e) {
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  } else {
    updateTorrentAccess(torrentData!);
  }
  return torrent;
};

export const buildTorrentResponse = async (torrent: any, torrentId: string) => {
  const files = await Promise.all(
    torrent.files.map(async (file: any) => ({
      ...prepareFileInfo([file])[0],
      embeddedSubs: file.name.endsWith(".mkv")
        ? await probeEmbeddedSubs(file.path)
        : [],
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

export const getTorrentData = (
  torrentIdentifier: string,
  magnetFallback: string | null = null
) => {
  let torrentData = activeTorrents.get(torrentIdentifier);
  if (!torrentData && magnetFallback)
    torrentData = activeTorrents.get(magnetFallback);
  if (torrentData) updateTorrentAccess(torrentData);
  return torrentData || null;
};

export const getActiveTorrentCount = () => activeTorrents.size;

export const destroyAllTorrents = () => {
  activeTorrents.forEach((torrentData) => {
    try {
      torrentData.torrent.destroy();
    } catch (e) {
      console.error("Error destroying torrent during shutdown:", e);
    }
  });
  activeTorrents.clear();
};

export const getTorrentsInfo = () => {
  const now = Date.now();
  const { formatTorrentData } = require("@utils/torrentUtils");
  const torrents = Array.from(activeTorrents.entries())
    .map(([id, data]: any) => formatTorrentData(id, data, now, activeStreams))
    .sort((a: any, b: any) => b.metadata.lastAccessed - a.metadata.lastAccessed);

  return {
    activeTorrents: activeTorrents.size,
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    utilization: Math.round((activeTorrents.size / MAX_CONCURRENT_TORRENTS) * 100),
    torrents,
    limits: { maxConcurrent: MAX_CONCURRENT_TORRENTS },
  };
};

export const removeTorrent = (
  torrentIdentifier: string,
  magnetFallback: string | null = null
) => {
  let torrentData = activeTorrents.get(torrentIdentifier);
  let actualKey = torrentIdentifier;
  if (!torrentData && magnetFallback) {
    torrentData = activeTorrents.get(magnetFallback);
    actualKey = magnetFallback;
  }
  if (!torrentData) return { success: false, message: "Torrent not found" } as const;

  const torrent = torrentData.torrent;

  // Drop related streams entries
  Array.from(activeStreams.entries())
    .filter(([, info]: any) =>
      info.torrentIdentifier === torrentIdentifier ||
      (magnetFallback && info.torrentIdentifier === magnetFallback)
    )
    .forEach(([id]) => activeStreams.delete(id));

  try {
    torrent.destroy();
    activeTorrents.delete(actualKey);
    return { success: true, message: "Torrent removed" } as const;
  } catch (e: any) {
    return { success: false, message: "Error removing torrent", error: e?.message } as const;
  }
};
