import express from "express";
import cors from "cors";
import WebTorrent from "webtorrent";
import rangeParser from "range-parser";
import mime from "mime-types";
import morgan from "morgan";
import multer from "multer";
import dotenv from "dotenv";

// Import our services
import { query } from "./services/database.js";
import * as anilistService from "./services/anilistService.js";
import * as torrentService from "./services/torrentService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize WebTorrent client
const client = new WebTorrent();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .torrent files
    if (
      file.originalname.endsWith(".torrent") ||
      file.mimetype === "application/x-bittorrent"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .torrent files are allowed"), false);
    }
  },
});

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
app.use(express.json({ limit: "50mb" })); // Increase limit for torrent files

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getStreamId = (torrentIdentifier, fileIndex) => {
  return `${Buffer.from(torrentIdentifier)
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

// Utility function to generate a unique identifier for torrents
const getTorrentId = (input) => {
  if (typeof input === "string" && input.startsWith("magnet:")) {
    return input; // Use magnet URI directly
  }
  // For torrent files, create a hash-based identifier
  return `torrent_${Buffer.from(input).toString("base64").slice(0, 32)}`;
};

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

// Get torrent info (supports both magnet URIs and torrent files)
app.post("/torrent/info", upload.single("torrent"), async (req, res) => {
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

    // Validate input - either magnet or torrentData is required
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
  }
  // No valid input
  else {
    return res.status(400).json({
      error: "Either magnet URI, torrent file data, or file upload is required",
    });
  }

  try {
    // Check if we already have this torrent
    let torrent = activeTorrents.get(torrentId);

    if (!torrent) {
      // Add new torrent
      torrent = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout: Could not fetch torrent metadata"));
        }, 30000);

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
      torrentId, // Include the ID we use internally
      files,
      totalSize: torrent.length,
      progress: Math.round(torrent.progress * 100),
      downloadSpeed: formatBytes(torrent.downloadSpeed),
      uploadSpeed: formatBytes(torrent.uploadSpeed),
      numPeers: torrent.numPeers,
      ready: torrent.ready,
    };

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
});

// Stream torrent file
app.get("/stream", async (req, res) => {
  const { magnet, torrent_id, file_index } = req.query;
  const fileIndex = parseInt(file_index) || 0;

  // Support both magnet URI and torrent ID
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
    // Try to find torrent by magnet URI first, then by torrent ID
    let torrent = activeTorrents.get(torrentIdentifier);

    // If not found and it's a magnet URI, try to find by magnet
    if (!torrent && magnet) {
      torrent = activeTorrents.get(magnet);
    }

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
  const { magnet, torrent_id } = req.query;
  const torrentIdentifier = magnet || torrent_id;

  if (!torrentIdentifier) {
    return res.status(400).json({
      error: "Either magnet URI or torrent_id is required",
    });
  }

  // Try to find torrent by identifier
  let torrent = activeTorrents.get(torrentIdentifier);
  let actualKey = torrentIdentifier;

  // If not found and we have a magnet, try to find by magnet
  if (!torrent && magnet) {
    torrent = activeTorrents.get(magnet);
    actualKey = magnet;
  }

  if (torrent) {
    console.log("Removing torrent:", torrent.name);

    // Stop all related streams - check both magnet and torrent_id
    const streamsToStop = Array.from(activeStreams.entries())
      .filter(
        ([_, info]) =>
          info.torrentIdentifier === torrentIdentifier ||
          (magnet && info.magnet === magnet) ||
          info.magnet === torrentIdentifier // backwards compatibility
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
});

// =============================================================================
// ANIME API ENDPOINTS
// =============================================================================

// Search anime
app.get("/api/anime/search", async (req, res) => {
  try {
    const { query: searchQuery, page = 1, limit = 20 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    console.log(`🔍 Anime search: "${searchQuery}" (page ${page})`);

    const results = await anilistService.searchAnime(
      searchQuery,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      query: searchQuery,
      page: parseInt(page),
      ...results,
    });
  } catch (error) {
    console.error("❌ Anime search error:", error);
    res.status(500).json({
      error: "Failed to search anime",
      message: error.message,
    });
  }
});

// Get trending anime
app.get("/api/anime/trending", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    console.log(`📈 Fetching trending anime (page ${page})`);

    const results = await anilistService.getTrendingAnime(
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      results,
      page: parseInt(page),
    });
  } catch (error) {
    console.error("❌ Trending anime error:", error);
    res.status(500).json({
      error: "Failed to fetch trending anime",
      message: error.message,
    });
  }
});

// Get popular anime
app.get("/api/anime/popular", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    console.log(`⭐ Fetching popular anime (page ${page})`);

    const results = await anilistService.getPopularAnime(
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      results,
      page: parseInt(page),
    });
  } catch (error) {
    console.error("❌ Popular anime error:", error);
    res.status(500).json({
      error: "Failed to fetch popular anime",
      message: error.message,
    });
  }
});

// Get anime details
app.get("/api/anime/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    console.log(`📺 Fetching anime details: ${animeId}`);

    // Get from AniList
    const animeDetails = await anilistService.getAnimeDetails(animeId);

    // Cache in database
    try {
      await query(
        `
        INSERT INTO anime (
          anilist_id, title, title_english, description, cover_image, 
          banner_image, episodes, status, year, genres, score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (anilist_id) DO UPDATE SET
          title = EXCLUDED.title,
          title_english = EXCLUDED.title_english,
          description = EXCLUDED.description,
          cover_image = EXCLUDED.cover_image,
          banner_image = EXCLUDED.banner_image,
          episodes = EXCLUDED.episodes,
          status = EXCLUDED.status,
          year = EXCLUDED.year,
          genres = EXCLUDED.genres,
          score = EXCLUDED.score,
          updated_at = NOW()
      `,
        [
          animeDetails.anilistId,
          animeDetails.title,
          animeDetails.titleEnglish,
          animeDetails.description,
          animeDetails.coverImage,
          animeDetails.bannerImage,
          animeDetails.episodes,
          animeDetails.status,
          animeDetails.year,
          animeDetails.genres,
          animeDetails.score,
        ]
      );
    } catch (dbError) {
      console.warn("⚠️ Failed to cache anime in database:", dbError.message);
    }

    res.json({
      success: true,
      anime: animeDetails,
    });
  } catch (error) {
    console.error("❌ Anime details error:", error);
    res.status(500).json({
      error: "Failed to fetch anime details",
      message: error.message,
    });
  }
});

// Search torrents for anime
app.get("/api/anime/:id/torrents", async (req, res) => {
  try {
    const { id } = req.params;
    const { episode, quality, limit = 50 } = req.query;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    console.log(
      `🔍 Searching torrents for anime ${animeId}, episode ${episode || "all"}`
    );

    // Get anime details first
    let anime;
    try {
      const dbResult = await query(
        "SELECT * FROM anime WHERE anilist_id = $1",
        [animeId]
      );
      if (dbResult.rows.length > 0) {
        anime = dbResult.rows[0];
      } else {
        // Fetch from AniList if not in cache
        anime = await anilistService.getAnimeDetails(animeId);
      }
    } catch (error) {
      anime = await anilistService.getAnimeDetails(animeId);
    }

    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    const animeTitle = anime.title_english || anime.title || anime.titleEnglish;
    const episodeNumber = episode ? parseInt(episode) : null;

    // Search torrents
    const torrents = await torrentService.searchAnimeTorrents(
      animeTitle,
      episodeNumber
    );

    // Filter by quality if specified
    let filteredTorrents = torrents;
    if (quality) {
      filteredTorrents = torrents.filter((t) =>
        t.quality.toLowerCase().includes(quality.toLowerCase())
      );
    }

    // Get best torrents
    const bestTorrents = torrentService.getBestTorrents(
      filteredTorrents,
      episodeNumber
    );

    // Limit results
    const limitedTorrents = bestTorrents.slice(0, parseInt(limit));

    // Cache results in database
    for (const torrent of limitedTorrents) {
      try {
        await query(
          `
          INSERT INTO episode_torrents (
            anime_id, episode_number, title, magnet_uri, size_bytes, 
            seeders, quality, release_group
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (anime_id, episode_number, magnet_uri) DO UPDATE SET
            seeders = EXCLUDED.seeders,
            cached_at = NOW()
        `,
          [
            animeId,
            torrent.episodeNumber,
            torrent.title,
            torrent.magnet,
            torrent.size,
            torrent.seeders,
            torrent.quality,
            torrent.releaseGroup,
          ]
        );
      } catch (dbError) {
        console.warn("⚠️ Failed to cache torrent:", dbError.message);
      }
    }

    res.json({
      success: true,
      anime: {
        id: animeId,
        title: animeTitle,
      },
      episode: episodeNumber,
      torrents: limitedTorrents,
      total: limitedTorrents.length,
    });
  } catch (error) {
    console.error("❌ Anime torrents error:", error);
    res.status(500).json({
      error: "Failed to search anime torrents",
      message: error.message,
    });
  }
});

// Get episodes for an anime (with torrent data)
app.get("/api/anime/:id/episodes", async (req, res) => {
  try {
    const { id } = req.params;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    console.log(`📋 Fetching episodes for anime ${animeId}`);

    // Get anime details
    let anime;
    try {
      const dbResult = await query(
        "SELECT * FROM anime WHERE anilist_id = $1",
        [animeId]
      );
      anime = dbResult.rows[0];
    } catch (error) {
      console.warn("⚠️ Database error, fetching from AniList:", error.message);
    }

    if (!anime) {
      // Fetch from AniList
      const animeDetails = await anilistService.getAnimeDetails(animeId);
      anime = animeDetails;
    }

    // Generate episode list
    const episodes = [];
    const totalEpisodes = anime.episodes || 12; // Default to 12 if unknown

    for (let i = 1; i <= totalEpisodes; i++) {
      // Get cached torrents for this episode
      let torrents = [];
      try {
        const torrentResult = await query(
          `
          SELECT * FROM episode_torrents 
          WHERE anime_id = $1 AND episode_number = $2 
          ORDER BY seeders DESC, quality ASC
          LIMIT 10
        `,
          [animeId, i]
        );

        torrents = torrentResult.rows.map((row) => ({
          title: row.title,
          magnet: row.magnet_uri,
          size: row.size_bytes,
          sizeText: formatBytes(row.size_bytes),
          seeders: row.seeders,
          quality: row.quality,
          releaseGroup: row.release_group,
          episodeNumber: row.episode_number,
        }));
      } catch (error) {
        console.warn(`⚠️ No cached torrents for episode ${i}:`, error.message);
      }

      episodes.push({
        number: i,
        title: `Episode ${i}`,
        torrents: torrents,
        hasTorrents: torrents.length > 0,
      });
    }

    res.json({
      success: true,
      anime: {
        id: animeId,
        title: anime.title_english || anime.title || anime.titleEnglish,
        totalEpisodes: totalEpisodes,
      },
      episodes: episodes,
    });
  } catch (error) {
    console.error("❌ Episodes error:", error);
    res.status(500).json({
      error: "Failed to fetch episodes",
      message: error.message,
    });
  }
});

// Search general torrents (fallback)
app.get("/api/torrents/search", async (req, res) => {
  try {
    const { query: searchQuery, episode, limit = 20 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    console.log(`🔍 General torrent search: "${searchQuery}"`);

    const episodeNumber = episode ? parseInt(episode) : null;
    const torrents = await torrentService.searchAnimeTorrents(
      searchQuery,
      episodeNumber
    );

    const limitedTorrents = torrents.slice(0, parseInt(limit));

    res.json({
      success: true,
      query: searchQuery,
      episode: episodeNumber,
      torrents: limitedTorrents,
      total: limitedTorrents.length,
    });
  } catch (error) {
    console.error("❌ Torrent search error:", error);
    res.status(500).json({
      error: "Failed to search torrents",
      message: error.message,
    });
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
