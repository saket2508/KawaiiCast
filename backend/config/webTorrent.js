import WebTorrent from "webtorrent";

// WebTorrent client configuration
export const createWebTorrentClient = () => {
  return new WebTorrent({
    dht: true,
    tracker: {
      announce: [
        "udp://tracker.openbittorrent.com:80",
        "udp://tracker.opentrackr.org:1337",
        "udp://9.rarbg.to:2710",
        "udp://exodus.desync.com:6969",
        "udp://tracker.torrent.eu.org:451",
        "udp://tracker.tiny-vps.com:6969",
        "udp://open.stealth.si:80",
        "udp://explodie.org:6969",
      ],
      announceInterval: 15 * 60 * 1000,
      announceTimeout: 15000,
    },
    utp: true,
    maxConns: 200,
  });
};

// CORS configuration
export const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
};

// File upload configuration
export const fileUploadConfig = {
  storage: "memory",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.originalname.endsWith(".torrent") ||
      file.mimetype === "application/x-bittorrent"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .torrent files are allowed"), false);
    }
  },
};
