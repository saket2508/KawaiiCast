import { useState, useRef } from "react";

interface TorrentFile {
  index: number;
  name: string;
  size: number;
  path: string;
  isVideo: boolean;
  isAudio: boolean;
  isPlayable: boolean;
}

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
  uploadedFileName?: string;
}

const BACKEND_URL = "http://localhost:8080"; // Adjust as needed

export const useTorrentStream = () => {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTorrentIdRef = useRef<string | null>(null);

  // File type checking is now handled by the backend

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTorrentInfo = async (magnetOrFile: string | ArrayBuffer) => {
    setIsLoading(true);
    setMessage("Fetching torrent information...");

    try {
      let response: Response;

      if (typeof magnetOrFile === "string") {
        // Handle magnet URI - use POST for consistency
        response = await fetch(`${BACKEND_URL}/torrent/info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            magnet: magnetOrFile,
          }),
        });
      } else {
        // Handle .torrent file (ArrayBuffer)
        console.log("Processing torrent file...");
        setMessage("Processing torrent file...");
        const formData = new FormData();
        const blob = new Blob([magnetOrFile], {
          type: "application/x-bittorrent",
        });
        formData.append("torrent", blob, "torrent.torrent"); // Fixed field name

        response = await fetch(`${BACKEND_URL}/torrent/info`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get torrent info");
      }

      const info: TorrentInfo = await response.json();
      setTorrentInfo(info);

      // Store the torrent ID for all future operations
      currentTorrentIdRef.current = info.torrentId;

      // Find the best playable file (backend already sorted them)
      const playableFiles = info.files.filter((file) => file.isPlayable);
      const bestFile = playableFiles.length > 0 ? playableFiles[0] : null;

      if (bestFile) {
        setSelectedFileIndex(bestFile.index);
        const fileTypeMessage =
          typeof magnetOrFile === "string"
            ? `Found playable file: ${bestFile.name}`
            : `Found playable file in ${info.uploadedFileName}: ${bestFile.name}`;
        setMessage(`${fileTypeMessage} (${formatBytes(bestFile.size)})`);
      } else {
        setMessage(
          "❌ No playable video or audio files found in this torrent."
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching torrent info:", error);
      setMessage(`Error: ${(error as Error).message}`);
      setIsLoading(false);
      setTorrentInfo(null);
    }
  };

  const startStreaming = (fileIndex?: number) => {
    if (!currentTorrentIdRef.current) {
      setMessage("No valid torrent loaded");
      return;
    }

    const indexToUse = fileIndex !== undefined ? fileIndex : selectedFileIndex;

    if (!torrentInfo) {
      setMessage("No torrent info available");
      return;
    }

    const file = torrentInfo.files.find((file) => file.index === indexToUse);
    if (!file) {
      setMessage("Selected file not found");
      return;
    }

    setMessage(`Starting stream for: ${file.name}`);

    // Construct streaming URL using torrentId
    const streamUrl = `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
      currentTorrentIdRef.current
    )}&file_index=${indexToUse}`;

    setVideoSrc(streamUrl);
    setSelectedFileIndex(indexToUse);

    // Setup video element
    if (videoRef.current) {
      videoRef.current.onloadstart = () => {
        setMessage(`Loading: ${file.name}...`);
      };

      videoRef.current.oncanplay = () => {
        setMessage(`✅ Ready to play: ${file.name}`);
      };

      videoRef.current.onerror = () => {
        setMessage(
          "❌ Error loading video. Try a different file or check your connection."
        );
      };

      videoRef.current.onwaiting = () => {
        setMessage("Buffering...");
      };

      videoRef.current.onplaying = () => {
        setMessage(`▶️ Playing: ${file.name}`);
      };
    }
  };

  const stopStreaming = async () => {
    if (!currentTorrentIdRef.current) return;

    try {
      await fetch(
        `${BACKEND_URL}/stream?torrent_id=${encodeURIComponent(
          currentTorrentIdRef.current
        )}&file_index=${selectedFileIndex}`,
        { method: "DELETE" }
      );
    } catch (error) {
      console.error("Error stopping stream:", error);
    }

    setVideoSrc(null);
    setMessage("Stream stopped");

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  };

  const loadTorrent = async (magnetOrFile: string | ArrayBuffer) => {
    // Validate input
    if (typeof magnetOrFile === "string") {
      if (!magnetOrFile.startsWith("magnet:")) {
        setMessage("Please provide a valid magnet URI");
        return;
      }
    } else if (!(magnetOrFile instanceof ArrayBuffer)) {
      setMessage("Invalid file format. Please provide a .torrent file.");
      return;
    }

    // Stop any existing stream
    if (videoSrc) {
      await stopStreaming();
    }

    await getTorrentInfo(magnetOrFile);
  };

  const removeTorrent = async () => {
    if (currentTorrentIdRef.current) {
      try {
        // Remove torrent from backend using torrentId
        await fetch(
          `${BACKEND_URL}/torrent?torrent_id=${encodeURIComponent(
            currentTorrentIdRef.current
          )}`,
          { method: "DELETE" }
        );
      } catch (error) {
        console.error("Error removing torrent:", error);
      }
    }

    await stopStreaming();
    setTorrentInfo(null);
    setVideoSrc(null);
    setMessage("");
    currentTorrentIdRef.current = null;
    setSelectedFileIndex(0);
  };

  return {
    torrentInfo,
    videoSrc,
    isLoading,
    message,
    selectedFileIndex,
    videoRef,
    loadTorrent,
    startStreaming,
    stopStreaming,
    removeTorrent,
    setSelectedFileIndex,
  };
};
