import express from "express";
import * as animeController from "../controllers/animeController.js";

const router = express.Router();

// Search anime
router.get("/anime/search", animeController.searchAnime);

// Get trending anime
router.get("/anime/trending", animeController.getTrendingAnime);

// Get popular anime
router.get("/anime/popular", animeController.getPopularAnime);

// Get anime details
router.get("/anime/:id", animeController.getAnimeDetails);

// Search torrents for anime
router.get("/anime/:id/torrents", animeController.getAnimeTorrents);

// Get episodes for an anime (with torrent data)
router.get("/anime/:id/episodes", animeController.getAnimeEpisodes);

// Search general torrents (fallback)
router.get("/torrents/search", animeController.searchTorrents);

export default router;
