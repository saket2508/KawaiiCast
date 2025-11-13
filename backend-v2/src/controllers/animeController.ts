import type { Request, Response } from "express";

import { query } from "@services/database";
import * as anilistService from "@services/anilistService";
import type { AnimeInfo } from "@services/anilistService";
import * as jikanService from "@services/jikanService";
import type { EpisodeDetails } from "@services/jikanService";
import * as torrentService from "@services/torrentService";
import type { TorrentInfo } from "@services/torrentService";
import { formatBytes } from "@utils/helpers";

interface AnimeCacheRow {
  anilist_id: number;
  mal_id: number | null;
  title: string | null;
  title_english: string | null;
  title_romaji: string | null;
  description: string | null;
  cover_image: string | null;
  banner_image: string | null;
  episodes: number | null;
  status: string | null;
  year: number | null;
  genres: string | null;
  score: number | null;
}

interface EpisodeTorrentRow {
  title: string;
  magnet_uri: string | null;
  size_bytes: number;
  seeders: number;
  quality: string;
  release_group: string;
  episode_number: number;
}

interface EpisodeCacheRow {
  episode_number: number;
  title: string;
  title_japanese: string | null;
  title_romaji: string | null;
  synopsis: string | null;
  air_date: Date | null;
  score: string | null;
  filler: boolean;
  recap: boolean;
  forum_url: string | null;
}

interface CachedTorrent {
  title: string;
  magnet: string | null;
  size: number;
  sizeText: string;
  seeders: number;
  quality: string;
  releaseGroup: string;
  episodeNumber: number;
}

const getQueryString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return getQueryString(value[0]);
  }
  if (typeof value === "string") return value;
  return undefined;
};

const getQueryNumber = (
  value: unknown,
  defaultValue?: number
): number | null => {
  const strValue = getQueryString(value);
  if (strValue === undefined) {
    return typeof defaultValue === "number" ? defaultValue : null;
  }
  const parsed = Number.parseInt(strValue, 10);
  if (Number.isNaN(parsed)) {
    return typeof defaultValue === "number" ? defaultValue : null;
  }
  return parsed;
};

const parseRouteNumber = (value: string | undefined): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const searchAnime = async (req: Request, res: Response) => {
  try {
    const searchQuery = getQueryString(req.query.query);
    const page = getQueryNumber(req.query.page, 1) ?? 1;
    const limit = getQueryNumber(req.query.limit, 20) ?? 20;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const results = await anilistService.searchAnime(searchQuery, page, limit);

    return res.json({
      success: true,
      query: searchQuery,
      page,
      ...results,
    });
  } catch (error) {
    console.error("❌ Anime search error:", error);
    return res.status(500).json({
      error: "Failed to search anime",
      message: (error as Error).message,
    });
  }
};

export const getTrendingAnime = async (req: Request, res: Response) => {
  try {
    const page = getQueryNumber(req.query.page, 1) ?? 1;
    const limit = getQueryNumber(req.query.limit, 20) ?? 20;

    const results = await anilistService.getTrendingAnime(page, limit);

    return res.json({
      success: true,
      results,
      page,
    });
  } catch (error) {
    console.error("❌ Trending anime error:", error);
    return res.status(500).json({
      error: "Failed to fetch trending anime",
      message: (error as Error).message,
    });
  }
};

export const getPopularAnime = async (req: Request, res: Response) => {
  try {
    const page = getQueryNumber(req.query.page, 1) ?? 1;
    const limit = getQueryNumber(req.query.limit, 20) ?? 20;

    const results = await anilistService.getPopularAnime(page, limit);

    return res.json({
      success: true,
      results,
      page,
    });
  } catch (error) {
    console.error("❌ Popular anime error:", error);
    return res.status(500).json({
      error: "Failed to fetch popular anime",
      message: (error as Error).message,
    });
  }
};

export const getAnimeDetails = async (req: Request, res: Response) => {
  try {
    const animeId = parseRouteNumber(req.params.id);
    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    const animeDetails = await anilistService.getAnimeDetails(animeId);

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
      console.warn("⚠️ Failed to cache anime in database:", (dbError as Error).message);
    }

    return res.json({
      success: true,
      anime: animeDetails,
    });
  } catch (error) {
    console.error("❌ Anime details error:", error);
    return res.status(500).json({
      error: "Failed to fetch anime details",
      message: (error as Error).message,
    });
  }
};

export const getAnimeTorrents = async (req: Request, res: Response) => {
  try {
    const animeId = parseRouteNumber(req.params.id);
    const limit = getQueryNumber(req.query.limit, 50) ?? 50;
    const quality = getQueryString(req.query.quality);
    const episodeNumber = getQueryNumber(req.query.episode);

    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    const animeTitle = anime.titleEnglish || anime.title || `Anime ${animeId}`;
    const romajiTitle = anime.titleRomaji || null;

    const { aids, eids } = await torrentService.getAnimeToshoIds(
      animeId,
      episodeNumber
    );

    const torrents = await torrentService.searchAnimeTorrents(
      animeTitle,
      episodeNumber,
      aids,
      eids,
      "all",
      romajiTitle ? [romajiTitle] : []
    );

    let filteredTorrents = torrents;
    if (quality) {
      filteredTorrents = torrents.filter((torrent) =>
        torrent.quality.toLowerCase().includes(quality.toLowerCase())
      );
    }

    const bestTorrents = torrentService.getBestTorrents(
      filteredTorrents,
      episodeNumber
    );
    const limitedTorrents = bestTorrents.slice(0, limit);

    await cacheTorrentsInDatabase(animeId, limitedTorrents);

    return res.json({
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
    return res.status(500).json({
      error: "Failed to search anime torrents",
      message: (error as Error).message,
    });
  }
};

export const getAnimeEpisodes = async (req: Request, res: Response) => {
  try {
    const animeId = parseRouteNumber(req.params.id);
    const page = getQueryNumber(req.query.page, 1) ?? 1;
    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    let episodes: Array<EpisodeDetails & { torrents: CachedTorrent[]; hasTorrents: boolean }> = [];
    let pagination: Record<string, any> = {};
    const totalEpisodes = anime.episodes || 12;

    if (anime.malId) {
      try {
        const episodeData = await jikanService.getAnimeEpisodes(
          anime.malId,
          page
        );

        if (episodeData.episodes.length > 0) {
          const episodesWithTorrents = await Promise.all(
            episodeData.episodes.map(async (episode) => {
              await cacheEpisodeInDatabase(animeId, episode);
              const torrents = await getCachedTorrentsForEpisode(
                animeId,
                episode.number
              );
              return {
                ...episode,
                torrents,
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
          (jikanError as Error).message
        );
      }
    }

    if (episodes.length === 0) {
      for (let i = 1; i <= totalEpisodes; i += 1) {
        const torrents = await getCachedTorrentsForEpisode(animeId, i);
        episodes.push({
          number: i,
          title: `Episode ${i}`,
          titleJapanese: null,
          titleRomaji: null,
          aired: null,
          filler: false,
          recap: false,
          synopsis: null,
          malId: undefined,
          score: null,
          forumUrl: null,
          torrents,
          hasTorrents: torrents.length > 0,
        });
      }
    }

    return res.json({
      success: true,
      anime: {
        id: animeId,
        title: anime.titleEnglish || anime.title || `Anime ${animeId}`,
        malId: anime.malId,
        totalEpisodes,
      },
      episodes,
      pagination,
      page,
    });
  } catch (error) {
    console.error("❌ Episodes error:", error);
    return res.status(500).json({
      error: "Failed to fetch episodes",
      message: (error as Error).message,
    });
  }
};

export const getEpisodeDetails = async (req: Request, res: Response) => {
  try {
    const animeId = parseRouteNumber(req.params.id);
    const episodeNumber = parseRouteNumber(req.params.episodeNumber);

    if (!animeId || !episodeNumber) {
      return res.status(400).json({
        error: "Valid anime ID and episode number are required",
      });
    }

    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    let episodeDetails = await getCachedEpisodeFromDatabase(
      animeId,
      episodeNumber
    );

    if (!episodeDetails && anime.malId) {
      try {
        episodeDetails = await jikanService.getEpisodeDetails(
          anime.malId,
          episodeNumber
        );
        if (episodeDetails) {
          await cacheEpisodeInDatabase(animeId, episodeDetails);
        }
      } catch (jikanError) {
        console.warn(
          "⚠️ Failed to fetch episode details from JIKAN API:",
          (jikanError as Error).message
        );
      }
    }

    if (!episodeDetails) {
      episodeDetails = {
        number: episodeNumber,
        title: `Episode ${episodeNumber}`,
        titleJapanese: null,
        titleRomaji: null,
        aired: null,
        filler: false,
        recap: false,
        synopsis: null,
        score: null,
        forumUrl: null,
      };
    }

    const torrents = await getCachedTorrentsForEpisode(animeId, episodeNumber);

    return res.json({
      success: true,
      anime: {
        id: animeId,
        title: anime.titleEnglish || anime.title || `Anime ${animeId}`,
        malId: anime.malId,
      },
      episode: {
        ...episodeDetails,
        torrents,
        hasTorrents: torrents.length > 0,
      },
    });
  } catch (error) {
    console.error("❌ Episode details error:", error);
    return res.status(500).json({
      error: "Failed to fetch episode details",
      message: (error as Error).message,
    });
  }
};

export const getAnimeWithAllEpisodes = async (req: Request, res: Response) => {
  try {
    const animeId = parseRouteNumber(req.params.id);
    if (!animeId) {
      return res.status(400).json({ error: "Valid anime ID is required" });
    }

    const anime = await getAnimeFromCacheOrApi(animeId);
    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    let allEpisodes: Array<EpisodeDetails & { torrents: CachedTorrent[]; hasTorrents: boolean }> = [];

    if (anime.malId) {
      try {
        const episodes = await jikanService.getAllAnimeEpisodes(anime.malId);
        allEpisodes = await Promise.all(
          episodes.map(async (episode) => {
            await cacheEpisodeInDatabase(animeId, episode);
            const torrents = await getCachedTorrentsForEpisode(
              animeId,
              episode.number
            );
            return {
              ...episode,
              torrents,
              hasTorrents: torrents.length > 0,
            };
          })
        );
      } catch (jikanError) {
        console.warn(
          "⚠️ Failed to fetch all episodes from JIKAN API:",
          (jikanError as Error).message
        );
      }
    }

    if (allEpisodes.length === 0) {
      const totalEpisodes = anime.episodes || 12;
      for (let i = 1; i <= totalEpisodes; i += 1) {
        const torrents = await getCachedTorrentsForEpisode(animeId, i);
        allEpisodes.push({
          number: i,
          title: `Episode ${i}`,
          titleJapanese: null,
          titleRomaji: null,
          aired: null,
          filler: false,
          recap: false,
          synopsis: null,
          score: null,
          malId: undefined,
          forumUrl: null,
          torrents,
          hasTorrents: torrents.length > 0,
        });
      }
    }

    return res.json({
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
    return res.status(500).json({
      error: "Failed to fetch complete anime data",
      message: (error as Error).message,
    });
  }
};

export const searchTorrents = async (req: Request, res: Response) => {
  try {
    const searchQuery = getQueryString(req.query.query);
    const episodeNumber = getQueryNumber(req.query.episode);
    const limit = getQueryNumber(req.query.limit, 20) ?? 20;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const torrents = await torrentService.searchAnimeTorrents(
      searchQuery,
      episodeNumber
    );

    const limitedTorrents = torrents.slice(0, limit);

    return res.json({
      success: true,
      query: searchQuery,
      episode: episodeNumber,
      torrents: limitedTorrents,
      total: limitedTorrents.length,
    });
  } catch (error) {
    console.error("❌ Torrent search error:", error);
    return res.status(500).json({
      error: "Failed to search torrents",
      message: (error as Error).message,
    });
  }
};

const getAnimeFromCacheOrApi = async (animeId: number): Promise<AnimeInfo> => {
  try {
    const dbResult = await query<AnimeCacheRow>(
      "SELECT * FROM anime WHERE anilist_id = $1",
      [animeId]
    );

    if (dbResult.rows.length > 0) {
      const anime = dbResult.rows[0]!;
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

    return anilistService.getAnimeDetails(animeId);
  } catch (error) {
    console.warn("⚠️ Database error, fetching from AniList:", (error as Error).message);
    return anilistService.getAnimeDetails(animeId);
  }
};

const getCachedTorrentsForEpisode = async (
  animeId: number,
  episodeNumber: number
): Promise<CachedTorrent[]> => {
  try {
    const torrentResult = await query<EpisodeTorrentRow>(
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
      (error as Error).message
    );
    return [];
  }
};

const cacheTorrentsInDatabase = async (
  animeId: number,
  torrents: TorrentInfo[]
) => {
  for (const torrent of torrents) {
    if (typeof torrent.episodeNumber !== "number") continue;
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
      console.warn("⚠️ Failed to cache torrent:", (dbError as Error).message);
    }
  }
};

const cacheEpisodeInDatabase = async (
  animeId: number,
  episode: EpisodeDetails
) => {
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
    console.warn("⚠️ Failed to cache episode:", (dbError as Error).message);
  }
};

const getCachedEpisodeFromDatabase = async (
  animeId: number,
  episodeNumber: number
): Promise<EpisodeDetails | null> => {
  try {
    const result = await query<EpisodeCacheRow>(
      `
      SELECT * FROM anime_episodes 
      WHERE anime_id = $1 AND episode_number = $2
    `,
      [animeId, episodeNumber]
    );

    if (result.rows.length > 0) {
      const episode = result.rows[0]!;
      return {
        number: episode.episode_number,
        title: episode.title,
        titleJapanese: episode.title_japanese,
        titleRomaji: episode.title_romaji,
        synopsis: episode.synopsis,
        aired: episode.air_date,
        score: episode.score ? Number.parseFloat(episode.score) : null,
        filler: episode.filler,
        recap: episode.recap,
        forumUrl: episode.forum_url,
      };
    }
    return null;
  } catch (error) {
    console.warn("⚠️ Failed to get cached episode:", (error as Error).message);
    return null;
  }
};
