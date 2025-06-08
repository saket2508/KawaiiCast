"use client";

import React, { useState } from "react";
import { Episode, EpisodeTorrent } from "@/types/api";
import { Button } from "@/components/ui/Button";

export interface EpisodeCardProps {
  episode: Episode;
  onWatch: (magnet: string) => void;
  onSearchTorrents?: (episodeNumber: number) => void;
  className?: string;
}

// Quality selector modal
const QualitySelector: React.FC<{
  torrents: EpisodeTorrent[];
  onSelect: (torrent: EpisodeTorrent) => void;
  onClose: () => void;
}> = ({ torrents, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Choose Quality</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {torrents
          .sort((a, b) => b.seeders - a.seeders) // Sort by seeders
          .map((torrent, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => onSelect(torrent)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                    {torrent.quality}
                  </span>
                  <span className="text-sm text-gray-300">
                    {torrent.releaseGroup}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {torrent.seeders} seeders • {torrent.sizeText}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  onWatch,
  onSearchTorrents,
  className = "",
}) => {
  const [showQualitySelector, setShowQualitySelector] = useState(false);

  const handleWatchClick = () => {
    if (!episode.hasTorrents) {
      // No torrents available, trigger search
      if (onSearchTorrents) {
        onSearchTorrents(episode.number);
      }
      return;
    }

    if (episode.torrents.length === 1) {
      // Only one torrent, watch directly
      onWatch(episode.torrents[0].magnet);
    } else {
      // Multiple torrents, show quality selector
      setShowQualitySelector(true);
    }
  };

  const handleQualitySelect = (torrent: EpisodeTorrent) => {
    setShowQualitySelector(false);
    onWatch(torrent.magnet);
  };

  const getBestQuality = () => {
    if (!episode.hasTorrents) return null;

    // Sort by quality preference (1080p > 720p > 480p)
    const qualityOrder = { "1080p": 3, "720p": 2, "480p": 1 };
    const sorted = episode.torrents.sort((a, b) => {
      const aQuality =
        qualityOrder[a.quality as keyof typeof qualityOrder] || 0;
      const bQuality =
        qualityOrder[b.quality as keyof typeof qualityOrder] || 0;
      return bQuality - aQuality;
    });

    return sorted[0];
  };

  const getAvailableQualities = () => {
    if (!episode.hasTorrents) return [];

    const qualities = [...new Set(episode.torrents.map((t) => t.quality))];
    return qualities.sort((a, b) => {
      const qualityOrder = { "1080p": 3, "720p": 2, "480p": 1 };
      const aValue = qualityOrder[a as keyof typeof qualityOrder] || 0;
      const bValue = qualityOrder[b as keyof typeof qualityOrder] || 0;
      return bValue - aValue;
    });
  };

  const bestTorrent = getBestQuality();
  const availableQualities = getAvailableQualities();

  return (
    <>
      <div
        className={`bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors group ${className}`}
      >
        <div className="flex items-center justify-between">
          {/* Episode Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-lg font-bold text-white">
                Episode {episode.number}
              </span>

              {/* Availability Indicator */}
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    episode.hasTorrents ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    episode.hasTorrents ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {episode.hasTorrents ? "Available" : "Not Available"}
                </span>
              </div>
            </div>

            <h3 className="text-sm text-gray-300 mb-2 truncate">
              {episode.title}
            </h3>

            {/* Quality Badges */}
            {episode.hasTorrents && (
              <div className="flex items-center space-x-2">
                {availableQualities.map((quality) => (
                  <span
                    key={quality}
                    className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-medium rounded"
                  >
                    {quality}
                  </span>
                ))}
                {episode.torrents.length > 1 && (
                  <span className="text-xs text-gray-400">
                    +{episode.torrents.length} sources
                  </span>
                )}
              </div>
            )}

            {/* Best Torrent Info */}
            {bestTorrent && (
              <div className="mt-2 text-xs text-gray-400">
                Best: {bestTorrent.releaseGroup} • {bestTorrent.seeders} seeders
                • {bestTorrent.sizeText}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0 ml-4">
            <Button
              variant={episode.hasTorrents ? "primary" : "secondary"}
              size="sm"
              onClick={handleWatchClick}
            >
              {episode.hasTorrents ? (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  Watch
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quality Selector Modal */}
      {showQualitySelector && (
        <QualitySelector
          torrents={episode.torrents}
          onSelect={handleQualitySelect}
          onClose={() => setShowQualitySelector(false)}
        />
      )}
    </>
  );
};
