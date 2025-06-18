"use client";

import React, { useEffect } from "react";
import { AnimeGrid, LinkedAnimeCard } from "../anime/AnimeCard";
import { Anime } from "@/types/api";
import { useAnimeData } from "@/hooks/useAnimeQueries";

export interface SearchResultsProps {
  query?: string;
  view: "grid" | "list";
  onResultsCountChange?: (count: number) => void;
}

// No results component
const NoResults: React.FC<{ query: string }> = ({ query }) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-white mb-2">No anime found</h3>
      <p className="text-gray-400 mb-6">
        {query
          ? `No results found for "${query}". Try a different search term.`
          : "Start typing to search for anime."}
      </p>
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Popular searches:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
            One Piece
          </span>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
            Naruto
          </span>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
            Attack on Titan
          </span>
        </div>
      </div>
    </div>
  </div>
);

// Loading skeleton component
const AnimeCardSkeleton: React.FC = () => (
  <div className="card-anime animate-pulse">
    <div className="aspect-[3/4] bg-gray-700 rounded-t-2xl"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-gray-700 rounded w-1/4"></div>
        <div className="h-3 bg-gray-700 rounded w-1/4"></div>
      </div>
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
        Something went wrong
      </h3>
      <p className="text-gray-400 mb-6">
        {error.message || "Failed to load anime data. Please try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  view,
  onResultsCountChange,
}) => {
  // Get data from API (trending when no search, search results when searching)
  // No debouncing needed since search is triggered on form submit, not on input change
  const {
    data: results,
    isLoading,
    error,
    isSearching,
    refetch,
  } = useAnimeData(query || "");

  // Update parent with results count
  useEffect(() => {
    if (onResultsCountChange) {
      onResultsCountChange(results.length);
    }
  }, [results.length, onResultsCountChange]);

  // Loading state - show skeleton while loading
  if (isLoading) {
    return (
      <div>
        <AnimeGrid>
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </AnimeGrid>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  }

  // No results state
  if (results.length === 0) {
    return <NoResults query={query || ""} />;
  }

  // Results
  return (
    <div className="space-y-8">
      {/* Show what we're displaying */}
      {!isSearching && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400">🔥 Trending anime</p>
        </div>
      )}

      {/* Results Grid/List */}
      {view === "grid" ? (
        <AnimeGrid>
          {results.map((anime: Anime) => (
            <LinkedAnimeCard
              key={anime.id}
              href={`/anime/${anime.id}`}
              anime={anime}
              variant="grid"
              showMetadata={true}
            />
          ))}
        </AnimeGrid>
      ) : (
        <div className="space-y-4">
          {results.map((anime: Anime) => (
            <LinkedAnimeCard
              key={anime.id}
              href={`/anime/${anime.id}`}
              anime={anime}
              variant="list"
              showMetadata={true}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center py-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          Showing {results.length}{" "}
          {isSearching ? "search results" : "trending anime"}
          {query && ` for "${query}"`}
        </p>
      </div>
    </div>
  );
};
