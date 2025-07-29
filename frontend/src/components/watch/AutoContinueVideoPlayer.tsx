import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";

export interface AutoContinueVideoPlayerProps {
  magnetUri: string;
  animeTitle: string;
  episodeNumber: number;
  hasNextEpisode: boolean;
  onPlayNextEpisode: () => void;
  onProgressUpdate?: (
    progress: number,
    currentTime: number,
    duration: number
  ) => void;
  initialProgress?: number; // Resume from this time in seconds
}

interface ProgressOverlayProps {
  timeRemaining: number;
  onPlayNext: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

const NextEpisodeOverlay: React.FC<ProgressOverlayProps> = ({
  timeRemaining,
  onPlayNext,
  onCancel,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
      <div className="flex items-center justify-between max-w-md">
        <div className="text-white">
          <p className="text-sm text-gray-300 mb-1">Next episode in</p>
          <p className="text-2xl font-bold">{Math.ceil(timeRemaining)}s</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="bg-gray-800/80 hover:bg-gray-700/80"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onPlayNext}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Play Next
          </Button>
        </div>
      </div>
    </div>
  );
};

const SkipControls: React.FC<{
  onSkipIntro: () => void;
  onSkipOutro: () => void;
  showSkipIntro: boolean;
  showSkipOutro: boolean;
}> = ({ onSkipIntro, onSkipOutro, showSkipIntro, showSkipOutro }) => {
  if (!showSkipIntro && !showSkipOutro) return null;

  return (
    <div className="absolute top-4 right-4 flex space-x-2">
      {showSkipIntro && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSkipIntro}
          className="bg-black/60 hover:bg-black/80 text-white border border-gray-600"
        >
          Skip Intro
        </Button>
      )}
      {showSkipOutro && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSkipOutro}
          className="bg-black/60 hover:bg-black/80 text-white border border-gray-600"
        >
          Skip Outro
        </Button>
      )}
    </div>
  );
};

export const AutoContinueVideoPlayer: React.FC<
  AutoContinueVideoPlayerProps
> = ({
  magnetUri,
  animeTitle,
  episodeNumber,
  hasNextEpisode,
  onPlayNextEpisode,
  onProgressUpdate,
  initialProgress = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Skip controls state
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  // Construct stream URL
  const streamUrl = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  }/torrent/stream?magnet=${encodeURIComponent(magnetUri)}`;

  // Resume playback if initial progress is provided
  useEffect(() => {
    if (
      videoRef.current &&
      initialProgress > 0 &&
      duration > 0 &&
      !isResuming
    ) {
      setIsResuming(true);
      videoRef.current.currentTime = initialProgress;
    }
  }, [initialProgress, duration, isResuming]);

  // Skip controls logic
  useEffect(() => {
    if (duration === 0) return;

    // Show skip intro for first 2 minutes
    const introEndTime = Math.min(120, duration * 0.1); // 2 minutes or 10% of episode
    setShowSkipIntro(currentTime >= 10 && currentTime <= introEndTime);

    // Show skip outro in last 2 minutes
    const outroStartTime = Math.max(duration - 120, duration * 0.9); // Last 2 minutes or last 10%
    setShowSkipOutro(
      currentTime >= outroStartTime && currentTime < duration - 15
    );
  }, [currentTime, duration]);

  // Auto-continue logic
  useEffect(() => {
    if (!hasNextEpisode || autoPlayCancelled) return;

    const timeRemaining = duration - currentTime;
    const shouldShowOverlay = timeRemaining <= 30 && timeRemaining > 0;

    setShowNextEpisodeOverlay(shouldShowOverlay);

    // Auto-play when video ends
    if (timeRemaining <= 1 && currentTime > 0) {
      onPlayNextEpisode();
    }
  }, [
    currentTime,
    duration,
    hasNextEpisode,
    autoPlayCancelled,
    onPlayNextEpisode,
  ]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;

    const time = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;

    setCurrentTime(time);
    setDuration(dur);

    // Report progress
    if (onProgressUpdate && dur > 0) {
      const progress = (time / dur) * 100;
      onProgressUpdate(progress, time, dur);
    }
  }, [onProgressUpdate]);

  const handleLoadStart = () => setIsLoading(true);

  const handleCanPlay = () => {
    setIsLoading(false);
    if (
      videoRef.current &&
      duration > 0 &&
      initialProgress > 0 &&
      !isResuming
    ) {
      setIsResuming(true);
      videoRef.current.currentTime = initialProgress;
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load video stream");
  };

  const handleSkipIntro = () => {
    if (videoRef.current) {
      const skipToTime = Math.min(120, duration * 0.1);
      videoRef.current.currentTime = skipToTime;
    }
  };

  const handleSkipOutro = () => {
    if (videoRef.current) {
      const skipToTime = Math.max(duration - 30, duration * 0.95);
      videoRef.current.currentTime = skipToTime;
    }
  };

  const handleCancelAutoPlay = () => {
    setAutoPlayCancelled(true);
    setShowNextEpisodeOverlay(false);
  };

  return (
    <div className="relative aspect-video bg-black">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-white text-sm">Loading episode...</p>
            <p className="text-gray-400 text-xs mt-1">
              {animeTitle} - Episode {episodeNumber}
            </p>
            {initialProgress > 0 && (
              <p className="text-orange-400 text-xs mt-1">
                Resuming from {Math.floor(initialProgress / 60)}:
                {String(Math.floor(initialProgress % 60)).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-white text-sm mb-2">Stream failed to load</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={streamUrl}
        controls
        className="w-full h-full"
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onTimeUpdate={handleTimeUpdate}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      {/* Skip Controls */}
      <SkipControls
        onSkipIntro={handleSkipIntro}
        onSkipOutro={handleSkipOutro}
        showSkipIntro={showSkipIntro}
        showSkipOutro={showSkipOutro}
      />

      {/* Next Episode Overlay */}
      <NextEpisodeOverlay
        timeRemaining={duration - currentTime}
        onPlayNext={onPlayNextEpisode}
        onCancel={handleCancelAutoPlay}
        isVisible={showNextEpisodeOverlay}
      />
    </div>
  );
};
