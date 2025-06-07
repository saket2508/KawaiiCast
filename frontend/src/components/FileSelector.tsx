import React from "react";
import { Play, File, Music, Video } from "lucide-react";

interface TorrentFile {
  index: number;
  name: string;
  size: number;
  path: string;
  isVideo: boolean;
  isAudio: boolean;
  isPlayable: boolean;
}

interface FileSelectorProps {
  files: TorrentFile[];
  selectedIndex: number;
  onFileSelect: (index: number) => void;
  onStartStream: () => void;
  isStreaming: boolean;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  files,
  selectedIndex,
  onFileSelect,
  onStartStream,
  isStreaming,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: TorrentFile) => {
    if (file.isVideo) {
      return <Video size={16} className="text-blue-400" />;
    } else if (file.isAudio) {
      return <Music size={16} className="text-green-400" />;
    } else {
      return <File size={16} className="text-gray-400" />;
    }
  };

  // Files are already sorted by the backend: playable first, then by size
  const sortedFiles = files;

  const isPlayable = files.find(
    (file) => file.index === selectedIndex
  )?.isPlayable;

  return (
    <div className="bg-gray-700 p-5 rounded-lg shadow-inner border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-300">
          Select File to Stream
        </h3>
        <button
          onClick={onStartStream}
          disabled={!isPlayable}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out transform hover:scale-105"
        >
          <Play size={18} className="mr-2" />
          {isStreaming ? "Streaming..." : "Start Stream"}
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {sortedFiles.map((file) => (
          <div
            key={file.index}
            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
              selectedIndex === file.index
                ? "bg-blue-600 border-blue-400"
                : file.isPlayable
                ? "bg-gray-600 border-gray-500 hover:bg-gray-500"
                : "bg-gray-800 border-gray-700"
            } ${!file.isPlayable ? "opacity-50" : ""}`}
            onClick={() => onFileSelect(file.index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      file.isPlayable ? "text-white" : "text-gray-400"
                    }`}
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">{file.path}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">
                  {formatBytes(file.size)}
                </p>
                <p className="text-xs text-gray-500">#{file.index}</p>
              </div>
            </div>
            {!file.isPlayable && (
              <p className="text-xs text-yellow-400 mt-1">Not streamable</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {files.filter((f) => f.isPlayable).length} of {files.length} files are
        streamable
      </p>
    </div>
  );
};
