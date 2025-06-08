import { query } from "../services/database.js";
import * as anilistService from "../services/anilistService.js";
import * as torrentService from "../services/torrentService.js";
import { formatBytes } from "../utils/helpers.js";

// Search anime
export const searchAnime = async (req, res) => {
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
};

// Get trending anime
export const getTrendingAnime = async (req, res) => {
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
};

// Get popular anime
export const getPopularAnime = async (req, res) => {
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
};

// Get anime details
// TODO: GET the MAL_ID from JIKAN_API_URL and store it in the database.
export const getAnimeDetails = async (req, res) => {
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
      // TODO: fix updated_now column does not exist relation to anime table
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
};

// Search torrents for anime
export const getAnimeTorrents = async (req, res) => {
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

    // Get anime details
    const anime = await getAnimeFromCacheOrApi(animeId);
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
    await cacheTorrentsInDatabase(animeId, limitedTorrents);

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
};

// Get episodes for an anime
// TODO: use JIKAN_API_URL for fetching list of episodes with pagination
export const getAnimeEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    console.log(`📋 Fetching episodes for anime ${animeId}`);

    // Get anime details
    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    // Generate episode list
    const episodes = [];
    const totalEpisodes = anime.episodes || 12; // Default to 12 if unknown

    for (let i = 1; i <= totalEpisodes; i++) {
      const torrents = await getCachedTorrentsForEpisode(animeId, i);

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
};

// Search general torrents
export const searchTorrents = async (req, res) => {
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
};

// Helper functions
const getAnimeFromCacheOrApi = async (animeId) => {
  try {
    // Try database first
    const dbResult = await query("SELECT * FROM anime WHERE anilist_id = $1", [
      animeId,
    ]);

    if (dbResult.rows.length > 0) {
      return dbResult.rows[0];
    }

    // Fetch from AniList if not in cache
    return await anilistService.getAnimeDetails(animeId);
  } catch (error) {
    console.warn("⚠️ Database error, fetching from AniList:", error.message);
    return await anilistService.getAnimeDetails(animeId);
  }
};

const getCachedTorrentsForEpisode = async (animeId, episodeNumber) => {
  try {
    const torrentResult = await query(
      `
      SELECT * FROM episode_torrents 
      WHERE anime_id = $1 AND episode_number = $2 
      ORDER BY seeders DESC, quality ASC
      LIMIT 10
    `,
      [animeId, episodeNumber]
    );

    return torrentResult.rows.map((row) => ({
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
    console.warn(
      `⚠️ No cached torrents for episode ${episodeNumber}:`,
      error.message
    );
    return [];
  }
};

const cacheTorrentsInDatabase = async (animeId, torrents) => {
  for (const torrent of torrents) {
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
};
