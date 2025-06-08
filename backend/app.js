import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

// Import configuration
import { createWebTorrentClient, corsOptions } from "./config/webTorrent.js";

// Import routes
import torrentRoutes from "./routes/torrentRoutes.js";
import animeRoutes from "./routes/animeRoutes.js";

// Import controllers for cleanup
import { activeTorrents } from "./controllers/torrentController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize WebTorrent client
const client = createWebTorrentClient();

// Store client in app locals for access in controllers
app.locals.webTorrentClient = client;

// WebTorrent client event handlers
client.on("error", (err) => {
  console.error("WebTorrent client error:", err);
});

// Middleware
app.use(morgan("combined"));
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/", torrentRoutes);
app.use("/api", animeRoutes);

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
