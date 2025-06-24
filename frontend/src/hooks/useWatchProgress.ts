"use client";
import { useState, useCallback } from "react";

export interface WatchProgress {
  animeId: number;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  progress: number; // Percentage 0-100
  lastWatched: Date;
  completed: boolean;
}

export interface WatchHistory {
  [key: string]: WatchProgress; // Key format: "animeId-episodeNumber"
}

const STORAGE_KEY = "torrent-streamer-watch-progress";

// Helper function to create storage key
const createProgressKey = (animeId: number, episodeNumber: number): string => {
  return `${animeId}-${episodeNumber}`;
};

// Helper function to load watch history from localStorage
const loadWatchHistory = (): WatchHistory => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert lastWatched strings back to Date objects
      Object.keys(parsed).forEach((key) => {
        if (parsed[key].lastWatched) {
          parsed[key].lastWatched = new Date(parsed[key].lastWatched);
        }
      });
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load watch history:", error);
  }
  return {};
};

// Helper function to save watch history to localStorage
const saveWatchHistory = (history: WatchHistory): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save watch history:", error);
  }
};

export const useWatchProgress = (animeId: number, episodeNumber: number) => {
  const [watchHistory, setWatchHistory] = useState<WatchHistory>(() =>
    loadWatchHistory()
  );
  const progressKey = createProgressKey(animeId, episodeNumber);
  const currentProgress = watchHistory[progressKey];

  // Update progress for current episode
  const updateProgress = useCallback(
    (progress: number, currentTime: number, duration: number) => {
      const completed = progress >= 90; // Consider 90%+ as completed
      const minWatchTime = 30; // Only save progress after watching for 30 seconds

      // Don't save very early progress or very short videos
      if (currentTime < minWatchTime || duration < 60) {
        return;
      }

      const newProgress: WatchProgress = {
        animeId,
        episodeNumber,
        currentTime,
        duration,
        progress,
        lastWatched: new Date(),
        completed,
      };

      setWatchHistory((prev) => {
        const updated = {
          ...prev,
          [progressKey]: newProgress,
        };
        saveWatchHistory(updated);
        return updated;
      });
    },
    [animeId, episodeNumber, progressKey]
  );

  // Mark episode as completed
  const markCompleted = useCallback(() => {
    setWatchHistory((prev) => {
      const existing = prev[progressKey];
      if (!existing) return prev;

      const updated = {
        ...prev,
        [progressKey]: {
          ...existing,
          completed: true,
          progress: 100,
          lastWatched: new Date(),
        },
      };
      saveWatchHistory(updated);
      return updated;
    });
  }, [progressKey]);

  // Remove progress for specific episode
  const clearProgress = useCallback(() => {
    setWatchHistory((prev) => {
      const updated = { ...prev };
      delete updated[progressKey];
      saveWatchHistory(updated);
      return updated;
    });
  }, [progressKey]);

  // Get progress for any episode of the anime
  const getEpisodeProgress = useCallback(
    (episodeNum: number): WatchProgress | undefined => {
      const key = createProgressKey(animeId, episodeNum);
      return watchHistory[key];
    },
    [animeId, watchHistory]
  );

  // Get all progress for the anime (useful for episode lists)
  const getAnimeProgress = useCallback((): WatchProgress[] => {
    return Object.values(watchHistory)
      .filter((progress) => progress.animeId === animeId)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [animeId, watchHistory]);

  // Get resume time (null if episode is completed or never watched)
  const getResumeTime = useCallback((): number => {
    if (!currentProgress || currentProgress.completed) {
      return 0;
    }

    // Don't resume if very close to beginning or end
    if (currentProgress.currentTime < 30 || currentProgress.progress > 95) {
      return 0;
    }

    return currentProgress.currentTime;
  }, [currentProgress]);

  // Check if episode has been watched
  const isWatched = currentProgress?.completed || false;
  const hasProgress = currentProgress && currentProgress.currentTime > 30;
  const lastWatchedTime = currentProgress?.lastWatched;

  return {
    // Current episode data
    currentProgress,
    isWatched,
    hasProgress,
    lastWatchedTime,
    resumeTime: getResumeTime(),

    // Actions
    updateProgress,
    markCompleted,
    clearProgress,

    // Query functions
    getEpisodeProgress,
    getAnimeProgress,

    // Raw data
    watchHistory,
  };
};
