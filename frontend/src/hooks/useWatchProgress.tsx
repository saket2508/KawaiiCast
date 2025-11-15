import { useState, useCallback, useEffect, useRef } from "react";

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

// Check if executing in the browser environment
const isBrowser =
  typeof window !== "undefined" && typeof localStorage !== "undefined";

// Type for unknown data from localStorage that needs validation
type UnknownWatchProgress = {
  animeId?: unknown;
  episodeNumber?: unknown;
  currentTime?: unknown;
  duration?: unknown;
  progress?: unknown;
  completed?: unknown;
  lastWatched?: unknown;
  [key: string]: unknown;
};

// Helper function to validate WatchProgress data structure
const validateWatchProgress = (data: unknown): data is WatchProgress => {
  if (!data || typeof data !== "object" || data === null) {
    return false;
  }

  const progress = data as UnknownWatchProgress;

  return (
    typeof progress.animeId === "number" &&
    typeof progress.episodeNumber === "number" &&
    typeof progress.currentTime === "number" &&
    typeof progress.duration === "number" &&
    typeof progress.progress === "number" &&
    typeof progress.completed === "boolean" &&
    progress.animeId > 0 &&
    progress.episodeNumber > 0 &&
    progress.currentTime >= 0 &&
    progress.duration > 0 &&
    progress.progress >= 0 &&
    progress.progress <= 100
  );
};

// Type for unknown data from localStorage that might be WatchHistory
type UnknownWatchHistory = {
  [key: string]: unknown;
};

// Helper function to validate entire WatchHistory structure
const validateWatchHistory = (data: unknown): WatchHistory => {
  if (!data || typeof data !== "object" || data === null) {
    return {};
  }

  const unknownHistory = data as UnknownWatchHistory;
  const validHistory: WatchHistory = {};

  Object.keys(unknownHistory).forEach((key) => {
    if (validateWatchProgress(unknownHistory[key])) {
      // TypeScript knows this is valid WatchProgress due to the type guard
      validHistory[key] = unknownHistory[key] as WatchProgress;
    } else {
      console.warn(`Invalid watch progress data for key ${key}, skipping`);
    }
  });

  return validHistory;
};

const loadWatchHistory = (): WatchHistory => {
  if (!isBrowser) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[loadWatchHistory] No watch history found");
      return {};
    }

    // Parse JSON with error handling
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
      console.log("[loadWatchHistory] Parsed watch history:", parsed);
    } catch (parseError) {
      console.error(
        "[loadWatchHistory] Failed to parse watch history JSON:",
        parseError
      );
      // Clear corrupted data
      console.log("[loadWatchHistory] Clearing corrupted watch history");
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }

    // Validate data structure
    const validatedHistory = validateWatchHistory(parsed);
    console.log(
      "[loadWatchHistory] Validated watch history:",
      validatedHistory
    );
    // Convert lastWatched strings back to Date objects for valid entries
    Object.keys(validatedHistory).forEach((key) => {
      const progress = validatedHistory[key];
      console.log("[loadWatchHistory] Progress:", progress);
      if (progress.lastWatched) {
        try {
          console.log(
            "[loadWatchHistory] Progress lastWatched:",
            progress.lastWatched
          );
          // Handle both string and existing Date objects
          if (typeof progress.lastWatched === "string") {
            progress.lastWatched = new Date(progress.lastWatched);
          }

          // Validate the date is valid
          if (isNaN(progress.lastWatched.getTime())) {
            console.log(
              "[loadWatchHistory] Progress lastWatched is invalid, using current date"
            );
            progress.lastWatched = new Date();
          }
        } catch (dateError) {
          console.warn(
            `[loadWatchHistory] Invalid date for progress ${key}, using current date:`,
            dateError
          );
          progress.lastWatched = new Date();
        }
      } else {
        progress.lastWatched = new Date();
      }
    });

    console.log(
      "[loadWatchHistory] Returning validated watch history:",
      validatedHistory
    );
    return validatedHistory;
  } catch (error) {
    console.error("Failed to load watch history:", error);
    // Clear potentially corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (removeError) {
      console.error("Failed to clear corrupted watch history:", removeError);
    }
    return {};
  }
};

// Helper function to save watch history to localStorage
const saveWatchHistory = (history: WatchHistory): boolean => {
  if (!isBrowser) return false;

  try {
    const serialized = JSON.stringify(history);
    console.log("[saveWatchHistory] Saving watch history:", serialized);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    // Handle specific localStorage errors
    if (error instanceof Error) {
      if (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      ) {
        console.warn(
          "[saveWatchHistory] localStorage quota exceeded, attempting cleanup..."
        );
        console.log("[saveWatchHistory] History:", history);
        // Try to free up space by removing oldest entries
        const sortedEntries = Object.entries(history).sort(
          ([, a], [, b]) => a.lastWatched.getTime() - b.lastWatched.getTime()
        );
        console.log("[saveWatchHistory] Sorted entries:", sortedEntries);
        // Keep only the most recent 50 entries
        const recentEntries = sortedEntries.slice(-50);
        console.log("[saveWatchHistory] Recent entries:", recentEntries);
        const cleanedHistory: WatchHistory = {};

        recentEntries.forEach(([key, value]) => {
          cleanedHistory[key] = value;
        });
        console.log("[saveWatchHistory] Cleaned history:", cleanedHistory);
        try {
          const cleanedSerialized = JSON.stringify(cleanedHistory);
          console.log(
            "[saveWatchHistory] Cleaned serialized:",
            cleanedSerialized
          );
          localStorage.setItem(STORAGE_KEY, cleanedSerialized);
          console.log(
            `Cleaned up watch history, kept ${recentEntries.length} most recent entries`
          );
          console.log("[saveWatchHistory] Cleanup successful");
          return true;
        } catch (cleanupError) {
          console.error(
            "[saveWatchHistory] Failed to save even after cleanup:",
            cleanupError
          );
          return false;
        }
      } else {
        console.error(
          "[saveWatchHistory] Failed to save watch history:",
          error.message
        );
      }
    } else {
      console.error(
        "[saveWatchHistory] Unknown error saving watch history:",
        error
      );
    }
    return false;
  }
};

export const useWatchProgress = (animeId: number, episodeNumber: number) => {
  // Initialize with empty state to prevent hydration mismatch
  const [watchHistory, setWatchHistory] = useState<WatchHistory>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Use ref to track the latest watchHistory for saving to avoid race conditions
  const watchHistoryRef = useRef<WatchHistory>(watchHistory);
  watchHistoryRef.current = watchHistory;

  // Debounced save to localStorage to prevent race conditions
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((history: WatchHistory) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const success = saveWatchHistory(history);
      if (!success) {
        console.warn(
          "[useWatchProgress] Failed to save watch progress to localStorage"
        );
        // Could emit an event here for UI notification if needed
      }
    }, 100); // 100ms debounce
  }, []);

  // Load watch history only on client after mount to prevent hydration mismatch
  useEffect(() => {
    if (isBrowser && !isLoaded) {
      const loadedHistory = loadWatchHistory();
      setWatchHistory(loadedHistory);
      setIsLoaded(true);
    }
  }, [isLoaded]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const progressKey = createProgressKey(animeId, episodeNumber);
  const currentProgress = watchHistory[progressKey];

  // Update progress for current episode
  const updateProgress = useCallback(
    (progress: number, currentTime: number, duration: number) => {
      console.log(
        "[updateProgress] update params:",
        progress,
        currentTime,
        duration
      );
      const completed = progress >= 90; // Consider 90%+ as completed
      const minWatchTime = 30; // Only save progress after watching for 30 seconds

      // Don't save very early progress or very short videos
      if (currentTime < minWatchTime || duration < 60) {
        console.log(
          "[updateProgress] Not saving progress because currentTime < minWatchTime or duration < 60"
        );
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
      console.log("[updateProgress] New progress:", newProgress);
      setWatchHistory((prev) => {
        const updated = {
          ...prev,
          [progressKey]: newProgress,
        };
        // Use debounced save to prevent race conditions
        debouncedSave(updated);
        return updated;
      });
    },
    [animeId, episodeNumber, progressKey, debouncedSave]
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
      // Use debounced save to prevent race conditions
      debouncedSave(updated);
      return updated;
    });
  }, [progressKey, debouncedSave]);

  // Remove progress for specific episode
  const clearProgress = useCallback(() => {
    console.log("[clearProgress] Clearing progress for episode:", progressKey);
    setWatchHistory((prev) => {
      const updated = { ...prev };
      delete updated[progressKey];
      // Use debounced save to prevent race conditions
      debouncedSave(updated);
      return updated;
    });
  }, [progressKey, debouncedSave]);

  // Get progress for any episode of the anime
  const getEpisodeProgress = useCallback(
    (episodeNum: number): WatchProgress | undefined => {
      const key = createProgressKey(animeId, episodeNum);
      console.log("[getEpisodeProgress] Getting progress for episode:", key);
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
      console.log(
        "[getResumeTime] No current progress or episode is completed"
      );
      return 0;
    }

    // Don't resume if very close to beginning or end
    if (currentProgress.currentTime < 30 || currentProgress.progress > 95) {
      console.log(
        "[useWatchProgress] Not resuming because currentTime < 30 or progress > 95"
      );
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

    // Loading state
    isLoaded,

    // Raw data
    watchHistory,
  };
};
