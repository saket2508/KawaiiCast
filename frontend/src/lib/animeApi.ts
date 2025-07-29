import { Anime, Episode, EpisodeTorrent } from "@/types/api";

// Get API base URL from environment variable or fallback to relative path
const API_BASE = `${
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
}/api`;

// API Response type for search endpoint
interface AnimeSearchResponse {
  success: boolean;
  query: string;
  page: number;
  results: Anime[];
  pageInfo: {
    hasNextPage: boolean;
    currentPage: number;
    lastPage: number;
  };
}

// API Response type for other anime endpoints (trending, popular)
interface AnimeApiResponse {
  success: boolean;
  data: Anime[];
  message?: string;
}

// API Response type for anime details endpoint
interface AnimeDetailsResponse {
  success: boolean;
  anime: Anime;
  message?: string;
}

// API Response type for anime episodes endpoint
interface AnimeEpisodesResponse {
  success: boolean;
  anime: {
    id: number;
    title: string;
    totalEpisodes: number;
  };
  episodes: Episode[];
  pagination?: {
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
  page?: number;
}

// API Response type for anime torrents endpoint
interface AnimeTorrentsResponse {
  success: boolean;
  anime: {
    id: number;
    title: string;
  };
  episode?: number;
  torrents: EpisodeTorrent[];
  total: number;
}

// Generic API error handling
class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Generic fetch wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    throw new ApiError("Network request failed", 0);
  }
}

export const animeApi = {
  // Search anime by query
  search: async (query: string): Promise<Anime[]> => {
    if (!query?.trim()) {
      return [];
    }

    const response = await apiRequest<AnimeSearchResponse>(
      `/anime/search?query=${encodeURIComponent(query.trim())}`
    );

    return response.results || [];
  },

  // Get trending anime
  getTrending: async (): Promise<Anime[]> => {
    const response = await apiRequest<AnimeApiResponse>("/anime/trending");
    return response.data || [];
  },

  // Get popular anime
  getPopular: async (): Promise<Anime[]> => {
    const response = await apiRequest<AnimeApiResponse>("/anime/popular");
    return response.data || [];
  },

  // Get anime details by ID
  getDetails: async (id: number): Promise<Anime> => {
    if (!id || id <= 0) {
      throw new ApiError("Invalid anime ID", 400);
    }

    const response = await apiRequest<AnimeDetailsResponse>(`/anime/${id}`);
    return response.anime;
  },

  // Get anime episodes by ID
  getEpisodes: async (
    id: number,
    page: number = 1
  ): Promise<AnimeEpisodesResponse> => {
    if (!id || id <= 0) {
      throw new ApiError("Invalid anime ID", 400);
    }

    const response = await apiRequest<AnimeEpisodesResponse>(
      `/anime/${id}/episodes?page=${page}`
    );
    return response;
  },

  // Get torrents for anime
  getTorrents: async (
    id: number,
    episode?: number,
    quality?: string
  ): Promise<AnimeTorrentsResponse> => {
    if (!id || id <= 0) {
      throw new ApiError("Invalid anime ID", 400);
    }

    let url = `/anime/${id}/torrents`;
    const params = new URLSearchParams();

    if (episode) {
      params.append("episode", episode.toString());
    }
    if (quality) {
      params.append("quality", quality);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiRequest<AnimeTorrentsResponse>(url);
    return response;
  },
};

export { ApiError };
