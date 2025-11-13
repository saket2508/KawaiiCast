import {
  DEFAULT_SOURCE,
  REQUEST_TIMEOUT,
  TORRENT_SOURCES,
} from "@config/torrentSources";

export interface TorrentInfo {
  title: string;
  magnet: string | null;
  infoHash: string;
  link: string;
  size: number;
  sizeText: string;
  seeders: number;
  leechers: number;
  publishDate: Date;
  episodeNumber: number | null;
  quality: string;
  releaseGroup: string;
  source: string;
  animeId?: number | null;
  episodeId?: number | null;
}

type TorrentSourceSelection = "both" | "nyaa" | "tokyotosho" | string[];

const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseEpisodeNumber = (title: string): number | null => {
  const match = title.match(/(?:ep(?:isode)?[\s\-:]*)?(\d{1,4})(?:v\d)?/i);
  const value = match?.[1];
  return value ? parseInt(value, 10) : null;
};

const parseQuality = (title: string): string => {
  const qualityMatch = title.match(/(\d{3,4}p)/i);
  const value = qualityMatch?.[1];
  return value ? value.toUpperCase() : "Unknown";
};

const parseReleaseGroup = (title: string): string => {
  const groupMatch = title.match(/^\[([^\]]+)\]/);
  return groupMatch?.[1] ?? "Unknown";
};

const parseFileSize = (sizeText?: string | null): number => {
  if (!sizeText) return 0;
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  const match = sizeText.match(/([0-9.]+)\s*([A-Z]+)/i);
  const sizeValue = match?.[1];
  const unitValue = match?.[2];
  if (sizeValue && unitValue) {
    const size = parseFloat(sizeValue);
    const unit = unitValue.toUpperCase();
    return Math.round(size * (units[unit] || 0));
  }
  return 0;
};

const normalizeTitle = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/gi, "");

const createMagnetLink = (infoHash: string, title: string): string | null => {
  if (!infoHash) return null;
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`;
};

const createTorrentObject = (item: any, source: string): TorrentInfo => {
  const title = (item?.name || item?.title || "").trim();
  const infoHash = item?.hash || item?.info_hash || "";
  const seeders = Number.parseInt(String(item?.seeders ?? "0"), 10) || 0;
  const leechers = Number.parseInt(String(item?.leechers ?? "0"), 10) || 0;
  const sizeText = item.size || item.total_size_formatted || "Unknown";
  const link = item.url || item.link || item.website_url || "";
  const pubDate =
    item.date ||
    item.timestamp ||
    item.upload_timestamp ||
    new Date().toISOString();

  let magnet = item.magnet || item.magnet_uri || null;
  if (!magnet && infoHash) {
    magnet = createMagnetLink(infoHash, title);
  }

  return {
    title,
    magnet,
    infoHash,
    link,
    size: Number.parseInt(String(item?.total_size ?? "0"), 10) || parseFileSize(sizeText),
    sizeText,
    seeders,
    leechers,
    publishDate: new Date(pubDate),
    episodeNumber: parseEpisodeNumber(title),
    quality: parseQuality(title),
    releaseGroup: parseReleaseGroup(title),
    source,
    animeId: item.anidb_aid || null,
    episodeId: item.anidb_eid || null,
  };
};

const searchNyaaAPI = async (
  query: string,
  category = "1_2"
): Promise<TorrentInfo[]> => {
  const source = TORRENT_SOURCES.NYAA_API;
  const searchParams = new URLSearchParams({
    q: query,
    c: category,
    f: "0",
    s: "seeders",
    o: "desc",
  });
  const searchUrl = `${source.url}?${searchParams.toString()}`;
  try {
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`${source.name} request failed: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((item: any) => createTorrentObject(item, source.name));
  } catch (error) {
    console.error(`❌ ${source.name} search error:`, error);
    return [];
  }
};

const searchAnimeTosho = async (query: string): Promise<TorrentInfo[]> => {
  const source = TORRENT_SOURCES.TOKYOTOSHO;
  try {
    const searchUrl = `${source.url}/json?qx=1&q=${encodeURIComponent(query)}`;
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`${source.name} request failed: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((item: any) => createTorrentObject(item, source.name));
  } catch (error) {
    console.error(`❌ ${source.name} search error:`, error);
    return [];
  }
};

const buildAnimeToshoUrl = (
  quality = "all",
  aids?: number | null,
  eids?: number | null
) => {
  const baseUrl = "https://feed.animetosho.org/json";
  if (!aids) {
    return quality.toLowerCase() === "all"
      ? `${baseUrl}?q=${quality}`
      : `${baseUrl}?q=${quality}`;
  }
  if (!eids) {
    return quality.toLowerCase() === "all"
      ? `${baseUrl}?aids=${aids}`
      : `${baseUrl}?q=${quality}&aids=${aids}`;
  }
  return quality.toLowerCase() === "all"
    ? `${baseUrl}?qx=1&aids=${aids}&eids=${eids}`
    : `${baseUrl}?qx=1&q=${quality}&aids=${aids}&eids=${eids}`;
};

const fetchAnimeToshoByIds = async (
  quality: string,
  aids?: number | null,
  eids?: number | null
): Promise<any[]> => {
  const url = buildAnimeToshoUrl(quality, aids, eids);
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!response.ok) {
    throw new Error(`AnimeTosho API error: ${response.status}`);
  }
  return response.json();
};

const generateEpisodeQueries = (
  animeTitle: string,
  episodeNumber?: number | null
): string[] => {
  if (!episodeNumber) return [animeTitle];
  const paddedEp = episodeNumber.toString().padStart(2, "0");
  return [
    `${animeTitle} ${paddedEp}`,
    `${animeTitle} Episode ${episodeNumber}`,
    `${animeTitle} E${episodeNumber}`,
    `${animeTitle} - ${episodeNumber}`,
    `${animeTitle} ${episodeNumber}`,
    `EP${episodeNumber} ${animeTitle}`,
  ];
};

const generateQueriesFromTitles = (
  titles: Array<string | null | undefined>,
  episodeNumber?: number | null
): string[] => {
  const querySet = new Set<string>();
  titles
    .filter((title): title is string => Boolean(title))
    .forEach((title) => {
      generateEpisodeQueries(title, episodeNumber).forEach((q) =>
        querySet.add(q)
      );
    });
  return Array.from(querySet);
};

const removeDuplicateTorrents = (torrents: TorrentInfo[]): TorrentInfo[] => {
  const unique: TorrentInfo[] = [];
  const seen = new Set<string>();
  torrents.forEach((torrent) => {
    const key = `${normalizeTitle(torrent.title)}_${torrent.infoHash}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(torrent);
    }
  });
  return unique;
};

const sortTorrents = (torrents: TorrentInfo[]): TorrentInfo[] => {
  const qualityOrder = ["1080p", "720p", "480p", "Unknown"];
  return torrents.sort((a, b) => {
    if (b.seeders !== a.seeders) {
      return b.seeders - a.seeders;
    }
    const aQualityIndex = qualityOrder.indexOf(a.quality);
    const bQualityIndex = qualityOrder.indexOf(b.quality);
    return aQualityIndex - bQualityIndex;
  });
};

const filterTorrentsByEpisode = (
  torrents: TorrentInfo[],
  episodeNumber?: number | null
): TorrentInfo[] => {
  if (!episodeNumber) return torrents;
  const normalizedEpisodeStr = normalizeTitle(episodeNumber.toString());
  return torrents
    .map((torrent) => ({
      ...torrent,
      parsedEpisode: torrent.episodeNumber || parseEpisodeNumber(torrent.title),
    }))
    .filter(
      (torrent) =>
        torrent.parsedEpisode === episodeNumber ||
        normalizeTitle(torrent.title).includes(normalizedEpisodeStr)
    )
    .map((torrent) => ({ ...torrent, parsedEpisode: undefined }));
};

const shouldSearchSource = (
  sources: TorrentSourceSelection,
  source: "nyaa" | "tokyotosho"
): boolean => {
  if (Array.isArray(sources)) {
    return sources.includes(source);
  }
  if (sources === "both") return true;
  return sources === source;
};

export const searchTorrents = async (
  query: string,
  category = "anime",
  sources: TorrentSourceSelection = DEFAULT_SOURCE
): Promise<TorrentInfo[]> => {
  try {
    const searchPromises: Array<Promise<TorrentInfo[]>> = [];
    if (shouldSearchSource(sources, "nyaa")) {
      searchPromises.push(searchNyaaAPI(query, category));
    }
    if (shouldSearchSource(sources, "tokyotosho")) {
      searchPromises.push(searchAnimeTosho(query));
    }
    const results = await Promise.all(searchPromises);
    const combined = results.flat();
    const unique = removeDuplicateTorrents(combined);
    const sorted = sortTorrents(unique);
    console.log(`✅ Found ${sorted.length} unique torrents for "${query}"`);
    return sorted;
  } catch (error) {
    console.error("❌ Error searching torrents:", error);
    return [];
  }
};

export const searchAnimeTorrents = async (
  animeTitle: string,
  episodeNumber: number | null = null,
  aids: number | null = null,
  eids: number | null = null,
  quality = "all",
  alternateTitles: string[] = []
): Promise<TorrentInfo[]> => {
  try {
    const searchStartTime = Date.now();
    console.log("🔍 searchAnimeTorrents called", {
      animeTitle,
      episodeNumber,
      aids,
      eids,
      quality,
    });

    let allTorrents: TorrentInfo[] = [];
    const titlesToSearch = [animeTitle, ...alternateTitles];
    const allQueries = generateQueriesFromTitles(titlesToSearch, episodeNumber);

    const searchOperations: Promise<any>[] = [];

    if (aids) {
      const idSearchPromise = fetchAnimeToshoByIds(quality, aids, eids)
        .then((torrents) => ({
          type: "id-based",
          torrents: torrents.map((item: any) =>
            createTorrentObject(item, "AnimeTosho")
          ),
          success: torrents.length > 0,
        }))
        .catch((error) => {
          console.warn("⚠️ ID-based search failed:", error.message);
          return { type: "id-based", torrents: [], success: false };
        });
      searchOperations.push(idSearchPromise);
    }

    const textSearchPromise = Promise.allSettled(
      allQueries.map(async (queryString) => {
        try {
          const torrents = await searchTorrents(queryString, "anime", "nyaa");
          const filtered = filterTorrentsByEpisode(torrents, episodeNumber);
          return {
            type: "text-based",
            query: queryString,
            torrents: filtered,
            success: filtered.length > 0,
          };
        } catch (error: any) {
          console.warn(`Query failed: "${queryString}" - ${error.message}`);
          return { type: "text-based", query: queryString, torrents: [], success: false };
        }
      })
    ).then((results) => ({
      type: "text-search-batch",
      results: results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            type: string;
            query: string;
            torrents: TorrentInfo[];
            success: boolean;
          }> => result.status === "fulfilled"
        )
        .map((result) => result.value)
        .filter((result) => result.success)
        .sort((a, b) => b.torrents.length - a.torrents.length),
    }));

    searchOperations.push(textSearchPromise);

    console.log(
      `🚀 Executing ${searchOperations.length} search operations in parallel:`
    );
    console.log(
      `   - ${aids ? "ID-based search (AnimeTosho)" : "No ID-based search"}`
    );
    console.log(`   - Text-based search (${allQueries.length} queries)`);

    const searchResults = await Promise.allSettled(searchOperations);

    searchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const searchResult = result.value;
        if (searchResult.type === "id-based" && searchResult.success) {
          console.log(
            `✅ ID-based search found ${searchResult.torrents.length} torrents`
          );
          allTorrents = allTorrents.concat(searchResult.torrents);
        } else if (searchResult.type === "text-search-batch") {
          const totalFound = searchResult.results.reduce(
            (sum: number, r: { torrents: TorrentInfo[] }) =>
              sum + r.torrents.length,
            0
          );
          console.log(
            `✅ Text-based search found ${totalFound} torrents from ${searchResult.results.length} successful queries`
          );
          searchResult.results.forEach((queryResult: { torrents: TorrentInfo[] }) => {
            allTorrents = allTorrents.concat(queryResult.torrents);
          });
        }
      }
    });

    if (allTorrents.length === 0) {
      console.warn(`⚠️ No specific matches found. Trying broader search.`);
      const broadTorrents = await searchTorrents(animeTitle, "anime", "nyaa");
      allTorrents = allTorrents.concat(broadTorrents);
    }

    const uniqueTorrents = removeDuplicateTorrents(allTorrents);
    const sortedTorrents = sortTorrents(uniqueTorrents);
    const searchDuration = Date.now() - searchStartTime;
    console.log(
      `⚡ Search completed in ${searchDuration}ms - Found ${sortedTorrents.length} unique torrents`
    );
    return sortedTorrents;
  } catch (error) {
    console.error("❌ Error in searchAnimeTorrents:", error);
    return [];
  }
};

export const getBestTorrents = (
  torrents: TorrentInfo[],
  episodeNumber: number | null = null
): TorrentInfo[] => {
  let filtered = torrents;
  if (episodeNumber) {
    filtered = torrents.filter((t) => t.episodeNumber === episodeNumber);
  }
  const grouped: Record<string, TorrentInfo> = {};
  filtered.forEach((torrent) => {
    const key = `${torrent.quality}_${torrent.releaseGroup}`;
    if (!grouped[key] || grouped[key].seeders < torrent.seeders) {
      grouped[key] = torrent;
    }
  });
  const qualityOrder = ["1080p", "720p", "480p", "Unknown"];
  const preferredGroups = ["SubsPlease", "Erai-raws", "HorribleSubs"];
  return Object.values(grouped).sort((a, b) => {
    const aQualityIndex = qualityOrder.indexOf(a.quality);
    const bQualityIndex = qualityOrder.indexOf(b.quality);
    if (aQualityIndex !== bQualityIndex) {
      return aQualityIndex - bQualityIndex;
    }
    const aGroupIndex = preferredGroups.indexOf(a.releaseGroup);
    const bGroupIndex = preferredGroups.indexOf(b.releaseGroup);
    if (aGroupIndex !== -1 && bGroupIndex === -1) return -1;
    if (aGroupIndex === -1 && bGroupIndex !== -1) return 1;
    if (aGroupIndex !== bGroupIndex) return aGroupIndex - bGroupIndex;
    return b.seeders - a.seeders;
  });
};

export const searchAnimeBatch = async (
  animeTitle: string,
  season: number | null = null
): Promise<TorrentInfo[]> => {
  const batchKeywords = ["batch", "complete", "season", "BD", "BluRay"];
  let query = animeTitle;
  if (season) {
    query += ` season ${season}`;
  }
  query += " " + batchKeywords.join(" OR ");
  return searchTorrents(query, "1_2");
};

export const searchTorrentsFromSource = async (
  query: string,
  source: TorrentSourceSelection,
  category = "1_2"
): Promise<TorrentInfo[]> => {
  return searchTorrents(query, category, source);
};

export const getAnimeToshoByIds = async (
  quality = "all",
  animeIds: number | null,
  episodeIds: number | null = null
): Promise<TorrentInfo[]> => {
  try {
    if (!animeIds) return [];
    const data = await fetchAnimeToshoByIds(quality, animeIds, episodeIds);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((item) => createTorrentObject(item, "AnimeTosho"));
  } catch (error) {
    console.error("❌ Error fetching AnimeTosho episodes:", error);
    return [];
  }
};

export const getAnimeToshoIds = async (
  animeId: number,
  episodeId?: number | null
): Promise<{ aids: number | null; eids: number | null }> => {
  try {
    const response = await fetch(
      `https://api.ani.zip/mappings?anilist_id=${animeId}`
    );
    if (!response.ok) {
      throw new Error(`Ani.zip error: ${response.status}`);
    }
    const data = await response.json();
    const epData =
      typeof episodeId !== "undefined" && episodeId !== null
        ? data.episodes?.[episodeId]
        : null;
    const aids = data.mappings?.anidb_id || null;
    const eids = epData?.anidbEid || null;
    return { aids, eids };
  } catch (error) {
    console.error("Error fetching AnimeTosho anime and episode IDs:", error);
    return { aids: null, eids: null };
  }
};

export const getToshoEpisodes = fetchAnimeToshoByIds;
