"use client";

import React from "react";
import { useTorrentStream } from "../hooks/useTorrentStream";
import { TorrentInput } from "../components/TorrentInput";
import { BackendTorrentInfo } from "../components/BackendTorrentInfo";
import { FileSelector } from "../components/FileSelector";
import { VideoPlayer } from "../components/VideoPlayer";
import { StatusMessage } from "../components/StatusMessage";

const Home = () => {
  const {
    torrentInfo,
    videoSrc,
    isLoading,
    message,
    selectedFileIndex,
    videoRef,
    loadTorrent,
    startStreaming,
    removeTorrent,
    setSelectedFileIndex,
  } = useTorrentStream();

  const handleTorrentSubmit = (data: string | ArrayBuffer) => {
    loadTorrent(data);
  };

  const handleFileSelect = (index: number) => {
    setSelectedFileIndex(index);
  };

  const handleStartStream = () => {
    startStreaming();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 font-inter">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-6xl border border-blue-600">
        <h1 className="text-4xl font-extrabold text-center text-blue-400 mb-8 tracking-wide">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            WebTorrent Streamer
          </span>
          <span className="block text-sm font-normal text-gray-400 mt-2">
            Backend Streaming • More Reliable
          </span>
        </h1>

        <div className="mb-6">
          <TorrentInput
            onTorrentSubmit={handleTorrentSubmit}
            isDisabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <StatusMessage message={message} />
        </div>

        {torrentInfo && (
          <div className="mb-6">
            <BackendTorrentInfo
              torrentInfo={torrentInfo}
              onRemove={removeTorrent}
            />
          </div>
        )}

        {torrentInfo && torrentInfo.files.length > 0 && (
          <div className="mb-6">
            <FileSelector
              files={torrentInfo.files}
              selectedIndex={selectedFileIndex}
              onFileSelect={handleFileSelect}
              onStartStream={handleStartStream}
              isStreaming={!!videoSrc}
            />
          </div>
        )}

        <VideoPlayer videoRef={videoRef} videoSrc={videoSrc} />

        {/* Instructions */}
        <div className="mt-8 bg-gray-700 p-6 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            How to Use (Backend Streaming)
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>
              <strong>Enter a magnet URI</strong> in the input field above
              (.torrent files coming soon)
            </li>
            <li>
              <strong>Click &ldquo;Load Torrent&rdquo;</strong> to fetch torrent
              information from the backend
            </li>
            <li>
              <strong>Select a file</strong> from the list (video/audio files
              are highlighted)
            </li>
            <li>
              <strong>Click &ldquo;Start Stream&rdquo;</strong> to begin
              streaming from the backend
            </li>
            <li>
              The video will start playing once sufficient data is available
            </li>
          </ol>

          <div className="mt-4 p-3 bg-green-900 border border-green-600 rounded-lg">
            <h4 className="text-green-200 font-medium mb-1">
              ✅ Backend Streaming Benefits:
            </h4>
            <ul className="text-sm text-green-100 space-y-1">
              <li>• More reliable and stable streaming</li>
              <li>• Better error handling and recovery</li>
              <li>• Consistent performance across browsers</li>
              <li>• No complex WebRTC/WebTorrent issues</li>
              <li>• Proper streaming protocols and buffering</li>
            </ul>
          </div>

          <div className="mt-3 p-3 bg-blue-900 border border-blue-600 rounded-lg">
            <p className="text-blue-200 text-sm">
              <strong>Backend Requirements:</strong> Make sure the backend
              server is running on port 8080. The backend handles all torrent
              operations and serves the media streams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
