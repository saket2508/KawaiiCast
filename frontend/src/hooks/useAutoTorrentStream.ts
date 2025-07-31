import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { EpisodeTorrent } from "@/types/api";
import { TorrentFile } from "@/types/torrent-stream";
import { useTorrentInfoQuery } from "./useAnimeQueries";

interface AutoTorrentStreamState {
  streamUrl: string | null;
  selectedFile: TorrentFile | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface UseAutoTorrentStreamOptions {
  fallbackTorrents?: EpisodeTorrent[];
  enableFallback?: boolean;
}

interface UseAutoTorrentStreamReturn {
  // Data from TanStack Query
  torrentInfo: unknown | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  progress: number;

  // Local state
  streamUrl: string | null;
  selectedFile: TorrentFile | null;

  // Enhanced error information
  errorType: string | null;
  errorRetryable: boolean;
  errorSuggestion: string | null;
  serverAttempts: number | null;

  // Fallback information
  currentTorrentIndex: number;
  totalTorrents: number;
  hasMoreTorrents: boolean;
  currentTorrent: EpisodeTorrent | null;

  // Actions
  stopStream: () => Promise<void>;
  retry: () => void;
  retryWithNextTorrent: () => void;
  selectFile: (index: number) => void;

  // Computed properties
  files: TorrentFile[];
  selectedFileIndex: number | null;
  hasError: boolean;
  canRetry: boolean;
  isBuffering?: boolean;
  fileName: string | undefined;
  fileSize: number | undefined;
  statusMessage: string | null;
}

export function useAutoTorrentStream(
  torrent: EpisodeTorrent | null,
  options?: UseAutoTorrentStreamOptions
): UseAutoTorrentStreamReturn {
  const { fallbackTorrents = [], enableFallback = false } = options || {};

  const [currentTorrentIndex, setCurrentTorrentIndex] = useState(0);
  const [state, setState] = useState<AutoTorrentStreamState>({
    streamUrl: null,
    selectedFile: null,
  });

  const currentStreamRef = useRef<{
    torrentId: string;
    fileIndex: number;
  } | null>(null);

  // Create available torrents array with fallbacks
  const availableTorrents = useMemo(() => {
    const torrents: EpisodeTorrent[] = [];
    if (torrent) torrents.push(torrent);
    if (enableFallback && fallbackTorrents.length > 0) {
      torrents.push(...fallbackTorrents);
    }
    return torrents;
  }, [torrent, fallbackTorrents, enableFallback]);

  // Reset index when available torrents change
  useEffect(() => {
    setCurrentTorrentIndex(0);
  }, [availableTorrents]);

  // Get current torrent
  const currentTorrent = availableTorrents[currentTorrentIndex] || null;

  // Use TanStack Query for torrent info fetching with smart retry logic
  const torrentInfoQuery = useTorrentInfoQuery(currentTorrent?.magnet || null, {
    enabled: Boolean(currentTorrent?.magnet),
  });

  // Handle torrent failures with automatic fallback
  useEffect(() => {
    if (
      torrentInfoQuery.error &&
      !torrentInfoQuery.isLoading &&
      enableFallback
    ) {
      const error = torrentInfoQuery.error as { type?: string; retryable?: boolean };

      // Check if we should try fallback torrents
      const shouldFallback =
        (error?.type === "PERMANENT" || error?.retryable === false) &&
        currentTorrentIndex < availableTorrents.length - 1;

      if (shouldFallback) {
        console.log(
          `🔄 Torrent ${currentTorrentIndex + 1} failed permanently, trying fallback ${currentTorrentIndex + 2}/${availableTorrents.length}`
        );
        setCurrentTorrentIndex((prev) => prev + 1);

        // Clear previous state while switching
        setState({
          streamUrl: null,
          selectedFile: null,
        });
        currentStreamRef.current = null;
      }
    }
  }, [
    torrentInfoQuery.error,
    torrentInfoQuery.isLoading,
    currentTorrentIndex,
    availableTorrents.length,
    enableFallback,
  ]);

  // Process torrent info when query succeeds
  useEffect(() => {
    console.log("📥 Processing torrent data:", {
      hasData: !!torrentInfoQuery.data,
      isLoading: torrentInfoQuery.isLoading,
      hasTorrent: !!currentTorrent,
    });

    if (torrentInfoQuery.data && currentTorrent) {
      const torrentInfo = torrentInfoQuery.data;

      // Find the best playable file (backend sorts them by preference)
      const playableFiles = torrentInfo.files.filter((file) => file.isPlayable);
      const selectedFile = playableFiles.length > 0 ? playableFiles[0] : null;

      if (selectedFile) {
        // Generate stream URL
        const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
          torrentInfo.torrentId
        )}&file_index=${selectedFile.index}`;

        // Prevent unnecessary state updates
        const newState = {
          selectedFile,
          streamUrl,
        };

        setState((prevState) => {
          if (
            prevState.streamUrl === newState.streamUrl &&
            prevState.selectedFile?.index === newState.selectedFile?.index
          ) {
            console.log("⏭ Skipping duplicate state update");
            return prevState; // No change needed
          }
          console.log("✅ Setting stream state:", selectedFile.name);
          return newState;
        });

        // Track current stream for cleanup
        currentStreamRef.current = {
          torrentId: torrentInfo.torrentId,
          fileIndex: selectedFile.index,
        };
      } else {
        console.log("❌ No playable files found");
        setState((prevState) => {
          if (!prevState.streamUrl && !prevState.selectedFile) {
            return prevState; // Already cleared
          }
          return {
            selectedFile: null,
            streamUrl: null,
          };
        });
        currentStreamRef.current = null;
      }
    } else if (
      !torrentInfoQuery.data &&
      !torrentInfoQuery.isLoading &&
      currentTorrent
    ) {
      // Clear state when no data and not loading (but we have a torrent)
      console.log("🧹 Clearing state - no data");
      setState((prevState) => {
        if (!prevState.streamUrl && !prevState.selectedFile) {
          return prevState; // Already cleared
        }
        return {
          selectedFile: null,
          streamUrl: null,
        };
      });
      currentStreamRef.current = null;
    }
  }, [
    torrentInfoQuery.data,
    torrentInfoQuery.isLoading,
    currentTorrent,
    currentTorrentIndex,
  ]);

  // Note: State clearing is now handled in the main processing effect above

  // // Dedicated cleanup effect for component unmount
  // useEffect(() => {
  //   return () => {
  //     // Component is unmounting, perform comprehensive cleanup
  //     console.log(
  //       "useAutoTorrentStream: Component unmounting, cleaning up resources"
  //     );

  //     // Stop any active streams
  //     if (currentStreamRef.current) {
  //       const { torrentId, fileIndex } = currentStreamRef.current;
  //       // Call backend to stop stream (async, but fire-and-forget on unmount)
  //       fetch(
  //         `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
  //           torrentId
  //         )}&file_index=${fileIndex}`,
  //         { method: "DELETE" }
  //       ).catch((error) => {
  //         console.warn("Failed to cleanup stream on unmount:", error);
  //       });
  //     }

  //     // Clear refs
  //     currentStreamRef.current = null;
  //   };
  // }, []); // Empty dependency - only runs on mount/unmount

  // Stop streaming when component unmounts or torrent changes
  const stopStream = useCallback(async () => {
    if (currentStreamRef.current) {
      const { torrentId, fileIndex } = currentStreamRef.current;
      try {
        console.log("stopping stream with file index:", fileIndex);
        await fetch(
          `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
            torrentId
          )}&file_index=${fileIndex}`,
          { method: "DELETE" }
        );
        console.log("Stream stopped successfully");
      } catch (error) {
        console.error("Error stopping stream:", error);
      } finally {
        // Clear stream reference after stopping (success or failure)
        currentStreamRef.current = null;
      }
    }
  }, []); // No dependencies needed - uses refs

  // Enhanced retry function with fallback support
  const retry = useCallback(() => {
    torrentInfoQuery.refetch();
  }, [torrentInfoQuery]);

  const retryWithNextTorrent = useCallback(() => {
    if (currentTorrentIndex < availableTorrents.length - 1) {
      console.log(
        `🔄 Manually switching to next torrent ${currentTorrentIndex + 2}/${availableTorrents.length}`
      );
      setCurrentTorrentIndex((prev) => prev + 1);
    }
  }, [currentTorrentIndex, availableTorrents.length]);

  const selectFile = useCallback(
    (index: number) => {
      if (!torrentInfoQuery.data) return;

      const file = torrentInfoQuery.data.files.find((f) => f.index === index);
      if (!file) return;

      const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
        torrentInfoQuery.data.torrentId
      )}&file_index=${index}`;

      // Update current stream tracking
      currentStreamRef.current = {
        torrentId: torrentInfoQuery.data.torrentId,
        fileIndex: index,
      };

      setState({
        selectedFile: file,
        streamUrl,
      });
    },
    [torrentInfoQuery.data]
  );

  const error = torrentInfoQuery.error as
    | (Error & {
        status?: number;
        type?: string;
        retryable?: boolean;
        suggestion?: string;
        attempts?: number;
      })
    | null;

  // Calculate canRetry based on error retryability and fallback availability
  const canRetry =
    (error?.retryable ?? true) !== false ||
    currentTorrentIndex < availableTorrents.length - 1;

  return {
    // Data from TanStack Query
    torrentInfo: torrentInfoQuery.data || null,
    isLoading: torrentInfoQuery.isLoading,
    error: error?.message || null,
    isReady: torrentInfoQuery.data?.ready || false,
    progress: torrentInfoQuery.data?.progress || 0,

    // Local state
    ...state,

    // Enhanced error information
    errorType: error?.type || null,
    errorRetryable: error?.retryable !== false,
    errorSuggestion: error?.suggestion || null,
    serverAttempts: error?.attempts || null,

    // Fallback information
    currentTorrentIndex,
    totalTorrents: availableTorrents.length,
    hasMoreTorrents: currentTorrentIndex < availableTorrents.length - 1,
    currentTorrent,

    // Actions
    stopStream,
    retry,
    retryWithNextTorrent,
    selectFile,

    // Computed properties for convenience
    files: torrentInfoQuery.data?.files || [],
    selectedFileIndex: state.selectedFile?.index ?? null,
    hasError: Boolean(torrentInfoQuery.error),
    canRetry: !!canRetry,
    isBuffering:
      torrentInfoQuery.isLoading ||
      (torrentInfoQuery.data && !torrentInfoQuery.data.ready),
    fileName: state.selectedFile?.name,
    fileSize: state.selectedFile?.size,

    // Status messages for UI
    statusMessage: (() => {
      if (torrentInfoQuery.isLoading) {
        return availableTorrents.length > 1 && currentTorrentIndex > 0
          ? `Loading fallback torrent ${currentTorrentIndex + 1}/${availableTorrents.length}...`
          : "Loading torrent...";
      }
      if (error) {
        return error.suggestion || error.message || "An error occurred";
      }
      if (torrentInfoQuery.data && !torrentInfoQuery.data.ready) {
        return `Torrent loading... ${Math.round(
          torrentInfoQuery.data.progress
        )}%`;
      }
      return null;
    })(),
  };
}
