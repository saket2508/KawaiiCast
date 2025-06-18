import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, Grid, List, X } from "lucide-react";
import { AnimeCard } from "./AnimeCard";

interface Anime {
  id: number;
  title: string;
  titleEnglish?: string;
  coverImage?: string;
  bannerImage?: string;
  episodes?: number;
  score?: number;
  year?: number;
  genres?: string;
  status?: string;
}

interface AnimeSearchProps {
  onAnimeSelect: (anime: Anime) => void;
}

export const AnimeSearch: React.FC<AnimeSearchProps> = ({ onAnimeSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const BACKEND_URL = "http://localhost:8080";

  // Debounced search function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const searchAnime = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/anime/search?query=${encodeURIComponent(
          query
        )}&limit=20`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError("Failed to search anime. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(debounce(searchAnime, 300), [
    searchAnime,
  ]);

  // Load trending anime on component mount
  useEffect(() => {
    const loadTrendingAnime = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/anime/trending?limit=12`
        );
        if (response.ok) {
          const data = await response.json();
          setTrendingAnime(data.results || []);
        }
      } catch (err) {
        console.error("Failed to load trending anime:", err);
      }
    };

    loadTrendingAnime();
  }, []);

  // Handle search input change
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const displayedAnime = searchQuery.trim() ? searchResults : trendingAnime;
  const title = searchQuery.trim()
    ? `Search Results for "${searchQuery}"`
    : "Trending Anime";

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime titles..."
            className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Year
              </label>
              <select className="w-full bg-gray-700 border border-gray-600 rounded text-white p-2">
                <option value="">Any Year</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select className="w-full bg-gray-700 border border-gray-600 rounded text-white p-2">
                <option value="">Any Status</option>
                <option value="RELEASING">Ongoing</option>
                <option value="FINISHED">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select className="w-full bg-gray-700 border border-gray-600 rounded text-white p-2">
                <option value="popularity">Popularity</option>
                <option value="score">Score</option>
                <option value="year">Year</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <div
          className={`
          ${
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              : "space-y-4"
          }
        `}
        >
          {displayedAnime.map((anime) => (
            <div key={anime.id}>
              {viewMode === "grid" ? (
                <AnimeCard
                  anime={anime}
                  onClick={() => onAnimeSelect(anime)}
                  size="medium"
                />
              ) : (
                <div
                  className="flex items-center space-x-4 bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors border border-gray-700 hover:border-blue-500"
                  onClick={() => onAnimeSelect(anime)}
                >
                  <img
                    src={anime.coverImage}
                    alt={anime.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-white font-medium">
                      {anime.titleEnglish || anime.title}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      {anime.year && <span>{anime.year}</span>}
                      {anime.episodes && <span>{anime.episodes} episodes</span>}
                      {anime.score && (
                        <div className="flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1">{anime.score}</span>
                        </div>
                      )}
                    </div>
                    {anime.genres && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-1">
                        {anime.genres}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && displayedAnime.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-400">
          No anime found for "{searchQuery}". Try a different search term.
        </div>
      )}
    </div>
  );
};
