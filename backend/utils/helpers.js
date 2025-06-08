// Format bytes to human readable format
export const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Generate stream ID
export const getStreamId = (torrentIdentifier, fileIndex) => {
  return `${Buffer.from(torrentIdentifier)
    .toString("base64")
    .slice(0, 16)}_${fileIndex}`;
};

// Check if file is a video file
export const isVideoFile = (filename) => {
  const videoExtensions = [
    "mp4",
    "webm",
    "mov",
    "mkv",
    "avi",
    "m4v",
    "wmv",
    "flv",
  ];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && videoExtensions.includes(ext);
};

// Check if file is an audio file
export const isAudioFile = (filename) => {
  const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && audioExtensions.includes(ext);
};

// Generate unique identifier for torrents
export const getTorrentId = (input) => {
  if (typeof input === "string" && input.startsWith("magnet:")) {
    return input; // Use magnet URI directly
  }
  // For torrent files, create a hash-based identifier
  return `torrent_${Buffer.from(input).toString("base64").slice(0, 32)}`;
};

// Sort files: playable first, then by size
export const sortFiles = (files) => {
  return files.sort((a, b) => {
    if (a.isPlayable && !b.isPlayable) return -1;
    if (!a.isPlayable && b.isPlayable) return 1;
    return b.size - a.size;
  });
};

// Prepare file information from torrent files
export const prepareFileInfo = (torrentFiles) => {
  return torrentFiles.map((file, index) => ({
    index,
    name: file.name,
    size: file.length,
    path: file.path,
    isVideo: isVideoFile(file.name),
    isAudio: isAudioFile(file.name),
    isPlayable: isVideoFile(file.name) || isAudioFile(file.name),
  }));
};
