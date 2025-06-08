"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnimeEpisodes } from "@/hooks/useAnimeQueries";
import { EpisodeCard } from "./EpisodeCard";
import { Button } from "@/components/ui/Button";

export interface EpisodeListProps {
  animeId: number;
  animeTitle: string;
}

// Filter options for episodes
type EpisodeFilter = "all" | "available" | "unavailable";

// Loading skeleton for episode cards
const EpisodeCardSkeleton: React.FC = () => (
  <div className="bg-gray-800 rounded-xl p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-6 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="flex space-x-2">
          <div className="h-6 bg-gray-700 rounded w-12"></div>
          <div className="h-6 bg-gray-700 rounded w-12"></div>
        </div>
      </div>
      <div className="h-8 bg-gray-700 rounded w-16"></div>
    </div>
  </div>
);

// Error component
const ErrorState: React.FC<{ error: Error; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="text-6xl mb-4">⚠️</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Failed to load episodes
      </h3>
      <p className="text-gray-400 mb-6">
        {error.message ||
          "Unable to fetch episode information. Please try again."}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  </div>
);

export const EpisodeList: React.FC<EpisodeListProps> = ({
  animeId,
  animeTitle,
}) => {
  const router = useRouter();
  const [filter, setFilter] = useState<EpisodeFilter>("all");

  const {
    data: episodeData,
    isLoading,
    error,
    refetch,
  } = useAnimeEpisodes(animeId);

  const handleWatch = (magnet: string) => {
    // Navigate to existing watch page with magnet URI
    const encodedMagnet = encodeURIComponent(magnet);
    router.push(`/watch/${encodedMagnet}`);
  };

  const handleSearchTorrents = (episodeNumber: number) => {
    // Navigate to search page with anime title and episode number
    const searchQuery = `${animeTitle} episode ${episodeNumber}`;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-700 rounded w-32 animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-8 bg-gray-700 rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-700 rounded w-24 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <EpisodeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  }

  // No data state
  if (
    !episodeData ||
    !episodeData.episodes ||
    episodeData.episodes.length === 0
  ) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No episodes available
          </h3>
          <p className="text-gray-400">
            Episode information is not available for this anime yet.
          </p>
        </div>
      </div>
    );
  }

  // Filter episodes based on selected filter
  const filteredEpisodes = episodeData.episodes.filter((episode) => {
    switch (filter) {
      case "available":
        return episode.hasTorrents;
      case "unavailable":
        return !episode.hasTorrents;
      default:
        return true;
    }
  });

  const availableCount = episodeData.episodes.filter(
    (ep) => ep.hasTorrents
  ).length;
  const totalCount = episodeData.episodes.length;

  return (
    <div className="space-y-6">
      {/* Header with stats and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Episode Stats */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">
            Episodes ({totalCount})
          </h2>
          <p className="text-sm text-gray-400">
            {availableCount} available • {totalCount - availableCount} not
            available
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("available")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === "available"
                ? "bg-green-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilter("unavailable")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === "unavailable"
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
          >
            Missing
          </button>
        </div>
      </div>

      {/* Episodes Grid */}
      {filteredEpisodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.number}
              episode={episode}
              onWatch={handleWatch}
              onSearchTorrents={handleSearchTorrents}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400">
            {filter === "available" && "No episodes with torrents available"}
            {filter === "unavailable" &&
              "All episodes have torrents available!"}
            {filter === "all" && "No episodes found"}
          </div>
        </div>
      )}
    </div>
  );
};
