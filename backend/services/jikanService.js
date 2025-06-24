import fetch from "node-fetch";

const JIKAN_API_URL = "https://api.jikan.moe/v4";

// Helper function to make JIKAN API requests with rate limiting
const makeJikanRequest = async (endpoint) => {
  try {
    const url = `${JIKAN_API_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "KawaiiCaster/1.0",
      },
    });

    if (response.status === 429) {
      // Rate limited, wait and retry
      console.warn("⚠️ JIKAN API rate limited, waiting 1 second...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return makeJikanRequest(endpoint);
    }

    if (!response.ok) {
      throw new Error(
        `JIKAN API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ JIKAN API request failed:", error);
    throw error;
  }
};

// Format episode data for our app
const formatEpisodeData = (episode) => {
  if (!episode) return null;

  return {
    malId: episode.mal_id,
    number: episode.mal_id, // In JIKAN, mal_id is actually the episode number
    title: episode.title || `Episode ${episode.mal_id}`,
    titleJapanese: episode.title_japanese,
    titleRomaji: episode.title_romanji,
    aired: episode.aired ? new Date(episode.aired) : null,
    score: episode.score,
    filler: episode.filler || false,
    recap: episode.recap || false,
    forumUrl: episode.forum_url,
    synopsis: episode.synopsis,
  };
};

// Get anime episodes from JIKAN API
export const getAnimeEpisodes = async (malId, page = 1) => {
  if (!malId) {
    throw new Error("MAL ID is required for episode data");
  }

  try {
    const data = await makeJikanRequest(
      `/anime/${malId}/episodes?page=${page}`
    );

    return {
      episodes: data.data?.map(formatEpisodeData) || [],
      pagination: data.pagination || {},
    };
  } catch (error) {
    console.error(`❌ Failed to fetch episodes for MAL ID ${malId}:`, error);
    return { episodes: [], pagination: {} };
  }
};

// Get specific episode details from JIKAN API
export const getEpisodeDetails = async (malId, episodeNumber) => {
  if (!malId || !episodeNumber) {
    throw new Error("MAL ID and episode number are required");
  }

  try {
    const data = await makeJikanRequest(
      `/anime/${malId}/episodes/${episodeNumber}`
    );
    return formatEpisodeData(data.data);
  } catch (error) {
    console.error(
      `❌ Failed to fetch episode ${episodeNumber} for MAL ID ${malId}:`,
      error
    );
    return null;
  }
};

// Get all episodes for an anime (handles pagination)
export const getAllAnimeEpisodes = async (malId) => {
  if (!malId) {
    return [];
  }

  try {
    const allEpisodes = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await getAnimeEpisodes(malId, page);

      if (result.episodes && result.episodes.length > 0) {
        allEpisodes.push(...result.episodes);

        // Check if there are more pages
        if (result.pagination && result.pagination.has_next_page) {
          page++;
          // Add small delay to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 250));
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    return allEpisodes;
  } catch (error) {
    console.error(
      `❌ Failed to fetch all episodes for MAL ID ${malId}:`,
      error
    );
    return [];
  }
};
