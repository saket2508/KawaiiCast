"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  RotateCcw,
  Maximize,
  Minimize,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAutoTorrentStream } from "@/hooks/useAutoTorrentStream";
import { FileSelector } from "@/components/FileSelector";
import { EpisodeTorrent } from "@/types/api";

export interface StreamingVideoPlayerProps {
  torrent: EpisodeTorrent | null;
  episodeNumber: number;
  hasNextEpisode: boolean;
  onPlayNextEpisode?: () => void;
  onProgressUpdate?: (
    currentTime: number,
    duration: number,
    progress: number
  ) => void;
  initialProgress?: number; // Resume time in seconds
  className?: string;
}

export const StreamingVideoPlayer: React.FC<StreamingVideoPlayerProps> = ({
  torrent,
  episodeNumber,
  hasNextEpisode,
  onPlayNextEpisode,
  onProgressUpdate,
  initialProgress = 0,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);

  // Auto torrent streaming hook
  const torrentStream = useAutoTorrentStream(torrent);

  // Control visibility timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Prevent default behavior for video controls
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement)?.contentEditable === "true";

      if (isInputFocused) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlayPause();
          showControlsTemporarily();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          showControlsTemporarily();
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          showControlsTemporarily();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          showControlsTemporarily();
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          showControlsTemporarily();
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyN":
          if (hasNextEpisode && onPlayNextEpisode) {
            e.preventDefault();
            onPlayNextEpisode();
          }
          break;
        case "Digit0":
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
          e.preventDefault();
          const digit = parseInt(e.code.slice(-1));
          video.currentTime = (digit / 10) * video.duration;
          showControlsTemporarily();
          break;
      }
    };

    // Add keyboard listener when component is focused
    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      // Make container focusable
      container.tabIndex = 0;
    }

    // Also add global listener for convenience
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener("keydown", handleKeyDown);
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextEpisode, onPlayNextEpisode]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVolume(video.volume);
      // Seek to initial progress if provided
      if (initialProgress > 0 && initialProgress < video.duration) {
        video.currentTime = initialProgress;
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
      setCurrentTime(current);

      // Call progress update callback
      if (onProgressUpdate && total > 0) {
        const progressPercent = (current / total) * 100;
        onProgressUpdate(current, total, progressPercent);
      }

      // Show next episode prompt near the end
      if (hasNextEpisode && total > 0 && total - current <= 30) {
        setShowNextEpisodePrompt(true);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (hasNextEpisode && onPlayNextEpisode) {
        setShowNextEpisodePrompt(true);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [hasNextEpisode, onPlayNextEpisode, onProgressUpdate, initialProgress]);

  // Update video source when stream URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (torrentStream.streamUrl && torrentStream.isReady) {
      video.src = torrentStream.streamUrl;
      video.load();
    } else {
      video.removeAttribute("src");
      video.load();
    }
  }, [torrentStream.streamUrl, torrentStream.isReady]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      void torrentStream.stopStream();
    };
  }, [torrentStream]);

  // Controls visibility management
  const showControlsTemporarily = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 5000); // Increased timeout to 5 seconds
  };

  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only toggle if clicking on the container, not on controls
    if (e.target === e.currentTarget || e.target === videoRef.current) {
      togglePlayPause();
    }
  };

  // Playback controls
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying((prev) => {
      if (!prev) {
        video.play();
      } else {
        video.pause();
      }
      return !prev;
    });
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const changeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVolume;
    setVolume(newVolume);

    // Unmute if volume is changed from 0
    if (newVolume > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen toggle failed:", error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const newTime = clickPercent * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Render loading state
  if (torrentStream.isLoading || torrentStream.isBuffering) {
    return (
      <div
        className={`aspect-video bg-gray-900 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-white text-lg mb-2">
            {torrentStream.isLoading ? "Loading torrent..." : "Buffering..."}
          </p>
          {torrentStream.fileName && (
            <p className="text-gray-400 text-sm">{torrentStream.fileName}</p>
          )}
          {torrentStream.progress > 0 && (
            <p className="text-gray-400 text-sm">
              Download: {torrentStream.progress}%
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render error state
  if (torrentStream.hasError) {
    return (
      <div
        className={`aspect-video bg-gray-900 flex items-center justify-center ${className}`}
      >
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Streaming Error
          </h3>
          <p className="text-gray-400 mb-6">{torrentStream.error}</p>
          <Button variant="primary" onClick={torrentStream.retry}>
            <RotateCcw size={16} className="mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Render video player
  return (
    <div
      ref={containerRef}
      className={`relative aspect-video bg-black group focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleContainerClick}
      onFocus={showControlsTemporarily}
    >
      {/* File Selector Overlay */}
      {showFileSelector && torrentStream.files.length > 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="max-w-lg w-full p-4">
            <FileSelector
              files={torrentStream.files}
              selectedIndex={torrentStream.selectedFileIndex ?? -1}
              onFileSelect={(index) => torrentStream.selectFile(index)}
              onStartStream={() => setShowFileSelector(false)}
              isStreaming={isPlaying}
            />
            <div className="flex justify-center mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowFileSelector(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls={false}
        preload="metadata"
      />

      {/* Next Episode Prompt */}
      {showNextEpisodePrompt && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h3 className="text-white text-lg mb-4">
              Episode {episodeNumber} Ended
            </h3>
            <div className="flex space-x-4">
              <Button
                variant="secondary"
                onClick={() => setShowNextEpisodePrompt(false)}
              >
                Keep Watching
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowNextEpisodePrompt(false);
                  onPlayNextEpisode?.();
                }}
              >
                <SkipForward size={16} className="mr-2" />
                Next Episode
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div
          className="w-full h-2 bg-gray-600 rounded cursor-pointer mb-4 pointer-events-auto hover:h-3 transition-all duration-200"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-orange-500 rounded relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="text-white hover:text-orange-500 hover:bg-gray-800"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:text-orange-500 hover:bg-gray-800"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>

            {/* Volume slider */}
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  changeVolume(newVolume - volume);
                }}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Show File Selector button */}
            {torrentStream.files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileSelector(true)}
                className="text-white hover:text-orange-500 hover:bg-gray-800"
              >
                <List size={20} />
              </Button>
            )}
            {hasNextEpisode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPlayNextEpisode}
                className="text-white hover:text-orange-500 hover:bg-gray-800"
              >
                <SkipForward size={16} className="mr-1" />
                Next
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:text-orange-500 hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom styles for volume slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};
