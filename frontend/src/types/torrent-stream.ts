// Shared types for torrent streaming functionality
// Used by useAutoTorrentStream and useTorrentStream hooks

export interface TorrentFile {
  index: number;
  name: string;
  size: number;
  path: string;
  isVideo: boolean;
  isAudio: boolean;
  isPlayable: boolean;
}

export interface TorrentInfo {
  name: string;
  infoHash: string;
  magnetURI: string;
  torrentId: string;
  files: TorrentFile[];
  totalSize: number;
  progress: number;
  downloadSpeed: string;
  uploadSpeed: string;
  numPeers: number;
  ready: boolean;
  uploadedFileName?: string; // Optional field used by useTorrentStream
}