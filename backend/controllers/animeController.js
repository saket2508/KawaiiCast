import { query } from "../services/database.js";
import * as anilistService from "../services/anilistService.js";
import * as jikanService from "../services/jikanService.js";
import * as torrentService from "../services/torrentService.js";
import { formatBytes } from "../utils/helpers.js";

// Search anime
export const searchAnime = async (req, res) => {
  try {
    const { query: searchQuery, page = 1, limit = 20 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

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
export const getAnimeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    // Get from AniList
    const animeDetails = await anilistService.getAnimeDetails(animeId);

    // Cache in database
    // TODO: store titleRomaji in the db
    try {
      await query(
        `
        INSERT INTO anime (
          anilist_id, mal_id, title, title_english, title_romaji, description, cover_image, 
          banner_image, episodes, status, year, genres, score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (anilist_id) DO UPDATE SET
          mal_id = EXCLUDED.mal_id,
          title = EXCLUDED.title,
          title_english = EXCLUDED.title_english,
          title_romaji = EXCLUDED.title_romaji,
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
          animeDetails.id,
          animeDetails.malId,
          animeDetails.title,
          animeDetails.titleEnglish,
          animeDetails.titleRomaji,
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

    // Get anime details
    const anime = await getAnimeFromCacheOrApi(animeId);

    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    const animeTitle = anime.titleEnglish || anime.title;
    const romajiTitle = anime.titleRomaji || null;
    const episodeNumber = episode ? parseInt(episode) : null;

    const { aids, eids } = await torrentService.getAnimeToshoIds(
      animeId,
      episodeNumber
    );

    // Search torrents
    const torrents = await torrentService.searchAnimeTorrents(
      animeTitle,
      episodeNumber,
      aids,
      eids,
      "all",
      romajiTitle ? [romajiTitle] : []
    );
    // Filter by quality if specified
    let filteredTorrents = torrents;
    if (quality) {
      filteredTorrents = torrents.filter((t) =>
        t.quality.toLowerCase().includes(quality.toLowerCase())
      );
    }

    const bestTorrents = torrentService.getBestTorrents(
      filteredTorrents,
      episodeNumber
    );

    const limitedTorrents = bestTorrents.slice(0, parseInt(limit));

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

// Get episodes for an anime with detailed metadata from JIKAN API
export const getAnimeEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    // Get anime details (which now includes MAL ID)
    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    let episodes = [];
    let pagination = {};
    const totalEpisodes = anime.episodes || 12;

    // Try to get detailed episodes from JIKAN API if we have MAL ID
    if (anime.malId) {
      try {
        const malId = anime.malId;

        const episodeData = await jikanService.getAnimeEpisodes(
          malId,
          parseInt(page)
        );

        if (episodeData.episodes && episodeData.episodes.length > 0) {
          // Cache episodes and add torrent data
          const episodesWithTorrents = await Promise.all(
            episodeData.episodes.map(async (episode) => {
              // Cache episode data in database
              await cacheEpisodeInDatabase(animeId, episode);

              // Get torrents for this episode
              const torrents = await getCachedTorrentsForEpisode(
                animeId,
                episode.number
              );
              return {
                ...episode,
                torrents: torrents,
                hasTorrents: torrents.length > 0,
              };
            })
          );

          episodes = episodesWithTorrents;
          pagination = episodeData.pagination;
        }
      } catch (jikanError) {
        console.warn(
          "⚠️ Failed to fetch from JIKAN API, falling back to basic episode list:",
          jikanError.message
        );
      }
    }

    // Fallback: Generate basic episode list if JIKAN API failed or no MAL ID
    if (episodes.length === 0) {
      for (let i = 1; i <= totalEpisodes; i++) {
        const torrents = await getCachedTorrentsForEpisode(animeId, i);

        episodes.push({
          number: i,
          title: `Episode ${i}`,
          aired: null,
          filler: false,
          recap: false,
          synopsis: null,
          torrents: torrents,
          hasTorrents: torrents.length > 0,
        });
      }
    }

    res.json({
      success: true,
      anime: {
        id: animeId,
        title: anime.titleEnglish || anime.title,
        malId: anime.malId,
        totalEpisodes: totalEpisodes,
      },
      episodes: episodes,
      pagination: pagination,
      page: parseInt(page),
    });
  } catch (error) {
    console.error("❌ Episodes error:", error);
    res.status(500).json({
      error: "Failed to fetch episodes",
      message: error.message,
    });
  }
};

// Get specific episode details
export const getEpisodeDetails = async (req, res) => {
  try {
    const { id, episodeNumber } = req.params;
    const animeId = parseInt(id);
    const epNumber = parseInt(episodeNumber);

    if (!animeId || !epNumber) {
      return res.status(400).json({
        error: "Valid anime ID and episode number are required",
      });
    }

    // Get anime details to get MAL ID
    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    // First try to get from database cache
    let episodeDetails = await getCachedEpisodeFromDatabase(animeId, epNumber);

    // If not cached and we have MAL ID, fetch from JIKAN API
    if (!episodeDetails && anime.malId) {
      try {
        const malId = anime.malId;
        episodeDetails = await jikanService.getEpisodeDetails(malId, epNumber);

        // Cache the episode data if we got it successfully
        if (episodeDetails) {
          await cacheEpisodeInDatabase(animeId, episodeDetails);
        }
      } catch (jikanError) {
        console.warn(
          "⚠️ Failed to fetch episode details from JIKAN API:",
          jikanError.message
        );
      }
    }

    // Fallback to basic episode info if both cache and API failed
    if (!episodeDetails) {
      episodeDetails = {
        number: epNumber,
        title: `Episode ${epNumber}`,
        aired: null,
        filler: false,
        recap: false,
        synopsis: null,
      };
    }

    // Get torrents for this episode
    const torrents = await getCachedTorrentsForEpisode(animeId, epNumber);

    res.json({
      success: true,
      anime: {
        id: animeId,
        title: anime.titleEnglish || anime.title,
        malId: anime.malId,
      },
      episode: {
        ...episodeDetails,
        torrents: torrents,
        hasTorrents: torrents.length > 0,
      },
    });
  } catch (error) {
    console.error("❌ Episode details error:", error);
    res.status(500).json({
      error: "Failed to fetch episode details",
      message: error.message,
    });
  }
};

// Get anime with all detailed episodes (convenience endpoint)
export const getAnimeWithAllEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    const animeId = parseInt(id);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    // Get anime details
    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    let allEpisodes = [];

    // Try to get all detailed episodes from JIKAN API if we have MAL ID
    if (anime.malId) {
      try {
        const malId = anime.malId;

        const episodes = await jikanService.getAllAnimeEpisodes(malId);

        // Cache episodes and add torrent data
        allEpisodes = await Promise.all(
          episodes.map(async (episode) => {
            await cacheEpisodeInDatabase(animeId, episode);
            const torrents = await getCachedTorrentsForEpisode(
              animeId,
              episode.number
            );
            return {
              ...episode,
              torrents: torrents,
              hasTorrents: torrents.length > 0,
            };
          })
        );
      } catch (jikanError) {
        console.warn(
          "⚠️ Failed to fetch all episodes from JIKAN API:",
          jikanError.message
        );
      }
    }

    // Fallback: Generate basic episode list if JIKAN API failed
    if (allEpisodes.length === 0) {
      const totalEpisodes = anime.episodes || 12;
      for (let i = 1; i <= totalEpisodes; i++) {
        const torrents = await getCachedTorrentsForEpisode(animeId, i);
        allEpisodes.push({
          number: i,
          title: `Episode ${i}`,
          aired: null,
          filler: false,
          recap: false,
          synopsis: null,
          torrents: torrents,
          hasTorrents: torrents.length > 0,
        });
      }
    }

    res.json({
      success: true,
      anime: {
        ...anime,
        totalEpisodes: allEpisodes.length,
      },
      episodes: allEpisodes,
      episodeCount: allEpisodes.length,
    });
  } catch (error) {
    console.error("❌ Complete anime data error:", error);
    res.status(500).json({
      error: "Failed to fetch complete anime data",
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
      const anime = dbResult.rows[0];
      // Normalize DB result to match API result from formatAnimeData
      return {
        id: anime.anilist_id,
        anilistId: anime.anilist_id,
        malId: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english,
        titleRomaji: anime.title_romaji,
        description: anime.description,
        coverImage: anime.cover_image,
        bannerImage: anime.banner_image,
        episodes: anime.episodes,
        status: anime.status,
        year: anime.year,
        genres: anime.genres,
        score: anime.score,
      };
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

const cacheEpisodeInDatabase = async (animeId, episode) => {
  try {
    await query(
      `
      INSERT INTO anime_episodes (
        anime_id, episode_number, title, title_japanese, title_romaji,
        synopsis, air_date, score, filler, recap, forum_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (anime_id, episode_number) DO UPDATE SET
        title = EXCLUDED.title,
        title_japanese = EXCLUDED.title_japanese,
        title_romaji = EXCLUDED.title_romaji,
        synopsis = EXCLUDED.synopsis,
        air_date = EXCLUDED.air_date,
        score = EXCLUDED.score,
        filler = EXCLUDED.filler,
        recap = EXCLUDED.recap,
        forum_url = EXCLUDED.forum_url,
        updated_at = NOW()
    `,
      [
        animeId,
        episode.number,
        episode.title,
        episode.titleJapanese,
        episode.titleRomaji,
        episode.synopsis,
        episode.aired,
        episode.score,
        episode.filler,
        episode.recap,
        episode.forumUrl,
      ]
    );
  } catch (dbError) {
    console.warn("⚠️ Failed to cache episode:", dbError.message);
  }
};

const getCachedEpisodeFromDatabase = async (animeId, episodeNumber) => {
  try {
    const result = await query(
      `
      SELECT * FROM anime_episodes 
      WHERE anime_id = $1 AND episode_number = $2
    `,
      [animeId, episodeNumber]
    );

    if (result.rows.length > 0) {
      const episode = result.rows[0];
      return {
        number: episode.episode_number,
        title: episode.title,
        titleJapanese: episode.title_japanese,
        titleRomaji: episode.title_romaji,
        synopsis: episode.synopsis,
        aired: episode.air_date,
        score: episode.score ? parseFloat(episode.score) : null,
        filler: episode.filler,
        recap: episode.recap,
        forumUrl: episode.forum_url,
      };
    }
    return null;
  } catch (error) {
    console.warn("⚠️ Failed to get cached episode:", error.message);
    return null;
  }
};
