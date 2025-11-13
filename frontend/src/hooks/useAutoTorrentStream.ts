import { useState, useEffect, useRef, useCallback } from "react";
import { EpisodeTorrent } from "@/types/api";
import { TorrentFile } from "@/types/torrent-stream";
import { useTorrentInfoQuery } from "./useAnimeQueries";

interface AutoTorrentStreamState {
  streamUrl: string | null;
  selectedFile: TorrentFile | null;
}

const BACKEND_URL =
  process.env.NEXT_TORRENT_CLIENT_API_URL || "http://localhost:8080";

export const useAutoTorrentStream = (torrent: EpisodeTorrent | null) => {
  const [state, setState] = useState<AutoTorrentStreamState>({
    streamUrl: null,
    selectedFile: null,
  });

  const currentStreamRef = useRef<{
    torrentId: string;
    fileIndex: number;
  } | null>(null);

  // Use TanStack Query for torrent info fetching with smart retry logic
  const torrentInfoQuery = useTorrentInfoQuery(torrent?.magnet || null, {
    enabled: Boolean(torrent?.magnet),
  });

  // Process torrent info when query succeeds
  useEffect(() => {
    if (torrentInfoQuery.data && torrent) {
      const torrentInfo = torrentInfoQuery.data;

      // Find the best playable file (backend sorts them by preference)
      const playableFiles = torrentInfo.files.filter((file) => file.isPlayable);
      const selectedFile = playableFiles.length > 0 ? playableFiles[0] : null;

      if (selectedFile) {
        // Generate stream URL
        const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
          torrentInfo.torrentId
        )}&file_index=${selectedFile.index}`;

        // Track current stream for cleanup
        currentStreamRef.current = {
          torrentId: torrentInfo.torrentId,
          fileIndex: selectedFile.index,
        };

        setState({
          selectedFile,
          streamUrl,
        });
      } else {
        // Clear state if no playable files
        setState({
          selectedFile: null,
          streamUrl: null,
        });
        currentStreamRef.current = null;
      }
    }
  }, [torrentInfoQuery.data, torrent]);

  // Clear state when no torrent
  useEffect(() => {
    if (!torrent?.magnet) {
      setState({
        streamUrl: null,
        selectedFile: null,
      });
      currentStreamRef.current = null;
    }
  }, [torrent?.magnet]);

  // Dedicated cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Component is unmounting, perform comprehensive cleanup
      console.log(
        "useAutoTorrentStream: Component unmounting, cleaning up resources"
      );

      // Stop any active streams
      if (currentStreamRef.current) {
        const { torrentId, fileIndex } = currentStreamRef.current;
        // Call backend to stop stream (async, but fire-and-forget on unmount)
        fetch(
          `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
            torrentId
          )}&file_index=${fileIndex}`,
          { method: "DELETE" }
        ).catch((error) => {
          console.warn("Failed to cleanup stream on unmount:", error);
        });
      }

      // Clear refs
      currentStreamRef.current = null;
    };
  }, []); // Empty dependency - only runs on mount/unmount

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

  // Retry loading if there was an error
  const retry = () => {
    torrentInfoQuery.refetch();
  };

  const selectFile = (index: number) => {
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
  };

  return {
    // Data from TanStack Query
    torrentInfo: torrentInfoQuery.data || null,
    isLoading: torrentInfoQuery.isLoading,
    error: torrentInfoQuery.error?.message || null,
    isReady: torrentInfoQuery.data?.ready || false,
    progress: torrentInfoQuery.data?.progress || 0,

    // Local state
    ...state,

    // Actions
    stopStream,
    retry,
    selectFile,

    // Computed properties for convenience
    files: torrentInfoQuery.data?.files || [],
    selectedFileIndex: state.selectedFile?.index ?? null,
    hasError: Boolean(torrentInfoQuery.error),
    isBuffering:
      torrentInfoQuery.isLoading ||
      (torrentInfoQuery.data && !torrentInfoQuery.data.ready),
    fileName: state.selectedFile?.name,
    fileSize: state.selectedFile?.size,
  };
};
