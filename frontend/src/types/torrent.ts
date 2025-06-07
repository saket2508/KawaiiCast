export interface TorrentInfo {
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  length: number;
  destroy: (cb: () => void) => void;
  files: TorrentFile[];
  magnetURI: string;
}

export interface TorrentFile {
  name: string;
  path: string;
  length: number;
  renderTo: (
    element: HTMLMediaElement | null,
    callback?: (err: Error | null, element: HTMLMediaElement) => void
  ) => void;
  url: string;
}
