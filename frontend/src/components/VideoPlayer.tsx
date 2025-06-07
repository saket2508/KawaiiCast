import React, { useEffect } from "react";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  videoSrc,
}) => {
  // Update video src when videoSrc changes
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.src = videoSrc;
      videoRef.current.load(); // Force reload with new src
    }
  }, [videoSrc, videoRef]);

  return (
    <div
      className={`relative aspect-video bg-black rounded-lg overflow-hidden shadow-xl border border-gray-600 ${
        !videoSrc ? "hidden" : ""
      }`}
    >
      <video
        ref={videoRef}
        controls
        className="w-full h-full object-contain"
        preload="metadata"
        onLoadStart={() => console.log("Video load started")}
        onCanPlay={() => console.log("Video can play")}
        onError={(e) => console.error("Video error:", e)}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
