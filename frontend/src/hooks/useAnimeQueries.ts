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

// Enhanced error interface for torrent operations
interface TorrentError extends Error {
  status?: number;
  type?: string;
  retryable?: boolean;
  attempts?: number;
  suggestion?: string;
}

// Torrent info query hook with smart retry logic
export const useTorrentInfoQuery = (
  magnetUri: string | null,
  options?: { enabled?: boolean }
) => {
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

        // Create enhanced error with server-provided metadata
        const enhancedError: TorrentError = new Error(
          error.error || "Failed to get torrent info"
        );
        enhancedError.status = response.status;
        enhancedError.type = error.type || "UNKNOWN";
        enhancedError.retryable = error.retryable !== false; // Default to retryable
        enhancedError.attempts = error.attempts;
        enhancedError.suggestion = error.suggestion;

        throw enhancedError;
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
      const torrentError = error as TorrentError;

      if (torrentError instanceof Error) {
        // Don't retry permanent errors (server told us not to)
        if (
          torrentError.type === "PERMANENT" ||
          torrentError.retryable === false
        ) {
          console.log(
            `❌ Not retrying permanent error: ${torrentError.message}`
          );
          return false;
        }

        // Defer to backend for infrastructure issues (limited client retry)
        if (
          torrentError.type === "RETRYABLE" &&
          (torrentError.status ?? 0) >= 500
        ) {
          console.log(
            `⚠ Infrastructure error, limited client retry: ${torrentError.message}`
          );
          return failureCount < 2; // Let server handle the heavy lifting
        }

        // Handle capacity issues with patience
        if (torrentError.type === "CAPACITY" || torrentError.status === 503) {
          console.log(
            `⏳ Server capacity issue, patient retry: ${torrentError.message}`
          );
          return failureCount < 5; // More retries for capacity issues
        }

        // Rate limiting - be more aggressive with retries
        if (torrentError.status === 429) {
          console.log(
            `🚦 Rate limited, patient retry: ${torrentError.message}`
          );
          return failureCount < 8; // Many retries with longer delays
        }

        // Network connectivity issues - aggressive retry
        if (
          torrentError.status === 0 ||
          torrentError.message.includes("fetch")
        ) {
          console.log(
            `🌐 Network issue, aggressive retry: ${torrentError.message}`
          );
          return failureCount < 5;
        }

        // Special handling for torrent not ready - increased limit
        if (torrentError.message === "TORRENT_NOT_READY") {
          console.log(
            `⏳ Torrent not ready, extended retry: attempt ${failureCount + 1}`
          );
          return failureCount < 15; // Increased from 10
        }

        // Legacy handling for old error patterns
        if (
          torrentError.message.includes("invalid") ||
          torrentError.message.includes("not found")
        ) {
          console.log(`❌ Invalid request, no retry: ${torrentError.message}`);
          return false;
        }
      }

      // Default: moderate retry for unknown errors
      console.log(`❓ Unknown error, default retry: ${torrentError?.message}`);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex, error) => {
      const torrentError = error as TorrentError;

      // Rate limiting gets exponential backoff with longer max delay
      if (torrentError?.status === 429) {
        const backoffDelay = Math.min(5000 * Math.pow(2, attemptIndex), 60000); // 5s -> 60s max
        console.log(`🚦 Rate limit delay: ${backoffDelay}ms`);
        return backoffDelay;
      }

      // Server capacity issues get longer delays
      if (torrentError?.type === "CAPACITY" || torrentError?.status === 503) {
        const capacityDelay = Math.min(
          3000 * Math.pow(1.5, attemptIndex),
          20000
        ); // 3s -> 20s max
        console.log(`⏳ Capacity delay: ${capacityDelay}ms`);
        return capacityDelay;
      }

      // Server infrastructure errors get moderate delays (let server retry first)
      if (
        torrentError?.type === "RETRYABLE" &&
        (torrentError?.status ?? 0) >= 500
      ) {
        const infraDelay = Math.min(2000 * Math.pow(1.3, attemptIndex), 8000); // 2s -> 8s max
        console.log(`⚠ Infrastructure delay: ${infraDelay}ms`);
        return infraDelay;
      }

      // Network connectivity issues get fast retry initially, then back off
      if (
        torrentError?.status === 0 ||
        torrentError?.message?.includes("fetch")
      ) {
        const networkDelay = Math.min(
          1000 * Math.pow(1.8, attemptIndex),
          10000
        ); // 1s -> 10s max
        console.log(`🌐 Network delay: ${networkDelay}ms`);
        return networkDelay;
      }

      // Default progressive delay for other errors
      const baseDelay = 1000;
      const backoffMultiplier = 1.2;
      const maxDelay = 3000;
      const defaultDelay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attemptIndex),
        maxDelay
      );
      console.log(`❓ Default delay: ${defaultDelay}ms`);
      return defaultDelay;
    },
  });
};
