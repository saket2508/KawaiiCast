import React from "react";
import { Star, Calendar, Play } from "lucide-react";

interface AnimeCardProps {
  anime: {
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
  };
  onClick?: () => void;
  size?: "small" | "medium" | "large";
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  onClick,
  size = "medium",
}) => {
  const sizeClasses = {
    small: "w-32 h-44",
    medium: "w-40 h-56",
    large: "w-48 h-64",
  };

  const displayTitle = anime.titleEnglish || anime.title;

  return (
    <div
      className={`${sizeClasses[size]} bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-gray-700 hover:border-blue-500`}
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative h-3/4 overflow-hidden">
        {anime.coverImage ? (
          <img
            src={anime.coverImage}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-500" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Score Badge */}
        {anime.score && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-yellow-400 text-xs px-2 py-1 rounded-full flex items-center">
            <Star className="w-3 h-3 mr-1" />
            {anime.score}
          </div>
        )}

        {/* Episodes Badge */}
        {anime.episodes && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {anime.episodes} eps
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="h-1/4 p-2 flex flex-col justify-between">
        <h3
          className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 transition-colors"
          title={displayTitle}
        >
          {displayTitle}
        </h3>

        <div className="flex items-center justify-between text-xs text-gray-400">
          {anime.year && (
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {anime.year}
            </div>
          )}

          {anime.status && (
            <span
              className={`px-2 py-1 rounded text-xs ${
                anime.status === "RELEASING"
                  ? "bg-green-900 text-green-300"
                  : anime.status === "FINISHED"
                  ? "bg-blue-900 text-blue-300"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {anime.status === "RELEASING"
                ? "Ongoing"
                : anime.status === "FINISHED"
                ? "Complete"
                : anime.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
