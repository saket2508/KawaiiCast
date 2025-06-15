"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnimeEpisodes } from "@/hooks/useAnimeQueries";
import { useWatchProgress, WatchProgress } from "@/hooks/useWatchProgress";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Play, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Episode } from "@/types/api";

export interface EpisodeListProps {
  animeId: number;
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
  watchProgress?: WatchProgress;
  onWatch: (episodeNumber: number) => void;
}> = ({ episode, watchProgress, onWatch }) => {
  const bestTorrent = episode.torrents?.[0];
  const hasAvailableTorrents = episode.hasTorrents && bestTorrent;
  const isWatched = watchProgress?.completed || false;
  const hasProgress = watchProgress && watchProgress.currentTime > 30;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-gray-700/50 group">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-md font-semibold text-white truncate">
            {episode.number}. {episode.title}
          </h3>

          {/* Watch status indicator */}
          {isWatched && (
            <div className="flex items-center gap-1">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-xs text-green-400">Watched</span>
            </div>
          )}

          {/* Progress indicator for partially watched episodes */}
          {hasProgress && !isWatched && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs text-orange-400">
                {Math.round(watchProgress.progress)}% watched
              </span>
            </div>
          )}

          {/* Availability indicator */}
          {!isWatched && !hasProgress && (
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasAvailableTorrents ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <span
                className={`text-xs ${
                  hasAvailableTorrents ? "text-green-400" : "text-gray-500"
                }`}
              >
                {hasAvailableTorrents ? "Available" : "No torrents"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
          {episode.aired && (
            <span>Aired: {new Date(episode.aired).toLocaleDateString()}</span>
          )}
          {episode.filler && <Tag color="yellow">Filler</Tag>}
          {episode.recap && <Tag color="blue">Recap</Tag>}
          {/* Show quality info if available */}
          {bestTorrent && (
            <>
              <span>•</span>
              <span className="text-orange-400">{bestTorrent.quality}</span>
              <span>•</span>
              <span>{bestTorrent.releaseGroup}</span>
              <span>•</span>
              <span>{bestTorrent.seeders} seeders</span>
            </>
          )}
          {/* Show last watched time */}
          {watchProgress?.lastWatched && (
            <>
              <span>•</span>
              <span>
                Last watched {watchProgress.lastWatched.toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Progress bar for partially watched episodes */}
        {hasProgress && !isWatched && (
          <div className="w-20 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 transition-all duration-300"
              style={{ width: `${watchProgress.progress}%` }}
            />
          </div>
        )}

        {/* Watch button with dynamic text */}
        <Button
          variant={hasAvailableTorrents ? "primary" : "secondary"}
          size="sm"
          onClick={() => onWatch(episode.number)}
          leftIcon={isWatched ? <CheckCircle size={16} /> : <Play size={16} />}
          className={
            isWatched
              ? "bg-green-600 hover:bg-green-700 text-white"
              : hasAvailableTorrents
              ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              : "border-orange-500 text-orange-400 hover:bg-orange-500/10"
          }
        >
          {isWatched ? "Rewatch" : hasProgress ? "Continue" : "Watch"}
        </Button>
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

export const EpisodeList: React.FC<EpisodeListProps> = ({ animeId }) => {
  const router = useRouter();
  const [page, setPage] = useState(1);

  // Get watch progress for this anime
  const { getEpisodeProgress } = useWatchProgress(animeId, 1); // Using 1 as dummy episode for anime-wide progress access

  const {
    data: episodeData,
    isLoading,
    error,
    refetch,
  } = useAnimeEpisodes(animeId, page);

  const handleWatch = (episodeNumber: number) => {
    // Navigate to contextual watch page
    router.push(`/anime/${animeId}/watch/${episodeNumber}`);
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
            watchProgress={getEpisodeProgress(episode.number)}
            onWatch={handleWatch}
          />
        ))}
      </div>
    </div>
  );
};
