import React from "react";
import { Download, UploadCloud, Info, X } from "lucide-react";
import { TorrentInfo as TorrentInfoType } from "../types/torrent";
import { formatBytes } from "../utils/torrent";

interface TorrentInfoProps {
  torrent: TorrentInfoType;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  onRemove: () => void;
}

export const TorrentInfo: React.FC<TorrentInfoProps> = ({
  torrent,
  progress,
  downloadSpeed,
  uploadSpeed,
  onRemove,
}) => {
  return (
    <div className="bg-gray-700 p-5 rounded-lg shadow-inner border border-gray-600">
      <h2 className="text-xl font-bold text-blue-300 mb-3">{torrent.name}</h2>

      <div className="flex items-center mb-3">
        <span className="text-lg font-medium text-gray-300 mr-3">
          Progress: {progress}%
        </span>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-400 to-teal-500 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-400">
        <p className="flex items-center">
          <Download size={16} className="mr-2 text-green-400" />
          Download: {formatBytes(downloadSpeed)}
        </p>
        <p className="flex items-center">
          <UploadCloud size={16} className="mr-2 text-red-400" />
          Upload: {formatBytes(uploadSpeed)}
        </p>
        <p className="flex items-center">
          <Info size={16} className="mr-2 text-yellow-400" />
          Peers: {torrent.numPeers}
        </p>
        <p className="flex items-center">
          <Info size={16} className="mr-2 text-purple-400" />
          Size: {formatBytes(torrent.length)}
        </p>
      </div>

      <button
        onClick={onRemove}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out transform hover:scale-105"
      >
        <X size={18} className="mr-2" /> Remove Torrent
      </button>
    </div>
  );
};
