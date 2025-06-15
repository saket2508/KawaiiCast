"use client";

import React from "react";
import Link from "next/link";
import { WatchContextData } from "@/hooks/useWatchContext";
import { Button } from "@/components/ui/Button";

export interface WatchContextBarProps {
  context: WatchContextData;
  onNavigateEpisode: (episodeNumber: number) => void;
}

export const WatchContextBar: React.FC<WatchContextBarProps> = ({
  context,
  onNavigateEpisode,
}) => {
  const {
    anime,
    episode,
    episodeNumber,
    totalEpisodes,
    hasNextEpisode,
    hasPreviousEpisode,
    nextEpisodeNumber,
    previousEpisodeNumber,
    bestTorrent,
  } = context;

  if (!anime || !episode) {
    return (
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
        <div className="container-app">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
              <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const animeTitle = anime.titleEnglish || anime.title;

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="container-app">
        <div className="flex items-center justify-between">
          {/* Left side - Anime and Episode Info */}
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Back to Anime Details */}
            <Link
              href={`/anime/${anime.id}`}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>

            {/* Anime Title and Episode */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <Link
                  href={`/anime/${anime.id}`}
                  className="text-lg font-bold text-white hover:text-orange-400 transition-colors truncate"
                >
                  {animeTitle}
                </Link>
                <span className="text-gray-400">•</span>
                <span className="text-orange-400 font-medium whitespace-nowrap">
                  Episode {episodeNumber}
                </span>
                <span className="text-gray-500 text-sm whitespace-nowrap">
                  of {totalEpisodes}
                </span>
              </div>

              {/* Episode Title */}
              {episode.title &&
                episode.title !== `Episode ${episodeNumber}` && (
                  <p className="text-sm text-gray-400 truncate mt-1">
                    {episode.title}
                  </p>
                )}
            </div>
          </div>

          {/* Right side - Navigation and Quality Info */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Quality Badge */}
            {bestTorrent && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded font-medium">
                  {bestTorrent.quality}
                </span>
                <span className="text-gray-400">
                  {bestTorrent.releaseGroup}
                </span>
                <span className="text-gray-500">
                  {bestTorrent.seeders} seeders
                </span>
              </div>
            )}

            {/* Episode Navigation */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasPreviousEpisode}
                onClick={() =>
                  previousEpisodeNumber &&
                  onNavigateEpisode(previousEpisodeNumber)
                }
                className="flex items-center space-x-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                disabled={!hasNextEpisode}
                onClick={() =>
                  nextEpisodeNumber && onNavigateEpisode(nextEpisodeNumber)
                }
                className="flex items-center space-x-1"
              >
                <span className="hidden sm:inline">Next</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
