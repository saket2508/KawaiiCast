"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useWatchContext } from "@/hooks/useWatchContext";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { WatchContextBar } from "./WatchContextBar";
import { StreamingVideoPlayer } from "./StreamingVideoPlayer";
import { Button } from "@/components/ui/Button";

export interface ContextualWatchPageProps {
  animeId: number;
  episodeNumber: number;
}

// Error component for watch page
const WatchErrorState: React.FC<{
  error: Error;
  onBack: () => void;
}> = ({ error, onBack }) => (
  <div className="flex items-center justify-center min-h-[60vh] bg-black">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="text-6xl mb-4">⚠️</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Unable to load episode
      </h3>
      <p className="text-gray-400 mb-6">
        {error.message ||
          "Failed to load episode data. The episode may not be available."}
      </p>
      <div className="flex space-x-4 justify-center">
        <Button variant="secondary" onClick={onBack}>
          Back to Anime
        </Button>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  </div>
);

// No torrent available component
const NoTorrentState: React.FC<{
  animeTitle: string;
  episodeNumber: number;
  onBack: () => void;
  onSearchTorrents: () => void;
}> = ({ animeTitle, episodeNumber, onBack, onSearchTorrents }) => (
  <div className="flex items-center justify-center min-h-[60vh] bg-black">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="text-6xl mb-4">📺</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Episode not available
      </h3>
      <p className="text-gray-400 mb-6">
        No torrents are available for {animeTitle} Episode {episodeNumber}.
      </p>
      <div className="flex space-x-4 justify-center">
        <Button variant="secondary" onClick={onBack}>
          Back to Episodes
        </Button>
        <Button variant="primary" onClick={onSearchTorrents}>
          Search Torrents
        </Button>
      </div>
    </div>
  </div>
);

export const ContextualWatchPage: React.FC<ContextualWatchPageProps> = ({
  animeId,
  episodeNumber,
}) => {
  const router = useRouter();
  const context = useWatchContext(animeId, episodeNumber);
  const watchProgress = useWatchProgress(animeId, episodeNumber);

  const handleNavigateEpisode = (newEpisodeNumber: number) => {
    router.push(`/anime/${animeId}/watch/${newEpisodeNumber}`);
  };

  const handleAutoPlayNext = () => {
    if (context.nextEpisodeNumber) {
      // Mark current episode as completed when auto-continuing
      watchProgress.markCompleted();
      handleNavigateEpisode(context.nextEpisodeNumber);
    }
  };

  const handleBackToAnime = () => {
    router.push(`/anime/${animeId}?tab=episodes`);
  };

  const handleSearchTorrents = () => {
    const animeTitle =
      context.anime?.titleEnglish || context.anime?.title || "";
    const searchQuery = `${animeTitle} episode ${episodeNumber}`;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // Loading state
  if (context.isLoading) {
    return (
      <div>
        <WatchContextBar
          context={context}
          onNavigateEpisode={handleNavigateEpisode}
        />
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-white">Loading episode data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (context.error || !context.anime || !context.episode) {
    return (
      <div>
        <WatchContextBar
          context={context}
          onNavigateEpisode={handleNavigateEpisode}
        />
        <WatchErrorState
          error={context.error || new Error("Episode not found")}
          onBack={handleBackToAnime}
        />
      </div>
    );
  }

  // No torrent available
  if (!context.bestTorrent) {
    return (
      <div>
        <WatchContextBar
          context={context}
          onNavigateEpisode={handleNavigateEpisode}
        />
        <NoTorrentState
          animeTitle={context.anime.titleEnglish || context.anime.title}
          episodeNumber={episodeNumber}
          onBack={handleBackToAnime}
          onSearchTorrents={handleSearchTorrents}
        />
      </div>
    );
  }

  // Main watch interface
  return (
    <div className="bg-black">
      {/* Context Bar */}
      <WatchContextBar
        context={context}
        onNavigateEpisode={handleNavigateEpisode}
      />

      {/* Enhanced Video Player with Auto-Streaming 
          This automatically:
          1. Takes the best torrent from useWatchContext
          2. Calls GET /torrent/info to load torrent metadata
          3. Selects the best video file automatically
          4. Streams via GET /stream endpoint
          5. Handles progress tracking and auto-continue
      */}
      <StreamingVideoPlayer
        torrent={context.bestTorrent}
        episodeNumber={episodeNumber}
        hasNextEpisode={context.hasNextEpisode}
        onPlayNextEpisode={handleAutoPlayNext}
        onProgressUpdate={watchProgress.updateProgress}
        initialProgress={watchProgress.resumeTime}
      />

      {/* Enhanced Episode Info Bar with Progress */}
      <div className="bg-gray-900 px-6 py-4">
        <div className="container-app">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-white">
                  {context.episode.title}
                </h2>
                {watchProgress.isWatched && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-200">
                    ✓ Completed
                  </span>
                )}
                {watchProgress.hasProgress && !watchProgress.isWatched && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-900 text-orange-200">
                    {Math.round(watchProgress.currentProgress?.progress || 0)}%
                    watched
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>
                  Episode {episodeNumber} of {context.totalEpisodes}
                </span>
                <span>•</span>
                <span>{context.bestTorrent.quality}</span>
                <span>•</span>
                <span>{context.bestTorrent.sizeText}</span>
                <span>•</span>
                <span>{context.bestTorrent.seeders} seeders</span>
                {watchProgress.lastWatchedTime && (
                  <>
                    <span>•</span>
                    <span>
                      Last watched{" "}
                      {watchProgress.lastWatchedTime.toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-2">
              {watchProgress.hasProgress && !watchProgress.isWatched && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={watchProgress.clearProgress}
                  className="text-gray-300 hover:text-white"
                >
                  Reset Progress
                </Button>
              )}
              {context.hasNextEpisode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    context.nextEpisodeNumber &&
                    handleNavigateEpisode(context.nextEpisodeNumber)
                  }
                >
                  Next Episode
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
