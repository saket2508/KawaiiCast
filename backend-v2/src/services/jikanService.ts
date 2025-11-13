const JIKAN_API_URL = "https://api.jikan.moe/v4";

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface JikanEpisode {
  mal_id: number;
  title?: string | null;
  title_japanese?: string | null;
  title_romanji?: string | null;
  aired?: string | null;
  score?: number | null;
  filler?: boolean;
  recap?: boolean;
  forum_url?: string | null;
  synopsis?: string | null;
}

export interface EpisodeDetails {
  malId?: number;
  number: number;
  title: string;
  titleJapanese?: string | null;
  titleRomaji?: string | null;
  aired?: Date | null;
  score?: number | null;
  filler: boolean;
  recap: boolean;
  forumUrl?: string | null;
  synopsis?: string | null;
}

interface JikanPagination {
  last_visible_page?: number;
  has_next_page?: boolean;
  items?: { count: number; total: number; per_page: number };
}

const makeJikanRequest = async (endpoint: string): Promise<any> => {
  const url = `${JIKAN_API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "KawaiiCaster/1.0",
    },
  });

  if (response.status === 429) {
    console.warn("⚠️ JIKAN API rate limited, waiting 1 second...");
    await sleep(1000);
    return makeJikanRequest(endpoint);
  }

  if (!response.ok) {
    throw new Error(`JIKAN API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const formatEpisodeData = (episode?: JikanEpisode | null): EpisodeDetails | null => {
  if (!episode) return null;
  return {
    malId: episode.mal_id,
    number: episode.mal_id,
    title: episode.title || `Episode ${episode.mal_id}`,
    titleJapanese: episode.title_japanese,
    titleRomaji: episode.title_romanji,
    aired: episode.aired ? new Date(episode.aired) : null,
    score: episode.score ?? null,
    filler: episode.filler ?? false,
    recap: episode.recap ?? false,
    forumUrl: episode.forum_url ?? null,
    synopsis: episode.synopsis ?? null,
  };
};

export const getAnimeEpisodes = async (
  malId: number,
  page = 1
): Promise<{ episodes: EpisodeDetails[]; pagination: JikanPagination }> => {
  if (!malId) {
    throw new Error("MAL ID is required for episode data");
  }

  try {
    const data = await makeJikanRequest(`/anime/${malId}/episodes?page=${page}`);
    const episodes = (data.data || [])
      .map((episode: JikanEpisode) => formatEpisodeData(episode))
      .filter(
        (episode: EpisodeDetails | null): episode is EpisodeDetails =>
          episode !== null
      );
    return {
      episodes,
      pagination: data.pagination || {},
    };
  } catch (error) {
    console.error(`❌ Failed to fetch episodes for MAL ID ${malId}:`, error);
    return { episodes: [], pagination: {} };
  }
};

export const getEpisodeDetails = async (
  malId: number,
  episodeNumber: number
): Promise<EpisodeDetails | null> => {
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

export const getAllAnimeEpisodes = async (malId: number): Promise<EpisodeDetails[]> => {
  if (!malId) {
    return [];
  }

  try {
    const allEpisodes: EpisodeDetails[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await getAnimeEpisodes(malId, page);
      if (result.episodes.length > 0) {
        allEpisodes.push(...result.episodes);
        if (result.pagination?.has_next_page) {
          page += 1;
          await sleep(250);
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    return allEpisodes;
  } catch (error) {
    console.error(`❌ Failed to fetch all episodes for MAL ID ${malId}:`, error);
    return [];
  }
};
