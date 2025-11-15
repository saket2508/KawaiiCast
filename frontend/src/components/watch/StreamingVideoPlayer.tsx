"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
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
    progress: number,
    currentTime: number,
    duration: number
  ) => void;
  initialProgress?: number; // Resume time in seconds
  className?: string;
  animeBackdrop?: string; // Optional anime backdrop for loading state
  animeTitle?: string; // Optional anime title for loading state
}

export const StreamingVideoPlayer: React.FC<StreamingVideoPlayerProps> = ({
  torrent,
  episodeNumber,
  hasNextEpisode,
  onPlayNextEpisode,
  onProgressUpdate,
  initialProgress = 0,
  className = "",
  animeBackdrop,
  animeTitle,
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
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

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

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setVolume(video.volume);
    setVideoLoaded(true);
    // Seek to initial progress if provided
    if (initialProgress > 0 && initialProgress < video.duration) {
      video.currentTime = initialProgress;
    }
  }, [initialProgress]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const total = video.duration;
    setCurrentTime(current);
    setDuration(total); // keep duration in sync

    if (onProgressUpdate && total > 0) {
      const progressPercent = (current / total) * 100;
      onProgressUpdate(progressPercent, current, total);
    }

    if (hasNextEpisode && total > 0 && total - current <= 30) {
      setShowNextEpisodePrompt(true);
    }
  }, [hasNextEpisode, onProgressUpdate]);

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (hasNextEpisode && onPlayNextEpisode) {
      setShowNextEpisodePrompt(true);
    }
  }, [hasNextEpisode, onPlayNextEpisode]);

  // Video buffering event handlers
  const handleWaiting = useCallback(() => {
    setIsVideoBuffering(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsVideoBuffering(false);
    // Delayed hide of loading overlay for smooth transition
    setTimeout(() => setShowLoadingOverlay(false), 300);
  }, []);

  const handleSeeking = useCallback(() => {
    setIsVideoBuffering(true);
  }, []);

  const handleSeeked = useCallback(() => {
    setIsVideoBuffering(false);
  }, []);

  // Update video source when stream URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (torrentStream.streamUrl && torrentStream.isReady) {
      video.src = torrentStream.streamUrl;
      video.load();
      setVideoLoaded(false); // Reset video loaded state
    }
  }, [torrentStream.streamUrl, torrentStream.isReady]);

  // Manage loading overlay visibility
  useEffect(() => {
    const shouldShowOverlay =
      torrentStream.isLoading ||
      torrentStream.isBuffering ||
      isVideoBuffering ||
      !videoLoaded;

    if (shouldShowOverlay) {
      setShowLoadingOverlay(true);
    }
  }, [
    torrentStream.isLoading,
    torrentStream.isBuffering,
    isVideoBuffering,
    videoLoaded,
  ]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (torrentStream?.stopStream) {
        console.log("stopping stream");
        void torrentStream.stopStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torrentStream.stopStream]);

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

  // Render loading state with backdrop (for initial load only)
  if (torrentStream.isLoading || torrentStream.isBuffering) {
    return (
      <div
        className={`relative aspect-video bg-gray-900 overflow-hidden ${className}`}
      >
        {/* Anime Backdrop */}
        {animeBackdrop && (
          <div className="absolute inset-0">
            <Image
              src={animeBackdrop}
              alt={animeTitle || "Anime backdrop"}
              fill
              className="object-cover"
              priority
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
          </div>
        )}

        {/* Loading content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center z-10 max-w-md mx-auto px-6">
            {/* Animated loading spinner */}
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500/30 border-t-orange-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-orange-400 animate-spin [animation-duration:0.8s] [animation-direction:reverse] mx-auto"></div>
            </div>

            {/* Loading text with smooth transitions */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">
                {torrentStream.isLoading
                  ? "Loading torrent..."
                  : isVideoBuffering
                  ? "Buffering video..."
                  : "Preparing stream..."}
              </h3>

              {animeTitle && (
                <p className="text-orange-200 text-sm font-medium">
                  {animeTitle} • Episode {episodeNumber}
                </p>
              )}

              {torrentStream.fileName && (
                <p className="text-gray-300 text-sm truncate">
                  {torrentStream.fileName}
                </p>
              )}

              {torrentStream.progress > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">
                    Download progress: {torrentStream.progress}%
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${torrentStream.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subtle pulsing animation for "breathing" effect */}
            <div className="absolute inset-0 bg-white/5 rounded-xl animate-pulse [animation-duration:3s]" />
          </div>
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
      {/* Loading overlay with smooth transitions */}
      {showLoadingOverlay && (
        <div
          className={`absolute inset-0 z-30 transition-opacity duration-500 ${
            torrentStream.isLoading ||
            torrentStream.isBuffering ||
            isVideoBuffering
              ? "opacity-100"
              : "opacity-0"
          }`}
          style={{
            background: animeBackdrop
              ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)"
              : "rgb(17, 24, 39)",
          }}
        >
          {/* Anime Backdrop for overlay */}
          {animeBackdrop && (
            <div className="absolute inset-0">
              <Image
                src={animeBackdrop}
                alt={animeTitle || "Anime backdrop"}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
            </div>
          )}

          {/* Loading content with fade-in animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center z-10 max-w-md mx-auto px-6 animate-fade-in">
              {/* Animated loading spinner */}
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500/30 border-t-orange-500 mx-auto"></div>
                <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-orange-400 animate-spin [animation-duration:0.8s] [animation-direction:reverse] mx-auto"></div>
              </div>

              {/* Status text */}
              <p className="text-white text-sm font-medium">
                {torrentStream.isLoading
                  ? "Loading torrent..."
                  : isVideoBuffering
                  ? "Buffering..."
                  : "Preparing stream..."}
              </p>
            </div>
          </div>
        </div>
      )}
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

      {/* Video element with fade-in transition */}
      <video
        ref={videoRef}
        className={`w-full h-full transition-opacity duration-500 ${
          videoLoaded && !isVideoBuffering ? "opacity-100" : "opacity-0"
        }`}
        controls={false}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={handleVolumeChange}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
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
              {formatTime(isNaN(currentTime) ? 0 : currentTime)} /{" "}
              {formatTime(isNaN(duration) ? 0 : duration)}
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
