import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Star,
  Calendar,
  PlayCircle,
  Users,
  Eye,
} from "lucide-react";

interface AnimeDetailsProps {
  animeId: number;
  onBack: () => void;
  onStreamEpisode: (
    magnet: string,
    episodeNumber: number,
    title: string
  ) => void;
}

interface AnimeDetails {
  id: number;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  description?: string;
  coverImage?: string;
  bannerImage?: string;
  episodes?: number;
  score?: number;
  year?: number;
  genres?: string;
  status?: string;
  duration?: number;
  studios?: string;
  characters?: Array<{
    name: string;
    image: string;
  }>;
}

export const AnimeDetails: React.FC<AnimeDetailsProps> = ({
  animeId,
  onBack,
  onStreamEpisode,
}) => {
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const BACKEND_URL = "http://localhost:8080";

  useEffect(() => {
    loadAnimeDetails();
  }, [animeId]);

  const loadAnimeDetails = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/anime/${animeId}`);

      if (!response.ok) {
        throw new Error("Failed to load anime details");
      }

      const data = await response.json();
      setAnime(data.anime);
    } catch (err) {
      setError("Failed to load anime details. Please try again.");
      console.error("Anime details error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Anime not found</div>
      </div>
    );
  }

  const displayTitle = anime.titleEnglish || anime.title;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Banner/Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900"></div>
        )}

        <div className="absolute inset-0 bg-black bg-opacity-50"></div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/50 to-transparent">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {displayTitle}
          </h1>
          {anime.titleRomaji && anime.titleRomaji !== displayTitle && (
            <p className="text-gray-300 text-lg">{anime.titleRomaji}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Cover & Quick Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {/* Cover Image */}
              <div className="mb-6">
                {anime.coverImage ? (
                  <img
                    src={anime.coverImage}
                    alt={displayTitle}
                    className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-full max-w-sm mx-auto aspect-[3/4] bg-gray-800 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                {anime.score && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Score</span>
                    <div className="flex items-center text-yellow-400">
                      <Star className="w-4 h-4 mr-1" />
                      <span className="font-medium">{anime.score}/100</span>
                    </div>
                  </div>
                )}

                {anime.year && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Year</span>
                    <span className="text-white">{anime.year}</span>
                  </div>
                )}

                {anime.episodes && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Episodes</span>
                    <span className="text-white">{anime.episodes}</span>
                  </div>
                )}

                {anime.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Duration</span>
                    <span className="text-white">{anime.duration} min</span>
                  </div>
                )}

                {anime.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
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
                        ? "Completed"
                        : anime.status}
                    </span>
                  </div>
                )}

                {anime.studios && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Studio</span>
                    <span className="text-white text-sm text-right">
                      {anime.studios}
                    </span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {anime.genres && (
                <div className="bg-gray-800 rounded-lg p-4 mt-4">
                  <h3 className="text-white font-medium mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.split(", ").map((genre, index) => (
                      <span
                        key={index}
                        className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Description & Episodes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {anime.description && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-white font-bold text-xl mb-4">Synopsis</h3>
                <p className="text-gray-300 leading-relaxed">
                  {anime.description}
                </p>
              </div>
            )}

            {/* Characters */}
            {anime.characters && anime.characters.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-white font-bold text-xl mb-4">
                  Characters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {anime.characters.slice(0, 8).map((character, index) => (
                    <div key={index} className="text-center">
                      <img
                        src={character.image}
                        alt={character.name}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {character.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Episodes Section - This will be imported later */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-bold text-xl mb-4">Episodes</h3>
              <p className="text-gray-400">
                Episode list and torrent integration will be loaded here.
                <br />
                <span className="text-sm">
                  Total Episodes: {anime.episodes || "Unknown"}
                </span>
              </p>

              {/* Placeholder for EpisodeList component */}
              <div className="mt-4 p-4 border-2 border-dashed border-gray-600 rounded-lg text-center text-gray-500">
                EpisodeList component will be integrated here
                <br />
                <small>
                  Will show episode grid with torrent search functionality
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
