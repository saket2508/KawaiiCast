"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAnimeDetails } from "@/hooks/useAnimeQueries";
import { formatScore, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EpisodeList } from "./EpisodeList";

export interface AnimeDetailsContentProps {
  animeId: number;
}

// Error component
const ErrorState: React.FC<{ error: Error; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="flex items-center justify-center min-h-[50vh] px-4">
    <div className="text-center max-w-sm mx-auto">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        {error.message || "Failed to load anime details. Please try again."}
      </p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  </div>
);

// Loading skeleton for anime details
const AnimeDetailsSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* Mobile-first banner skeleton */}
    <div className="relative h-48 sm:h-64 md:h-80 bg-gray-700">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
    </div>

    {/* Content skeleton */}
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Mobile layout */}
      <div className="space-y-6">
        {/* Poster and basic info */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-32 h-44 sm:w-40 sm:h-56 bg-gray-700 rounded-lg"></div>
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div className="h-6 sm:h-8 bg-gray-700 rounded w-3/4 mx-auto sm:mx-0"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6 mx-auto sm:mx-0"></div>
              <div className="h-4 bg-gray-700 rounded w-4/6 mx-auto sm:mx-0"></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
              <div className="h-10 bg-gray-700 rounded w-32 mx-auto sm:mx-0"></div>
              <div className="h-10 bg-gray-700 rounded w-24 mx-auto sm:mx-0"></div>
            </div>
          </div>
        </div>

        {/* Tab skeleton */}
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-gray-700">
            <div className="h-4 bg-gray-700 rounded w-20 mb-3"></div>
            <div className="h-4 bg-gray-700 rounded w-16 mb-3"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// TODO: Fix responsiveness; UI/UX needs some work
type TabType = "overview" | "episodes";

export const AnimeDetailsContent: React.FC<AnimeDetailsContentProps> = ({
  animeId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data: anime, isLoading, error, refetch } = useAnimeDetails(animeId);

  // Loading state
  if (isLoading) {
    return <AnimeDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  }

  // No data state
  if (!anime) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Anime not found
          </h3>
          <p className="text-gray-400 text-sm">
            The anime you&apos;re looking for doesn&apos;t exist or may have
            been removed.
          </p>
        </div>
      </div>
    );
  }

  const displayTitle = anime.titleEnglish || anime.title;
  const genres = anime.genres ? anime.genres.split(",") : [];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Banner Section - Mobile First */}
      <div className="relative">
        {/* Background Image Container */}
        <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
          <Image
            src={
              anime.bannerImage || anime.coverImage || "/placeholder-banner.jpg"
            }
            alt={displayTitle}
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-transparent to-gray-900/40" />
        </div>

        {/* Hero Content Overlay */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
                {displayTitle}
              </h1>

              {/* Quick Stats - Mobile Optimized */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-white/90 text-sm sm:text-base">
                {anime.score && (
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-yellow-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium">
                      {formatScore(anime.score)}
                    </span>
                  </div>
                )}

                {anime.year && (
                  <span className="font-medium">{anime.year}</span>
                )}

                {anime.episodes && (
                  <span className="font-medium">{anime.episodes} Episodes</span>
                )}

                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    anime.status
                  )}`}
                >
                  {anime.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile First Layout */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile: Stacked Layout, Desktop: Side-by-side */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Poster and Basic Info Section */}
          <div className="lg:w-80 flex-shrink-0">
            {/* Poster */}
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="relative w-48 h-64 sm:w-56 sm:h-72 lg:w-full lg:h-96 rounded-xl overflow-hidden shadow-2xl">
                <Image
                  src={anime.coverImage || "/placeholder-anime.jpg"}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 320px"
                />
              </div>
            </div>

            {/* Quick Actions - Mobile Centered, Desktop Full Width */}
            <div className="flex flex-col gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                onClick={() => setActiveTab("episodes")}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg
                    className="w-6 h-6 flex-shrink-0 drop-shadow-sm"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="font-semibold text-white drop-shadow-sm">
                    Watch Now
                  </span>
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full border-2 border-gray-600 bg-gray-800/50 hover:bg-gray-700/70 hover:border-gray-500 transition-all duration-200 transform hover:scale-[1.01]"
                onClick={() => {
                  // TODO: Add to favorites
                  console.log("Add to favorites clicked");
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="font-medium text-gray-200">Add to List</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Tab Navigation - Mobile Optimized */}
            <div className="border-b border-gray-700 mb-6">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex-1 sm:flex-none py-3 px-4 sm:px-6 border-b-2 font-medium text-sm sm:text-base transition-colors ${
                    activeTab === "overview"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("episodes")}
                  className={`flex-1 sm:flex-none py-3 px-4 sm:px-6 border-b-2 font-medium text-sm sm:text-base transition-colors ${
                    activeTab === "episodes"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                  }`}
                >
                  Episodes
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6 sm:space-y-8">
              {activeTab === "overview" && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Synopsis */}
                  {anime.description && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                        Synopsis
                      </h2>
                      <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                        {anime.description.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>
                  )}

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                        Genres
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-gray-800/70 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-full text-sm transition-colors cursor-pointer border border-gray-700/50"
                          >
                            {genre.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Information Section - Moved below genres */}
                  {/* <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                      Information
                    </h2>
                    <div className="bg-gray-800/50 rounded-lg p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {anime.format && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                              Format
                            </span>
                            <span className="text-white text-sm font-semibold">
                              {anime.format}
                            </span>
                          </div>
                        )}

                        {anime.episodes && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                              Episodes
                            </span>
                            <span className="text-white text-sm font-semibold">
                              {anime.episodes}
                            </span>
                          </div>
                        )}

                        {anime.duration && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                              Duration
                            </span>
                            <span className="text-white text-sm font-semibold">
                              {anime.duration} min per episode
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                            Status
                          </span>
                          <span
                            className={`text-sm font-semibold ${getStatusColor(
                              anime.status
                            )}`}
                          >
                            {anime.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {anime.year && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                              Year
                            </span>
                            <span className="text-white text-sm font-semibold">
                              {anime.year}
                            </span>
                          </div>
                        )}

                        {anime.studios && (
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="text-gray-400 text-sm font-medium mb-1 sm:mb-0">
                              Studios
                            </span>
                            <span className="text-white text-sm font-semibold">
                              {anime.studios}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div> */}
                </div>
              )}

              {activeTab === "episodes" && (
                <EpisodeList animeId={animeId} animeTitle={displayTitle} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
