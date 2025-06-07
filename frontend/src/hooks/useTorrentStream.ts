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
  files: TorrentFile[];
  totalSize: number;
  progress: number;
  downloadSpeed: string;
  uploadSpeed: string;
  numPeers: number;
  ready: boolean;
}

const BACKEND_URL = "http://localhost:8080"; // Adjust as needed

export const useTorrentStream = () => {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentMagnetRef = useRef<string | null>(null);

  // File type checking is now handled by the backend

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTorrentInfo = async (magnet: string) => {
    setIsLoading(true);
    setMessage("Fetching torrent information...");

    try {
      const response = await fetch(
        `${BACKEND_URL}/torrent/info?magnet=${encodeURIComponent(magnet)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get torrent info");
      }

      const info: TorrentInfo = await response.json();
      setTorrentInfo(info);
      currentMagnetRef.current = magnet;

      // Find the best playable file (backend already sorted them)
      const playableFiles = info.files.filter((file) => file.isPlayable);
      const bestFile = playableFiles.length > 0 ? playableFiles[0] : null;

      if (bestFile) {
        setSelectedFileIndex(bestFile.index);
        setMessage(
          `Found playable file: ${bestFile.name} (${formatBytes(
            bestFile.size
          )})`
        );
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
    console.log("Starting streaming");
    console.log(currentMagnetRef.current);
    console.log(selectedFileIndex);
    console.log(fileIndex);

    if (!currentMagnetRef.current) {
      setMessage("No torrent loaded");
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
    console.log(`Starting stream for: ${file.name}`);

    // Construct streaming URL
    const streamUrl = `${BACKEND_URL}/stream?magnet=${encodeURIComponent(
      currentMagnetRef.current
    )}&file_index=${indexToUse}`;

    console.log(`Hitting Stream URL: ${streamUrl}`);

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
    if (!currentMagnetRef.current) return;

    try {
      await fetch(
        `${BACKEND_URL}/stream?magnet=${encodeURIComponent(
          currentMagnetRef.current
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
    // For now, only handle magnet URIs
    if (typeof magnetOrFile !== "string") {
      setMessage("File torrents not yet supported with backend streaming");
      return;
    }

    if (!magnetOrFile.startsWith("magnet:")) {
      setMessage("Please provide a valid magnet URI");
      return;
    }

    // Stop any existing stream
    if (videoSrc) {
      await stopStreaming();
    }

    await getTorrentInfo(magnetOrFile);
  };

  const removeTorrent = async () => {
    await stopStreaming();
    setTorrentInfo(null);
    setVideoSrc(null);
    setMessage("");
    currentMagnetRef.current = null;
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
