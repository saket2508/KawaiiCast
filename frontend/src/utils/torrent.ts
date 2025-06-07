export const WEBTORRENT_TRACKERS = [
  "wss://tracker.webtorrent.io",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://open.webtorrent.dev",
];

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const validateMagnetURI = (uri: string): boolean => {
  return uri.startsWith("magnet:?");
};

export const validateTorrentFile = (
  data: ArrayBuffer
): { isValid: boolean; error?: string } => {
  if (data.byteLength === 0) {
    return {
      isValid: false,
      error: "The selected file is empty. Please choose a valid .torrent file.",
    };
  }

  if (data.byteLength > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: "File too large. .torrent files should be much smaller.",
    };
  }

  // Check if the file starts with the correct torrent file signature
  const firstBytes = new Uint8Array(data.slice(0, 10));
  const decoder = new TextDecoder();
  const fileStart = decoder.decode(firstBytes);

  // .torrent files start with "d" (bencode dictionary start)
  if (!fileStart.startsWith("d")) {
    return {
      isValid: false,
      error:
        "This doesn't appear to be a valid .torrent file. Please check your file.",
    };
  }

  return { isValid: true };
};
