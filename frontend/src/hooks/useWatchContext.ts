import {
  useAnimeDetails,
  useAnimeEpisodes,
  useAnimeTorrents,
} from "./useAnimeQueries";
import { Episode, EpisodeTorrent } from "@/types/api";

export interface WatchContextData {
  anime: ReturnType<typeof useAnimeDetails>["data"];
  episode: Episode | null;
  episodeNumber: number;
  totalEpisodes: number;
  hasNextEpisode: boolean;
  hasPreviousEpisode: boolean;
  nextEpisodeNumber: number | null;
  previousEpisodeNumber: number | null;
  bestTorrent: EpisodeTorrent | null;
  isLoading: boolean;
  error: Error | null;
}

export const useWatchContext = (
  animeId: number,
  episodeNumber: number
): WatchContextData => {
  const {
    data: anime,
    isLoading: animeLoading,
    error: animeError,
  } = useAnimeDetails(animeId);

  // Calculate which page the episode should be on
  // API typically returns 100 episodes per page (episodes 1-100 on page 1, 101-200 on page 2, etc.)
  // This ensures we fetch the correct page containing the requested episode
  const episodesPerPage = 100;
  const pageNumber = Math.ceil(episodeNumber / episodesPerPage);

  const {
    data: episodeData,
    isLoading: episodesLoading,
    error: episodesError,
  } = useAnimeEpisodes(animeId, pageNumber);

  // Find the specific episode
  const episode =
    episodeData?.episodes?.find((ep) => ep.number === episodeNumber) || null;

  // Check if episode has torrents, if not, fetch them
  // This ensures torrents are fetched from /anime/:id/torrents endpoint
  // and cached if the episode data doesn't already include them
  const needsTorrents = Boolean(
    episode && (!episode.torrents || episode.torrents.length === 0)
  );

  const {
    data: torrentsData,
    isLoading: torrentsLoading,
    error: torrentsError,
  } = useAnimeTorrents(animeId, episodeNumber, undefined, {
    enabled: needsTorrents,
  });

  // Calculate episode navigation
  // Use total episodes from anime details or pagination info, not just loaded episodes
  const totalEpisodes =
    anime?.episodes ||
    episodeData?.anime?.totalEpisodes ||
    episodeData?.pagination?.items?.total ||
    0;
  const hasNextEpisode = episodeNumber < totalEpisodes;
  const hasPreviousEpisode = episodeNumber > 1;
  const nextEpisodeNumber = hasNextEpisode ? episodeNumber + 1 : null;
  const previousEpisodeNumber = hasPreviousEpisode ? episodeNumber - 1 : null;

  // Get best torrent for current episode
  // Use torrents from episode data first, then from torrents API
  const availableTorrents = episode?.torrents?.length
    ? episode.torrents
    : torrentsData?.torrents || [];

  const bestTorrent = availableTorrents.length
    ? getBestTorrent(availableTorrents)
    : null;

  // Combined loading and error states
  const isLoading = Boolean(
    animeLoading || episodesLoading || (needsTorrents && torrentsLoading)
  );
  const error = animeError || episodesError || torrentsError;

  return {
    anime,
    episode,
    episodeNumber,
    totalEpisodes,
    hasNextEpisode,
    hasPreviousEpisode,
    nextEpisodeNumber,
    previousEpisodeNumber,
    bestTorrent,
    isLoading,
    error: error as Error | null,
  };
};

// Helper function to get the best quality torrent
const getBestTorrent = (torrents: EpisodeTorrent[]): EpisodeTorrent => {
  // Sort by quality preference (1080p > 720p > 480p) and then by seeders
  const qualityOrder = { "1080p": 3, "720p": 2, "480p": 1 };

  return torrents.sort((a, b) => {
    const aQuality = qualityOrder[a.quality as keyof typeof qualityOrder] || 0;
    const bQuality = qualityOrder[b.quality as keyof typeof qualityOrder] || 0;

    // First sort by quality
    if (aQuality !== bQuality) {
      return bQuality - aQuality;
    }

    // Then by seeders
    return b.seeders - a.seeders;
  })[0];
};
