import React, { useState, useEffect } from "react";
import { Play, Download, Users, HardDrive, Star, Clock } from "lucide-react";

interface Torrent {
  title: string;
  magnet: string;
  size: number;
  sizeText: string;
  seeders: number;
  quality: string;
  releaseGroup: string;
  episodeNumber: number;
}

interface Episode {
  number: number;
  title: string;
  torrents: Torrent[];
  hasTorrents: boolean;
}

interface EpisodeListProps {
  animeId: number;
  animeTitle: string;
  totalEpisodes: number;
  onStreamEpisode: (
    magnet: string,
    episodeNumber: number,
    title: string
  ) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  animeId,
  animeTitle,
  totalEpisodes,
  onStreamEpisode,
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const [searchingTorrents, setSearchingTorrents] = useState<number | null>(
    null
  );

  const BACKEND_URL = "http://localhost:8080";

  // Load episodes on component mount
  useEffect(() => {
    loadEpisodes();
  }, [animeId]);

  const loadEpisodes = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/anime/${animeId}/episodes`
      );

      if (!response.ok) {
        throw new Error("Failed to load episodes");
      }

      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      setError("Failed to load episodes. Please try again.");
      console.error("Episodes loading error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search torrents for specific episode
  const searchEpisodeTorrents = async (episodeNumber: number) => {
    setSearchingTorrents(episodeNumber);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/anime/${animeId}/torrents?episode=${episodeNumber}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to search torrents");
      }

      const data = await response.json();

      // Update the specific episode with torrents
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.number === episodeNumber
            ? { ...ep, torrents: data.torrents || [], hasTorrents: true }
            : ep
        )
      );

      // Expand the episode to show torrents
      setExpandedEpisode(episodeNumber);
    } catch (err) {
      console.error("Torrent search error:", err);
    } finally {
      setSearchingTorrents(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getQualityColor = (quality: string) => {
    switch (quality.toLowerCase()) {
      case "1080p":
        return "bg-green-600 text-green-100";
      case "720p":
        return "bg-blue-600 text-blue-100";
      case "480p":
        return "bg-yellow-600 text-yellow-100";
      default:
        return "bg-gray-600 text-gray-100";
    }
  };

  const getSeedersColor = (seeders: number) => {
    if (seeders >= 50) return "text-green-400";
    if (seeders >= 10) return "text-yellow-400";
    return "text-red-400";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">
          Episodes ({episodes.length})
        </h3>
        <div className="text-sm text-gray-400">
          Click episode to search for torrents
        </div>
      </div>

      <div className="grid gap-3">
        {episodes.map((episode) => (
          <div
            key={episode.number}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            {/* Episode Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between"
              onClick={() => {
                if (episode.hasTorrents && expandedEpisode === episode.number) {
                  setExpandedEpisode(null);
                } else if (episode.hasTorrents) {
                  setExpandedEpisode(episode.number);
                } else {
                  searchEpisodeTorrents(episode.number);
                }
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {episode.number}
                </div>

                <div>
                  <h4 className="text-white font-medium">
                    Episode {episode.number}
                  </h4>
                  <p className="text-gray-400 text-sm">{episode.title}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {episode.hasTorrents && (
                  <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                    {episode.torrents.length} torrent
                    {episode.torrents.length !== 1 ? "s" : ""}
                  </span>
                )}

                {searchingTorrents === episode.number ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <Play className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Torrents List */}
            {expandedEpisode === episode.number &&
              episode.torrents.length > 0 && (
                <div className="border-t border-gray-700 bg-gray-750">
                  <div className="p-4 space-y-3">
                    <h5 className="text-sm font-medium text-gray-300 mb-3">
                      Available Torrents:
                    </h5>

                    {episode.torrents.map((torrent, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-lg p-3 border border-gray-600 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${getQualityColor(
                                torrent.quality
                              )}`}
                            >
                              {torrent.quality}
                            </span>
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                              {torrent.releaseGroup}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              onStreamEpisode(
                                torrent.magnet,
                                episode.number,
                                `${animeTitle} - Episode ${episode.number}`
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span>Stream</span>
                          </button>
                        </div>

                        <div
                          className="text-sm text-gray-300 mb-2 line-clamp-1"
                          title={torrent.title}
                        >
                          {torrent.title}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <HardDrive className="w-3 h-3 mr-1" />
                              {torrent.sizeText || formatBytes(torrent.size)}
                            </div>

                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              <span
                                className={getSeedersColor(torrent.seeders)}
                              >
                                {torrent.seeders} seeders
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(torrent.magnet, "_blank");
                            }}
                            className="text-blue-400 hover:text-blue-300 flex items-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* No Torrents Found */}
            {expandedEpisode === episode.number &&
              episode.torrents.length === 0 &&
              episode.hasTorrents && (
                <div className="border-t border-gray-700 p-4 text-center text-gray-400">
                  No torrents found for this episode
                </div>
              )}
          </div>
        ))}
      </div>

      {episodes.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-400">
          No episodes available
        </div>
      )}
    </div>
  );
};
