"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnimeEpisodes } from "@/hooks/useAnimeQueries";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import {
  Download,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Episode } from "@/types/api";

export interface EpisodeListProps {
  animeId: number;
  animeTitle: string;
}

// Loading skeleton for episode list items
const EpisodeListItemSkeleton: React.FC = () => (
  <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-6 bg-gray-700 rounded w-4/5 mb-2"></div>
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-8 bg-gray-700 rounded w-20"></div>
        <div className="h-8 bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  </div>
);

// Episode List Item Component
const EpisodeListItem: React.FC<{
  episode: Episode;
  onWatch: (magnet: string) => void;
  onSearchTorrents: (episodeNumber: number) => void;
}> = ({ episode, onWatch, onSearchTorrents }) => {
  const bestTorrent = episode.torrents?.[0];

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-gray-700/50">
      <div className="flex-1">
        <h3 className="text-md font-semibold text-white truncate">
          {episode.number}. {episode.title}
        </h3>
        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
          {episode.aired && (
            <span>Aired: {new Date(episode.aired).toLocaleDateString()}</span>
          )}
          {episode.filler && <Tag color="yellow">Filler</Tag>}
          {episode.recap && <Tag color="blue">Recap</Tag>}
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {bestTorrent ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onWatch(bestTorrent.magnet)}
              leftIcon={<Play size={16} />}
            >
              Watch
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSearchTorrents(episode.number)}
              leftIcon={<Download size={16} />}
            >
              Torrents
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchTorrents(episode.number)}
            leftIcon={<Search size={16} />}
          >
            Find Torrents
          </Button>
        )}
      </div>
    </div>
  );
};

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
  const [page, setPage] = useState(1);

  const {
    data: episodeData,
    isLoading,
    error,
    refetch,
  } = useAnimeEpisodes(animeId, page);

  const handleWatch = (magnet: string) => {
    const encodedMagnet = encodeURIComponent(magnet);
    router.push(`/watch/${encodedMagnet}`);
  };

  const handleSearchTorrents = (episodeNumber: number) => {
    const searchQuery = `${animeTitle} episode ${episodeNumber}`;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (episodeData?.pagination?.has_next_page) {
      setPage((prev) => prev + 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-700 rounded w-48 animate-pulse mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <EpisodeListItemSkeleton key={i} />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Episodes</h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePrevPage}
            disabled={page === 1}
            variant="outline"
            size="sm"
            leftIcon={<ChevronLeft size={16} />}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <Button
            onClick={handleNextPage}
            disabled={!episodeData.pagination?.has_next_page}
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight size={16} />}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {episodeData.episodes.map((episode) => (
          <EpisodeListItem
            key={episode.number}
            episode={episode}
            onWatch={handleWatch}
            onSearchTorrents={handleSearchTorrents}
          />
        ))}
      </div>
    </div>
  );
};
