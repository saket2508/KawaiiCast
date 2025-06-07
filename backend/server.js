import express from "express";
import cors from "cors";
import WebTorrent from "webtorrent";
import rangeParser from "range-parser";
import mime from "mime-types";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize WebTorrent client
const client = new WebTorrent();

// Storage for active torrents and streams
const activeTorrents = new Map(); // magnetURI -> torrent object
const activeStreams = new Map(); // streamId -> stream info

// Middleware
app.use(morgan("combined"));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json());

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getStreamId = (magnetURI, fileIndex) => {
  return `${Buffer.from(magnetURI)
    .toString("base64")
    .slice(0, 16)}_${fileIndex}`;
};

const isVideoFile = (filename) => {
  const videoExtensions = [
    "mp4",
    "webm",
    "mov",
    "mkv",
    "avi",
    "m4v",
    "wmv",
    "flv",
  ];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && videoExtensions.includes(ext);
};

const isAudioFile = (filename) => {
  const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && audioExtensions.includes(ext);
};

// WebTorrent client event handlers
client.on("error", (err) => {
  console.error("WebTorrent client error:", err);
});

// API Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeTorrents: activeTorrents.size,
    activeStreams: activeStreams.size,
    webTorrentRatio: client.ratio,
    downloadSpeed: formatBytes(client.downloadSpeed),
    uploadSpeed: formatBytes(client.uploadSpeed),
  });
});

// Get torrent info
app.get("/torrent/info", async (req, res) => {
  const { magnet } = req.query;

  if (!magnet) {
    return res.status(400).json({ error: "Magnet URI is required" });
  }

  if (!magnet.startsWith("magnet:")) {
    return res.status(400).json({ error: "Invalid magnet URI" });
  }

  try {
    // Check if we already have this torrent
    let torrent = activeTorrents.get(magnet);

    if (!torrent) {
      // Add new torrent
      console.log("Adding torrent:", magnet.slice(0, 100) + "...");

      torrent = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout: Could not fetch torrent metadata"));
        }, 30000);

        const newTorrent = client.add(magnet, {
          destroyStoreOnDestroy: true,
          storeCacheSlots: 20,
        });

        newTorrent.on("ready", () => {
          clearTimeout(timeoutId);
          console.log("Torrent ready:", newTorrent.name);
          activeTorrents.set(magnet, newTorrent);
          resolve(newTorrent);
        });

        newTorrent.on("error", (err) => {
          clearTimeout(timeoutId);
          console.error("Torrent error:", err);
          reject(err);
        });
      });
    }

    // Prepare file information
    const files = torrent.files.map((file, index) => ({
      index,
      name: file.name,
      size: file.length,
      path: file.path,
      isVideo: isVideoFile(file.name),
      isAudio: isAudioFile(file.name),
      isPlayable: isVideoFile(file.name) || isAudioFile(file.name),
    }));

    // Sort files: playable first, then by size
    files.sort((a, b) => {
      if (a.isPlayable && !b.isPlayable) return -1;
      if (!a.isPlayable && b.isPlayable) return 1;
      return b.size - a.size;
    });

    const response = {
      name: torrent.name,
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI,
      files,
      totalSize: torrent.length,
      progress: Math.round(torrent.progress * 100),
      downloadSpeed: formatBytes(torrent.downloadSpeed),
      uploadSpeed: formatBytes(torrent.uploadSpeed),
      numPeers: torrent.numPeers,
      ready: torrent.ready,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting torrent info:", error);
    res.status(500).json({
      error: error.message || "Failed to get torrent information",
    });
  }
});

// Stream torrent file
app.get("/stream", async (req, res) => {
  const { magnet, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;

  console.log(
    `Stream request: magnet=${magnet?.slice(0, 50)}..., file_index=${fileIndex}`
  );

  if (!magnet) {
    return res.status(400).json({ error: "Magnet URI is required" });
  }

  try {
    const torrent = activeTorrents.get(magnet);

    if (!torrent) {
      return res
        .status(404)
        .json({ error: "Torrent not found. Please load torrent info first." });
    }

    if (!torrent.ready) {
      return res
        .status(202)
        .json({ error: "Torrent not ready yet. Please wait." });
    }

    const file = torrent.files[fileIndex];

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const streamId = getStreamId(magnet, fileIndex);
    console.log(
      `Starting stream for: ${file.name} (${formatBytes(file.length)})`
    );

    // Store stream info
    activeStreams.set(streamId, {
      magnet,
      fileIndex,
      fileName: file.name,
      fileSize: file.length,
      startTime: Date.now(),
    });

    // Handle range requests for video seeking
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

    // Set appropriate headers
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
      res.status(206); // Partial Content
    } else {
      res.status(200);
    }

    res.set(headers);

    // Create file stream
    const stream = file.createReadStream({ start, end });

    // Handle stream events
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

    // Pipe the stream to response
    stream.pipe(res);
  } catch (error) {
    console.error("Error starting stream:", error);
    res.status(500).json({
      error: error.message || "Failed to start stream",
    });
  }
});

// Stop stream
app.delete("/stream", (req, res) => {
  const { magnet, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;
  const streamId = getStreamId(magnet, fileIndex);

  if (activeStreams.has(streamId)) {
    activeStreams.delete(streamId);
    console.log(`Stream stopped: ${streamId}`);
    res.json({ message: "Stream stopped" });
  } else {
    res.json({ message: "Stream not found or already stopped" });
  }
});

// List active streams
app.get("/streams", (req, res) => {
  const streams = Array.from(activeStreams.entries()).map(([id, info]) => ({
    id,
    ...info,
    duration: Date.now() - info.startTime,
  }));

  res.json({
    activeStreams: activeStreams.size,
    streams,
  });
});

// Remove torrent
app.delete("/torrent", (req, res) => {
  const { magnet } = req.query;

  if (!magnet) {
    return res.status(400).json({ error: "Magnet URI is required" });
  }

  const torrent = activeTorrents.get(magnet);
  if (torrent) {
    console.log("Removing torrent:", torrent.name);

    // Stop all related streams
    const streamsToStop = Array.from(activeStreams.entries())
      .filter(([_, info]) => info.magnet === magnet)
      .map(([id]) => id);

    streamsToStop.forEach((id) => activeStreams.delete(id));

    // Remove torrent
    torrent.destroy();
    activeTorrents.delete(magnet);

    res.json({
      message: "Torrent removed",
      stoppedStreams: streamsToStop.length,
    });
  } else {
    res.json({ message: "Torrent not found" });
  }
});

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");

  // Destroy all torrents
  activeTorrents.forEach((torrent) => torrent.destroy());

  // Destroy WebTorrent client
  client.destroy(() => {
    console.log("WebTorrent client destroyed");
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WebTorrent Streaming Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
