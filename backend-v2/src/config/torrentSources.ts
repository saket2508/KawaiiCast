export type TorrentSourceKey = "NYAA_API" | "NYAA_RSS" | "TOKYOTOSHO";

export interface TorrentSourceConfig {
  name: string;
  url: string;
  type: "json" | "rss";
  category: string;
}

export const TORRENT_SOURCES: Record<TorrentSourceKey, TorrentSourceConfig> = {
  NYAA_API: {
    name: "Nyaa API",
    url: process.env.NYAA_API_URL || "https://nyaaapi.onrender.com/nyaa",
    type: "json",
    category: "1_2",
  },
  NYAA_RSS: {
    name: "Nyaa RSS",
    url: process.env.NYAA_RSS_URL || "https://nyaa.si/?page=rss&q=",
    type: "rss",
    category: "1_2",
  },
  TOKYOTOSHO: {
    name: "AnimeTosho",
    url: process.env.ANIMETOSHO_API_URL || "https://feed.animetosho.org",
    type: "json",
    category: "anime",
  },
};

export const DEFAULT_SOURCE =
  (process.env.DEFAULT_TORRENT_SOURCE as "both" | "nyaa" | "tokyotosho") ||
  "both";

export const REQUEST_TIMEOUT =
  Number(process.env.TORRENT_REQUEST_TIMEOUT) || 10000;

export const MAX_CONCURRENT_REQUESTS =
  Number(process.env.MAX_CONCURRENT_REQUESTS) || 5;
