import React from "react";
import { Info, X, FolderOpen, Download, Upload, Users } from "lucide-react";

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

interface BackendTorrentInfoProps {
  torrentInfo: TorrentInfo;
  onRemove: () => void;
}

export const BackendTorrentInfo: React.FC<BackendTorrentInfoProps> = ({
  torrentInfo,
  onRemove,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const playableFiles = torrentInfo.files.filter((file) => file.isPlayable);

  return (
    <div className="bg-gray-700 p-5 rounded-lg shadow-inner border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-blue-300 flex items-center">
          <FolderOpen size={20} className="mr-2" />
          {torrentInfo.name}
        </h2>
        <button
          onClick={onRemove}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out transform hover:scale-105"
        >
          <X size={18} className="mr-2" /> Remove
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">
            Progress: {torrentInfo.progress}%
          </span>
          <span className="text-xs text-gray-400">
            {torrentInfo.ready ? "Ready" : "Downloading..."}
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-400 to-teal-500 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${torrentInfo.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-400 mb-4">
        <div className="flex items-center">
          <Download size={14} className="mr-2 text-green-400" />
          <span>{torrentInfo.downloadSpeed}</span>
        </div>
        <div className="flex items-center">
          <Upload size={14} className="mr-2 text-red-400" />
          <span>{torrentInfo.uploadSpeed}</span>
        </div>
        <div className="flex items-center">
          <Users size={14} className="mr-2 text-yellow-400" />
          <span>{torrentInfo.numPeers} peers</span>
        </div>
        <div className="flex items-center">
          <Info size={14} className="mr-2 text-purple-400" />
          <span>
            {playableFiles.length}/{torrentInfo.files.length} playable
          </span>
        </div>
      </div>

      {/* File info */}
      <div className="text-xs text-gray-500">
        <p>Total Size: {formatBytes(torrentInfo.totalSize)}</p>
        <p className="truncate">Hash: {torrentInfo.infoHash}</p>
      </div>

      {playableFiles.length === 0 && (
        <div className="mt-3 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
          <p className="text-yellow-200 text-sm">
            ⚠️ No streamable video or audio files found in this torrent.
          </p>
        </div>
      )}
    </div>
  );
};
