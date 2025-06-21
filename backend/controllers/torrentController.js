import rangeParser from "range-parser";
import mime from "mime-types";
import {
  formatBytes,
  getStreamId,
  getTorrentId,
  prepareFileInfo,
  sortFiles,
} from "../utils/helpers.js";

// Storage for active torrents and streams
export const activeTorrents = new Map(); // torrentId -> torrent object
export const activeStreams = new Map(); // streamId -> stream info

// Health check
export const getHealth = (req, res) => {
  const client = req.app.locals.webTorrentClient;

  res.json({
    status: "ok",
    activeTorrents: activeTorrents.size,
    activeStreams: activeStreams.size,
    webTorrentRatio: client.ratio,
    downloadSpeed: formatBytes(client.downloadSpeed),
    uploadSpeed: formatBytes(client.uploadSpeed),
  });
};

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
    const response = buildTorrentResponse(torrent, magnet);

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
    console.log("Processing uploaded torrent file:", req.file.originalname);
  }
  // Handle JSON payload
  else if (req.body) {
    const { magnet, torrentData } = req.body;
    console.log("magnet:", magnet);
    console.log("torrentData:", torrentData);

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
    console.log(
      "Processing torrent:",
      magnet ? magnet.slice(0, 100) + "..." : "from base64 data"
    );
  } else {
    return res.status(400).json({
      error: "Either magnet URI, torrent file data, or file upload is required",
    });
  }

  try {
    const client = req.app.locals.webTorrentClient;
    const torrent = await addTorrentToClient(client, torrentInput, torrentId);
    const response = buildTorrentResponse(torrent, torrentId);

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

  console.log(
    `Stream request: identifier=${torrentIdentifier?.slice(
      0,
      50
    )}..., file_index=${fileIndex}`
  );

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  try {
    // Find torrent
    let torrent = activeTorrents.get(torrentIdentifier);
    if (!torrent && magnet) {
      torrent = activeTorrents.get(magnet);
    }

    if (!torrent) {
      return res.status(404).json({
        error: "Torrent not found. Please load torrent info first.",
      });
    }

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
    console.log(
      `Starting stream for: ${file.name} (${formatBytes(file.length)})`
    );

    // Store stream info
    activeStreams.set(streamId, {
      torrentIdentifier,
      fileIndex,
      fileName: file.name,
      fileSize: file.length,
      startTime: Date.now(),
    });

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

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error" });
      }
    });

    req.on("close", () => {
      console.log("Client disconnected, destroying stream");
      stream.destroy();
      activeStreams.delete(streamId);
    });

    req.on("aborted", () => {
      console.log("Request aborted, destroying stream");
      stream.destroy();
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
    console.log(`Stream stopped: ${streamId}`);
    res.json({ message: "Stream stopped" });
  } else {
    res.json({ message: "Stream not found or already stopped" });
  }
};

// List active streams
export const listStreams = (req, res) => {
  const streams = Array.from(activeStreams.entries()).map(([id, info]) => ({
    id,
    ...info,
    duration: Date.now() - info.startTime,
  }));

  res.json({
    activeStreams: activeStreams.size,
    streams,
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
  let torrent = activeTorrents.get(torrentIdentifier);
  let actualKey = torrentIdentifier;

  if (!torrent && magnet) {
    torrent = activeTorrents.get(magnet);
    actualKey = magnet;
  }

  if (torrent) {
    console.log("Removing torrent:", torrent.name);

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
  // Check if we already have this torrent in our Map
  let torrent = activeTorrents.get(torrentId);

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
      console.log(
        "Found existing torrent in client, reusing:",
        existingTorrent.name
      );
      activeTorrents.set(torrentId, existingTorrent);
      return existingTorrent;
    }

    console.log(
      "Adding torrent:",
      typeof torrentInput === "string"
        ? torrentInput.slice(0, 100) + "..."
        : "from buffer"
    );

    torrent = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timeout: Could not fetch torrent metadata"));
      }, 120000);

      try {
        const newTorrent = client.add(torrentInput, {
          destroyStoreOnDestroy: true,
          storeCacheSlots: 20,
        });

        newTorrent.on("ready", () => {
          clearTimeout(timeoutId);
          console.log("Torrent ready:", newTorrent.name);
          activeTorrents.set(torrentId, newTorrent);
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
                console.log(
                  "Found duplicate torrent, reusing:",
                  existingTorrent.name
                );
                activeTorrents.set(torrentId, existingTorrent);
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
  }

  return torrent;
};

const buildTorrentResponse = (torrent, torrentId) => {
  const files = prepareFileInfo(torrent.files);
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
