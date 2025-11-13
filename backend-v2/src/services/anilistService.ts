const ANILIST_API_URL = "https://graphql.anilist.co";

export interface AniListPageInfo {
  hasNextPage: boolean;
  currentPage: number;
  lastPage: number;
}

export interface AnimeInfo {
  id: number;
  anilistId: number;
  malId: number | null;
  title: string | null;
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  description?: string | null;
  coverImage?: string | null;
  bannerImage?: string | null;
  episodes?: number | null;
  status?: string | null;
  year?: number | null;
  genres?: string | null;
  score?: number | null;
  format?: string | null;
  duration?: number | null;
  studios?: string | null;
  characters?: Array<{ name: string; image?: string | null }>;
  relations?: Array<{
    id: number;
    title: string | null;
    coverImage?: string | null;
    type?: string | null;
    format?: string | null;
  }>;
}

type AniListVariables = Record<string, unknown>;

const SEARCH_ANIME_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(search: $search, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        episodes
        status
        startDate {
          year
        }
        genres
        averageScore
        format
        studios {
          nodes {
            name
          }
        }
      }
    }
  }
`;

const GET_ANIME_DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      status
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      genres
      averageScore
      format
      duration
      studios {
        nodes {
          name
        }
      }
      characters(page: 1, perPage: 8, sort: ROLE) {
        nodes {
          name {
            full
          }
          image {
            medium
          }
        }
      }
      relations {
        nodes {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
          type
          format
        }
      }
    }
  }
`;

const TRENDING_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
        id
        idMal
        title {
          romaji
          english
        }
        coverImage {
          large
        }
        bannerImage
        episodes
        averageScore
        genres
      }
    }
  }
`;

const makeAniListRequest = async <T>(
  query: string,
  variables: AniListVariables = {}
): Promise<T> => {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { data: T; errors?: Array<{ message: string }> };

  if (data.errors && data.errors.length > 0) {
    const [firstError] = data.errors;
    throw new Error(`AniList GraphQL error: ${firstError?.message ?? "Unknown error"}`);
  }

  return data.data;
};

const stripHtml = (value?: string | null): string | null =>
  value ? value.replace(/<[^>]*>/g, "") : value ?? null;

interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  description?: string | null;
  coverImage?: { large?: string | null; medium?: string | null } | null;
  bannerImage?: string | null;
  episodes?: number | null;
  status?: string | null;
  startDate?: { year?: number | null } | null;
  genres?: string[] | null;
  averageScore?: number | null;
  format?: string | null;
  duration?: number | null;
  studios?: { nodes?: Array<{ name: string }> } | null;
  characters?: {
    nodes?: Array<{
      name: { full: string };
      image?: { medium?: string | null } | null;
    }>;
  } | null;
  relations?: {
    nodes?: Array<{
      id: number;
      title?: { romaji?: string | null } | null;
      coverImage?: { medium?: string | null } | null;
      type?: string | null;
      format?: string | null;
    }>;
  } | null;
}

const formatAnimeData = (
  anime: AniListMedia,
  includeExtended = false
): AnimeInfo => {
  const formatted: AnimeInfo = {
    id: anime.id,
    anilistId: anime.id,
    malId: anime.idMal ?? null,
    title: anime.title.english || anime.title.romaji || anime.title.native || null,
    titleEnglish: anime.title.english ?? null,
    titleRomaji: anime.title.romaji ?? null,
    titleNative: anime.title.native ?? null,
    description: stripHtml(anime.description),
    coverImage: anime.coverImage?.large || anime.coverImage?.medium || null,
    bannerImage: anime.bannerImage ?? null,
    episodes: anime.episodes ?? null,
    status: anime.status ?? null,
    year: anime.startDate?.year ?? null,
    genres: anime.genres?.join(", ") ?? null,
    score: anime.averageScore ?? null,
    format: anime.format ?? null,
  };

  if (includeExtended) {
    formatted.duration = anime.duration ?? null;
    formatted.studios = anime.studios?.nodes
      ?.map((s) => s.name)
      .filter(Boolean)
      .join(", ") ?? null;
    formatted.characters =
      anime.characters?.nodes?.map((char) => ({
        name: char.name.full,
        image: char.image?.medium ?? null,
      })) || [];
    formatted.relations =
      anime.relations?.nodes?.map((rel) => ({
        id: rel.id,
        title: rel.title?.romaji ?? null,
        coverImage: rel.coverImage?.medium ?? null,
        type: rel.type ?? null,
        format: rel.format ?? null,
      })) || [];
  }

  return formatted;
};

export const searchAnime = async (
  query: string,
  page = 1,
  perPage = 20
): Promise<{ results: AnimeInfo[]; pageInfo: AniListPageInfo }> => {
  console.log(`🔍 Searching anime: "${query}" (page ${page})`);
  const data = await makeAniListRequest<{
    Page: { pageInfo: AniListPageInfo; media: AniListMedia[] };
  }>(SEARCH_ANIME_QUERY, { search: query, page, perPage });

  return {
    results: data.Page.media.map((media) => formatAnimeData(media)),
    pageInfo: data.Page.pageInfo,
  };
};

export const getAnimeDetails = async (id: number): Promise<AnimeInfo> => {
  console.log(`📺 Fetching anime details: ${id}`);
  const data = await makeAniListRequest<{ Media: AniListMedia }>(
    GET_ANIME_DETAILS_QUERY,
    { id }
  );
  return formatAnimeData(data.Media, true);
};

export const getTrendingAnime = async (
  page = 1,
  perPage = 20
): Promise<AnimeInfo[]> => {
  console.log(`📈 Fetching trending anime (page ${page})`);
  const data = await makeAniListRequest<{
    Page: { media: AniListMedia[] };
  }>(TRENDING_ANIME_QUERY, { page, perPage });
  return data.Page.media.map((media) => formatAnimeData(media));
};

export const getPopularAnime = async (
  page = 1,
  perPage = 20
): Promise<AnimeInfo[]> => {
  const popularQuery = TRENDING_ANIME_QUERY.replace(
    "TRENDING_DESC",
    "POPULARITY_DESC"
  );
  const data = await makeAniListRequest<{
    Page: { media: AniListMedia[] };
  }>(popularQuery, { page, perPage });
  return data.Page.media.map((media) => formatAnimeData(media));
};
