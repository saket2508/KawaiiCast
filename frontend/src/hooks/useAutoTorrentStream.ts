import { useState, useEffect, useRef } from "react";
import { EpisodeTorrent } from "@/types/api";

interface TorrentInfo {
  name: string;
  infoHash: string;
  magnetURI: string;
  torrentId: string;
  files: TorrentFile[];
  totalSize: number;
  progress: number;
  downloadSpeed: string;
  uploadSpeed: string;
  numPeers: number;
  ready: boolean;
}

// Matches backend utils/helpers.prepareFileInfo output
interface TorrentFile {
  index: number;
  name: string;
  size: number;
  path: string;
  isVideo: boolean;
  isAudio: boolean;
  isPlayable: boolean;
}

interface AutoTorrentStreamState {
  torrentInfo: TorrentInfo | null;
  streamUrl: string | null;
  selectedFile: TorrentFile | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  progress: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const useAutoTorrentStream = (torrent: EpisodeTorrent | null) => {
  const [state, setState] = useState<AutoTorrentStreamState>({
    torrentInfo: null,
    streamUrl: null,
    selectedFile: null,
    isLoading: false,
    error: null,
    isReady: false,
    progress: 0,
  });

  const currentTorrentIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load torrent info when torrent changes
  useEffect(() => {
    if (!torrent?.magnet) {
      // Clear state when no torrent
      setState({
        torrentInfo: null,
        streamUrl: null,
        selectedFile: null,
        isLoading: false,
        error: null,
        isReady: false,
        progress: 0,
      });
      currentTorrentIdRef.current = null;
      return;
    }

    loadTorrentInfo(torrent.magnet);

    // Cleanup on unmount or torrent change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [torrent?.magnet]);

  const loadTorrentInfo = async (magnetUri: string) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      isReady: false,
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/torrent/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          magnet: magnetUri,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get torrent info");
      }

      const torrentInfo: TorrentInfo = await response.json();
      currentTorrentIdRef.current = torrentInfo.torrentId;

      // Find the best playable file (backend sorts them by preference)
      const playableFiles = torrentInfo.files.filter((file) => file.isPlayable);
      const selectedFile = playableFiles.length > 0 ? playableFiles[0] : null;

      if (!selectedFile) {
        throw new Error("No playable video files found in this torrent");
      }

      // Generate stream URL
      const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
        currentTorrentIdRef.current!
      )}&file_index=${selectedFile.index}`;

      setState((prev) => ({
        ...prev,
        torrentInfo,
        selectedFile,
        streamUrl,
        isLoading: false,
        isReady: torrentInfo.ready,
        progress: torrentInfo.progress,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled, don't update state
      }

      console.error("Error loading torrent info:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        isLoading: false,
        isReady: false,
      }));
    }
  };

  // Stop streaming when component unmounts or torrent changes
  const stopStream = async () => {
    if (currentTorrentIdRef.current && state.selectedFile) {
      try {
        await fetch(
          `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
            currentTorrentIdRef.current
          )}&file_index=${state.selectedFile.index}`,
          { method: "DELETE" }
        );
      } catch (error) {
        console.error("Error stopping stream:", error);
      }
    }
  };

  // Retry loading if there was an error
  const retry = () => {
    if (torrent?.magnet) {
      loadTorrentInfo(torrent.magnet);
    }
  };

  const selectFile = (index: number) => {
    if (!currentTorrentIdRef.current) return;

    setState((prev) => {
      if (!prev.torrentInfo) return prev;

      const file = prev.torrentInfo.files.find((f) => f.index === index);
      if (!file) return prev;

      const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
        currentTorrentIdRef.current!
      )}&file_index=${index}`;

      return {
        ...prev,
        selectedFile: file,
        streamUrl,
        // isReady remains unchanged; we assume torrent readiness applies to all files once torrent is ready
      };
    });
  };

  return {
    ...state,
    stopStream,
    retry,
    // New helpers for UI interactions
    files: state.torrentInfo?.files || [],
    selectedFileIndex: state.selectedFile?.index ?? null,
    selectFile,
    // Computed properties for convenience
    hasError: Boolean(state.error),
    isBuffering: state.isLoading || (state.torrentInfo && !state.isReady),
    fileName: state.selectedFile?.name,
    fileSize: state.selectedFile?.size,
  };
};
