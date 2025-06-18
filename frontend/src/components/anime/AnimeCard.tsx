"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime } from "@/types/api";
import { formatScore, getStatusColor, truncateText } from "@/lib/utils";

export interface AnimeCardProps {
  anime: Anime;
  variant?: "grid" | "list" | "banner";
  size?: "small" | "medium" | "large";
  showMetadata?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
  disableInternalLinks?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  variant = "grid",
  showMetadata = true,
  showProgress = false,
  onClick,
  className = "",
  disableInternalLinks = false,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (variant === "list") {
    return (
      <AnimeListCard
        anime={anime}
        showMetadata={showMetadata}
        onClick={handleClick}
        className={className}
        disableInternalLinks={disableInternalLinks}
      />
    );
  }

  if (variant === "banner") {
    return (
      <AnimeBannerCard
        anime={anime}
        onClick={handleClick}
        className={className}
        disableInternalLinks={disableInternalLinks}
      />
    );
  }

  // Grid variant (default)
  return (
    <div
      className={`card-anime group cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={anime.coverImage || "/placeholder-anime.jpg"}
          alt={anime.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Score Badge */}
        {anime.score && (
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            <div className="flex items-center space-x-1">
              <svg
                className="w-3 h-3 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-white">
                {formatScore(anime.score)}
              </span>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-medium bg-black/70 backdrop-blur-sm ${getStatusColor(
              anime.status
            )}`}
          >
            {anime.status}
          </span>
        </div>

        {/* Episodes Count */}
        {anime.episodes && (
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-xs font-medium text-white">
              {anime.episodes} EP
            </span>
          </div>
        )}

        {/* Hover Overlay Content */}
        <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
          <div className="w-full">
            {/* Quick Actions */}
            <div className="flex items-center justify-between mb-3">
              {disableInternalLinks ? (
                <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  View Details
                </button>
              ) : (
                <Link href={`/anime/${anime.id}`}>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    View Details
                  </button>
                </Link>
              )}
              <div className="flex space-x-2">
                <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors">
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
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors">
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      {showMetadata && (
        <div className="p-4">
          <h3 className="font-bold text-white text-sm mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
            {anime.titleEnglish || anime.title}
          </h3>

          {anime.description && (
            <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-3">
              {truncateText(anime.description, 120)}
            </p>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{anime.year}</span>
            {anime.genres && (
              <span className="text-orange-400 font-medium">
                {anime.genres.split(",")[0]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 w-1/3"></div>
        </div>
      )}
    </div>
  );
};

// List variant component
const AnimeListCard: React.FC<
  Pick<
    AnimeCardProps,
    "anime" | "showMetadata" | "onClick" | "className" | "disableInternalLinks"
  >
> = ({ anime, showMetadata, onClick, className, disableInternalLinks }) => (
  <div
    className={`card-anime group cursor-pointer p-4 ${className}`}
    onClick={onClick}
  >
    <div className="flex space-x-4">
      {/* Cover Image */}
      <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden rounded-lg">
        <Image
          src={anime.coverImage || "/placeholder-anime.jpg"}
          alt={anime.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="64px"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white text-sm mb-1 group-hover:text-orange-400 transition-colors">
          {anime.titleEnglish || anime.title}
        </h3>

        {showMetadata && anime.description && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">
            {truncateText(anime.description, 100)}
          </p>
        )}

        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>{anime.year}</span>
          {anime.episodes && <span>{anime.episodes} episodes</span>}
          {anime.score && (
            <div className="flex items-center space-x-1">
              <svg
                className="w-3 h-3 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{formatScore(anime.score)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        {disableInternalLinks ? (
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors">
            Details
          </button>
        ) : (
          <Link href={`/anime/${anime.id}`}>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors">
              Details
            </button>
          </Link>
        )}
      </div>
    </div>
  </div>
);

// Banner variant component
const AnimeBannerCard: React.FC<
  Pick<
    AnimeCardProps,
    "anime" | "onClick" | "className" | "disableInternalLinks"
  >
> = ({ anime, onClick, className, disableInternalLinks }) => (
  <div
    className={`relative h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl cursor-pointer group ${className}`}
    onClick={onClick}
  >
    {/* Background Image */}
    <Image
      src={anime.bannerImage || anime.coverImage || "/placeholder-banner.jpg"}
      alt={anime.title}
      fill
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      priority
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
    />

    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

    {/* Content */}
    <div className="absolute inset-0 flex items-center">
      <div className="container-app">
        <div className="max-w-lg">
          <h1 className="text-heading text-white mb-4 drop-shadow-lg">
            {anime.titleEnglish || anime.title}
          </h1>

          {anime.description && (
            <p className="text-gray-200 text-base leading-relaxed mb-6 line-clamp-3">
              {truncateText(anime.description, 200)}
            </p>
          )}

          <div className="flex items-center space-x-6 mb-6">
            {anime.score && (
              <div className="flex items-center space-x-1">
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-white">
                  {formatScore(anime.score)}
                </span>
              </div>
            )}

            <span className="text-sm text-gray-300">{anime.year}</span>

            {anime.episodes && (
              <span className="text-sm text-gray-300">
                {anime.episodes} Episodes
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {disableInternalLinks ? (
              <button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                Watch Now
              </button>
            ) : (
              <Link href={`/anime/${anime.id}`}>
                <button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                  Watch Now
                </button>
              </Link>
            )}
            {disableInternalLinks ? (
              <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-colors backdrop-blur-sm">
                More Info
              </button>
            ) : (
              <Link href={`/anime/${anime.id}`}>
                <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-colors backdrop-blur-sm">
                  More Info
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Grid container component
export const AnimeGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`anime-grid ${className}`}>{children}</div>
);

// Linked anime card wrapper
export const LinkedAnimeCard: React.FC<AnimeCardProps & { href: string }> = ({
  href,
  ...props
}) => (
  <Link href={href}>
    <AnimeCard {...props} disableInternalLinks={true} />
  </Link>
);
