import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

// Import configuration
import { corsOptions } from "./config/webTorrent.js";

// Import routes
import torrentRoutes from "./routes/torrentRoutes.js";
import animeRoutes from "./routes/animeRoutes.js";

// Import services
import { startCleanupTimer, stopCleanupTimer } from "./services/cleanupService.js";
import { destroyAllTorrents } from "./services/torrentManager.js";
import { initializeClientManager, gracefulClientShutdown } from "./services/clientManager.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize WebTorrent client with error handling and recovery
const client = initializeClientManager(app);

// Middleware
app.use(morgan("combined"));
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/", torrentRoutes);
app.use("/api", animeRoutes);

// Cleanup on exit
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");

  // Stop the cleanup timer
  stopCleanupTimer();

  // Destroy all torrents
  destroyAllTorrents();

  // Gracefully shutdown WebTorrent client
  await gracefulClientShutdown(client);
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WebTorrent Streaming Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  // Start the stream cleanup timer
  startCleanupTimer();
});

export default app;
