import { useQuery } from "@tanstack/react-query";
import { animeApi, ApiError } from "@/lib/animeApi";

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
