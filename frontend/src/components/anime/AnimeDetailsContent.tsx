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
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="text-6xl mb-4">⚠️</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-400 mb-6">
        {error.message || "Failed to load anime details. Please try again."}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  </div>
);

// Loading skeleton for anime details
const AnimeDetailsSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* Banner skeleton */}
    <div className="relative h-80 md:h-96 bg-gray-700">
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
    </div>

    {/* Content skeleton */}
    <div className="container-app py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Poster skeleton */}
        <div className="lg:col-span-1">
          <div className="relative -mt-32 lg:-mt-40">
            <div className="aspect-[3/4] bg-gray-700 rounded-2xl"></div>
          </div>
        </div>

        {/* Details skeleton */}
        <div className="lg:col-span-3 space-y-6">
          <div className="h-8 bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-10 bg-gray-700 rounded w-32"></div>
            <div className="h-10 bg-gray-700 rounded w-24"></div>
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
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Anime not found
          </h3>
          <p className="text-gray-400">
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
    <div>
      {/* Hero Banner Section */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        {/* Background Image - Hidden on mobile */}
        <Image
          src={
            anime.bannerImage || anime.coverImage || "/placeholder-banner.jpg"
          }
          alt={displayTitle}
          fill
          className="hidden md:block object-cover"
          priority
          sizes="100vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="container-app pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Empty space for poster alignment */}
              <div className="lg:col-span-1 hidden lg:block"></div>

              {/* Title and stats aligned with content */}
              <div className="lg:col-span-3 pl-4 lg:pl-0">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                  {displayTitle}
                </h1>

                {/* Quick Stats */}
                <div className="flex items-center space-x-6 text-white/90">
                  {anime.score && (
                    <div className="flex items-center space-x-1">
                      <svg
                        className="w-4 h-4 text-yellow-400"
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
                    <span className="font-medium">
                      {anime.episodes} Episodes
                    </span>
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
      </div>

      {/* Main Content */}
      <div className="container-app py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Poster Column */}
          <div className="lg:col-span-1">
            <div className="relative -mt-32 lg:-mt-40">
              <div className="aspect-[3/4] relative overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src={anime.coverImage || "/placeholder-anime.jpg"}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 25vw"
                />
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-3 space-y-8">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  // Switch to episodes tab
                  setActiveTab("episodes");
                }}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Watch Now
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  // TODO: Add to favorites
                  console.log("Add to favorites clicked");
                }}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Add to List
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "overview"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-300"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("episodes")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            <div className="min-h-[400px]">
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Synopsis */}
                  {anime.description && (
                    <div>
                      <h2 className="text-xl font-bold text-white mb-4">
                        Synopsis
                      </h2>
                      <p className="text-gray-300 leading-relaxed">
                        {anime.description.replace(/<[^>]*>/g, "")}{" "}
                        {/* Strip HTML tags */}
                      </p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">
                      Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Format */}
                      {anime.format && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-1">
                            Format
                          </h3>
                          <p className="text-white">{anime.format}</p>
                        </div>
                      )}

                      {/* Episodes */}
                      {anime.episodes && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-1">
                            Episodes
                          </h3>
                          <p className="text-white">{anime.episodes}</p>
                        </div>
                      )}

                      {/* Duration */}
                      {anime.duration && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-1">
                            Duration
                          </h3>
                          <p className="text-white">
                            {anime.duration} min per episode
                          </p>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">
                          Status
                        </h3>
                        <p
                          className={`font-medium ${getStatusColor(
                            anime.status
                          )}`}
                        >
                          {anime.status.replace(/_/g, " ")}
                        </p>
                      </div>

                      {/* Year */}
                      {anime.year && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-1">
                            Year
                          </h3>
                          <p className="text-white">{anime.year}</p>
                        </div>
                      )}

                      {/* Studios */}
                      {anime.studios && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 mb-1">
                            Studios
                          </h3>
                          <p className="text-white">{anime.studios}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-white mb-4">
                        Genres
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-full text-sm transition-colors cursor-pointer"
                          >
                            {genre.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
