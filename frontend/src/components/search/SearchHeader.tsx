"use client";

import React from "react";
import { SmartSearchInput } from "../ui/SmartSearchInput";
import { IconButton } from "../ui/Button";

export interface SearchHeaderProps {
  query: string;
  onSearch: (query: string) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  resultsCount: number;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  query,
  onSearch,
  view,
  onViewChange,
  resultsCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Page Title & Search */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <h1 className="text-display text-white mb-2">
            {query ? (
              <>
                Search results for{" "}
                <span className="text-gradient">&ldquo;{query}&rdquo;</span>
              </>
            ) : (
              <span className="text-gradient">Discover Anime</span>
            )}
          </h1>

          {query && resultsCount > 0 && (
            <p className="text-gray-400">
              Found {resultsCount.toLocaleString()} results
            </p>
          )}
        </div>

        {/* Search Input */}
        <div className="max-w-2xl">
          <SmartSearchInput
            variant="navbar"
            placeholder="Search for anime titles..."
            onAnimeSearch={onSearch}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between py-4 border-t border-b border-gray-700">
        {/* Left side - Results info */}
        <div className="flex items-center space-x-4">
          {query && (
            <span className="text-sm text-gray-400">
              {resultsCount === 0
                ? "No results"
                : `${resultsCount.toLocaleString()} anime`}
            </span>
          )}
        </div>

        {/* Right side - View controls */}
        <div className="flex items-center space-x-3">
          {/* Grid View */}
          <IconButton
            variant="ghost"
            onClick={() => onViewChange("grid")}
            className={`${
              view === "grid" ? "text-orange-400" : "text-gray-400"
            } hover:text-white`}
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </IconButton>

          {/* List View */}
          <IconButton
            variant="ghost"
            onClick={() => onViewChange("list")}
            className={`${
              view === "list" ? "text-orange-400" : "text-gray-400"
            } hover:text-white`}
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Quick Actions / Trending (when no search) */}
      {!query && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSearch("One Piece")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            🔥 One Piece
          </button>
          <button
            onClick={() => onSearch("Naruto")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            ⭐ Naruto
          </button>
          <button
            onClick={() => onSearch("Attack on Titan")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            ⚔️ Attack on Titan
          </button>
          <button
            onClick={() => onSearch("Demon Slayer")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            💕 Demon Slayer
          </button>
        </div>
      )}
    </div>
  );
};
