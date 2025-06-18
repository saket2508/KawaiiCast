import fetch from "node-fetch";

const ANILIST_API_URL = "https://graphql.anilist.co";

// GraphQL queries
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

// Helper function to make GraphQL requests
const makeAniListRequest = async (query, variables = {}) => {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AniList API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`AniList GraphQL error: ${data.errors[0].message}`);
    }

    return data.data;
  } catch (error) {
    console.error("❌ AniList API request failed:", error);
    throw error;
  }
};

// Search anime by title
export const searchAnime = async (query, page = 1, perPage = 20) => {
  console.log(`🔍 Searching anime: "${query}" (page ${page})`);

  const data = await makeAniListRequest(SEARCH_ANIME_QUERY, {
    search: query,
    page,
    perPage,
  });

  return {
    results: data.Page.media.map(formatAnimeData),
    pageInfo: data.Page.pageInfo,
  };
};

// Get anime details by ID
export const getAnimeDetails = async (id) => {
  console.log(`📺 Fetching anime details: ${id}`);

  const data = await makeAniListRequest(GET_ANIME_DETAILS_QUERY, { id });
  return formatAnimeData(data.Media, true);
};

// Get trending anime
export const getTrendingAnime = async (page = 1, perPage = 20) => {
  console.log(`📈 Fetching trending anime (page ${page})`);

  const data = await makeAniListRequest(TRENDING_ANIME_QUERY, {
    page,
    perPage,
  });
  return data.Page.media.map(formatAnimeData);
};

// Format anime data for our app
const formatAnimeData = (anime, includeExtended = false) => {
  const formatted = {
    id: anime.id,
    anilistId: anime.id,
    malId: anime.idMal,
    title: anime.title.english || anime.title.romaji || anime.title.native,
    titleEnglish: anime.title.english,
    titleRomaji: anime.title.romaji,
    titleNative: anime.title.native,
    description: anime.description?.replace(/<[^>]*>/g, ""), // Strip HTML
    coverImage: anime.coverImage?.large || anime.coverImage?.medium,
    bannerImage: anime.bannerImage,
    episodes: anime.episodes,
    status: anime.status,
    year: anime.startDate?.year,
    genres: anime.genres?.join(", "),
    score: anime.averageScore,
    format: anime.format,
  };

  if (includeExtended) {
    formatted.duration = anime.duration;
    formatted.studios = anime.studios?.nodes?.map((s) => s.name).join(", ");
    formatted.characters = anime.characters?.nodes?.map((char) => ({
      name: char.name.full,
      image: char.image.medium,
    }));
    formatted.relations = anime.relations?.nodes?.map((rel) => ({
      id: rel.id,
      title: rel.title.romaji,
      coverImage: rel.coverImage?.medium,
      type: rel.type,
      format: rel.format,
    }));
  }

  return formatted;
};

// Get popular anime (alternative to trending)
export const getPopularAnime = async (page = 1, perPage = 20) => {
  const popularQuery = TRENDING_ANIME_QUERY.replace(
    "TRENDING_DESC",
    "POPULARITY_DESC"
  );
  const data = await makeAniListRequest(popularQuery, { page, perPage });
  return data.Page.media.map(formatAnimeData);
};
