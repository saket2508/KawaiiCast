import { formatBytes, getStreamId } from "@utils/helpers";
import {
  MAX_CONCURRENT_TORRENTS,
  CLEANUP_INTERVAL,
  STREAM_TIMEOUT,
  TORRENT_INACTIVE_TIMEOUT,
} from "@utils/constants";
import {
  addTorrentToClient,
  buildTorrentResponse,
  getTorrentData,
  getActiveTorrentCount,
  getTorrentsInfo,
  removeTorrent as removeTorrentService,
} from "@services/torrentManager";
import {
  createVideoStream,
  stopStream as stopStreamService,
  getActiveStreamCount,
  getStreamsInfo,
} from "@services/streamManager";
import { isCleanupTimerRunning } from "@services/cleanupService";

export const getHealth = (req: any, res: any) => {
  const client = (req.app as any).locals.webTorrentClient;
  res.json({
    status: "ok",
    activeTorrents: getActiveTorrentCount(),
    maxTorrents: MAX_CONCURRENT_TORRENTS,
    torrentUtilization: `${getActiveTorrentCount()}/${MAX_CONCURRENT_TORRENTS}`,
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

export const postTorrentInfo = async (req: any, res: any) => {
  let torrentInput: string | Buffer;
  let torrentId: string | undefined;
  let isFileUpload = false;

  if (req.file) {
    torrentInput = req.file.buffer;
    torrentId = req.file.buffer
      ? `torrent_${Buffer.from(req.file.buffer)
          .toString("base64")
          .slice(0, 32)}`
      : undefined;
    isFileUpload = true;
  } else if (req.body) {
    const { magnet, torrentData } = req.body;
    if (!magnet && !torrentData)
      return res.status(400).json({
        error:
          "Either magnet URI, torrent file data, or file upload is required",
      });
    if (magnet && !String(magnet).startsWith("magnet:"))
      return res.status(400).json({ error: "Invalid magnet URI" });
    torrentInput = magnet || Buffer.from(torrentData, "base64");
    torrentId =
      typeof torrentInput === "string"
        ? torrentInput
        : `torrent_${Buffer.from(torrentInput)
            .toString("base64")
            .slice(0, 32)}`;
  } else {
    return res.status(400).json({
      error: "Either magnet URI, torrent file data, or file upload is required",
    });
  }

  try {
    const client = (req.app as any).locals.webTorrentClient;
    const torrent = await addTorrentToClient(client, torrentInput!, torrentId!);
    const response = await buildTorrentResponse(torrent, torrentId!);
    //TODO: check file upload response type
    // if (isFileUpload) response.uploadedFileName = req.file.originalname;
    res.json(response);
  } catch (error: any) {
    console.error("Error getting torrent info:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to get torrent information" });
  }
};

export const streamTorrent = async (req: any, res: any) => {
  const { magnet, torrent_id, file_index } = req.query as Record<
    string,
    string
  >;
  const fileIndex = parseInt(String(file_index || "0"), 10) || 0;
  const torrentIdentifier = magnet || torrent_id;
  if (!torrentIdentifier)
    return res
      .status(400)
      .json({ error: "Either magnet URI or torrent_id is required" });

  try {
    const torrentData = getTorrentData(torrentIdentifier, magnet || null);
    if (!torrentData)
      return res
        .status(404)
        .json({ error: "Torrent not found. Please load torrent info first." });
    const torrent = torrentData.torrent;
    if (!torrent.ready)
      return res
        .status(202)
        .json({ error: "Torrent not ready yet. Please wait." });

    const file = torrent.files[fileIndex];
    if (!file) return res.status(404).json({ error: "File not found" });

    await createVideoStream({ torrentIdentifier, fileIndex, file, req, res });
  } catch (error: any) {
    console.error("Error starting stream:", error);
    if (!res.headersSent)
      res
        .status(500)
        .json({ error: error.message || "Failed to start stream" });
  }
};

export const stopStream = async (req: any, res: any) => {
  const { magnet, torrent_id, file_index } = req.query as Record<
    string,
    string
  >;
  const fileIndex = parseInt(String(file_index || "0"), 10) || 0;
  const torrentIdentifier = magnet || torrent_id;
  if (!torrentIdentifier)
    return res
      .status(400)
      .json({ error: "Either magnet URI or torrent_id is required" });
  const streamId = getStreamId(torrentIdentifier, fileIndex);
  try {
    const result = await stopStreamService(streamId);
    if (result.success)
      return res.json({
        message: "Stream stopped successfully",
        cleanupDuration: result.duration,
        streamId,
      });
    if (result.reason === "not_found")
      return res.json({ message: "Stream not found or already stopped" });
    return res.status(500).json({
      message: "Stream stop initiated but cleanup failed",
      error: result.reason,
      streamId,
    });
  } catch (error: any) {
    console.error(`Error stopping stream ${streamId}:`, error);
    res.status(500).json({
      message: "Error stopping stream",
      error: error.message,
      streamId,
    });
  }
};

export const listStreams = (_req: any, res: any) => {
  try {
    const info = getStreamsInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: "Failed to list streams" });
  }
};

export const listTorrents = (_req: any, res: any) => {
  try {
    const info = getTorrentsInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: "Failed to list torrents" });
  }
};

export const removeTorrent = (req: any, res: any) => {
  const { magnet, torrent_id } = req.query as Record<string, string>;
  const torrentIdentifier = magnet || torrent_id;
  if (!torrentIdentifier)
    return res
      .status(400)
      .json({ error: "Either magnet URI or torrent_id is required" });
  try {
    const result = removeTorrentService(torrentIdentifier, magnet || null);
    if (result.success) return res.json({ message: result.message });
    return res.status(404).json({ message: result.message });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "Failed to remove torrent", details: e?.message });
  }
};
