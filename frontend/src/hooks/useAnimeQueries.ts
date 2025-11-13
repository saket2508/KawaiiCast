import { useQuery } from "@tanstack/react-query";
import { animeApi, ApiError } from "@/lib/animeApi";
import { TorrentInfo } from "@/types/torrent-stream";

// Query keys for consistent caching
export const animeQueryKeys = {
  all: ["anime"] as const,
  search: (query: string) => [...animeQueryKeys.all, "search", query] as const,
  trending: () => [...animeQueryKeys.all, "trending"] as const,
  popular: () => [...animeQueryKeys.all, "popular"] as const,
  details: (id: number) => [...animeQueryKeys.all, "details", id] as const,
  episodes: (id: number, page: number) =>
    [...animeQueryKeys.all, "episodes", id, { page }] as const,
  torrents: (id: number, episode?: number, quality?: string) =>
    [...animeQueryKeys.all, "torrents", id, { episode, quality }] as const,
};

// Query keys for torrent operations
export const torrentQueryKeys = {
  all: ["torrent"] as const,
  info: (magnetUri: string) =>
    [...torrentQueryKeys.all, "info", magnetUri] as const,
};

// Search anime hook with debouncing handled by caller
export const useAnimeSearch = (
  query: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: animeQueryKeys.search(query),
    queryFn: () => animeApi.search(query),
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 30 * 1000, // Search results stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error: ApiError) => {
      // Don't retry on 4xx errors, only on 5xx and network errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Trending anime hook
export const useAnimeTrending = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: animeQueryKeys.trending(),
    queryFn: animeApi.getTrending,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
  });
};

// Popular anime hook
export const useAnimePopular = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: animeQueryKeys.popular(),
    queryFn: animeApi.getPopular,
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 2,
  });
};

// Anime details hook
export const useAnimeDetails = (
  id: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: animeQueryKeys.details(id),
    queryFn: () => animeApi.getDetails(id),
    enabled: (options?.enabled ?? true) && id > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes (details don't change often)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error: ApiError) => {
      // Don't retry on 4xx errors, only on 5xx and network errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Anime episodes hook
export const useAnimeEpisodes = (
  id: number,
  page: number = 1,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: animeQueryKeys.episodes(id, page),
    queryFn: () => animeApi.getEpisodes(id, page),
    enabled: (options?.enabled ?? true) && id > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes (episodes can get new torrents)
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
    retry: (failureCount, error: ApiError) => {
      // Don't retry on 4xx errors, only on 5xx and network errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Anime torrents hook
export const useAnimeTorrents = (
  id: number,
  episode?: number,
  quality?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: animeQueryKeys.torrents(id, episode, quality),
    queryFn: () => animeApi.getTorrents(id, episode, quality),
    enabled: (options?.enabled ?? true) && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes (torrents change frequently)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error: ApiError) => {
      // Don't retry on 4xx errors, only on 5xx and network errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Composite hook that intelligently switches between trending and search
export const useAnimeData = (query: string) => {
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;

  const searchQuery = useAnimeSearch(trimmedQuery, { enabled: hasQuery });
  const trendingQuery = useAnimeTrending({ enabled: !hasQuery });

  // Return the active query based on search state
  if (hasQuery) {
    return {
      data: searchQuery.data || [],
      isLoading: searchQuery.isLoading,
      error: searchQuery.error,
      isSearching: true,
      refetch: searchQuery.refetch,
    };
  }

  return {
    data: trendingQuery.data || [],
    isLoading: trendingQuery.isLoading,
    error: trendingQuery.error,
    isSearching: false,
    refetch: trendingQuery.refetch,
  };
};

// Torrent info query hook with smart retry logic
export const useTorrentInfoQuery = (
  magnetUri: string | null,
  options?: { enabled?: boolean }
) => {
  const BACKEND_URL =
    process.env.NEXT_TORRENT_CLIENT_API_URL || "http://localhost:8080";

  return useQuery({
    queryKey: torrentQueryKeys.info(magnetUri || ""),
    queryFn: async ({ signal }): Promise<TorrentInfo> => {
      if (!magnetUri) {
        throw new Error("No magnet URI provided");
      }

      const response = await fetch(`${BACKEND_URL}/torrent/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          magnet: magnetUri,
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get torrent info");
      }

      const torrentInfo: TorrentInfo = await response.json();

      // If torrent is not ready, throw a special error to trigger retry
      if (!torrentInfo.ready) {
        throw new Error("TORRENT_NOT_READY");
      }

      return torrentInfo;
    },
    enabled: (options?.enabled ?? true) && Boolean(magnetUri),
    staleTime: 30 * 1000, // 30 seconds - torrent state can change
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on certain errors
      if (error instanceof Error) {
        // Don't retry if magnet URI is invalid or torrent not found
        if (
          error.message.includes("invalid") ||
          error.message.includes("not found")
        ) {
          return false;
        }

        // Special handling for torrent not ready - retry with shorter limit
        if (error.message === "TORRENT_NOT_READY") {
          return failureCount < 10; // Max 10 retries for readiness
        }
      }

      // Retry up to 3 times for other errors (rate limiting, network issues)
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Progressive delay: 1s, 1.2s, 1.44s, etc. up to 3s max
      const baseDelay = 1000;
      const backoffMultiplier = 1.2;
      const maxDelay = 3000;

      return Math.min(
        baseDelay * Math.pow(backoffMultiplier, attemptIndex),
        maxDelay
      );
    },
  });
};
