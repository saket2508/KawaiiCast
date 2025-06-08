import express from "express";
import { upload } from "../middleware/upload.js";
import * as torrentController from "../controllers/torrentController.js";

const router = express.Router();

// Health check
router.get("/health", torrentController.getHealth);

// Get torrent info (GET - magnet URI)
router.get("/torrent/info", torrentController.getTorrentInfo);

// Get torrent info (POST - supports both magnet URIs and torrent files)
router.post(
  "/torrent/info",
  upload.single("torrent"),
  torrentController.postTorrentInfo
);

// Stream torrent file
router.get("/stream", torrentController.streamTorrent);

// Stop stream
router.delete("/stream", torrentController.stopStream);

// List active streams
router.get("/streams", torrentController.listStreams);

// Remove torrent
router.delete("/torrent", torrentController.removeTorrent);

export default router;
