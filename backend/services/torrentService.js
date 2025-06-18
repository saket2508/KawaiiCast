import fetch from "node-fetch";
import {
  TORRENT_SOURCES,
  DEFAULT_SOURCE,
  REQUEST_TIMEOUT,
} from "../config/torrentSources.js";

// ===== UTILITY FUNCTIONS =====

// Parse episode number from title
const parseEpisodeNumber = (title) => {
  const match = title.match(/(?:ep(?:isode)?[\s\-:]*)?(\d{1,4})(?:v\d)?/i);
  return match ? parseInt(match[1], 10) : null;
};

// Parse quality from title
const parseQuality = (title) => {
  const qualityMatch = title.match(/(\d{3,4}p)/i);
  return qualityMatch ? qualityMatch[1] : "Unknown";
};

// Parse release group from title
const parseReleaseGroup = (title) => {
  const groupMatch = title.match(/^\[([^\]]+)\]/);
  return groupMatch ? groupMatch[1] : "Unknown";
};

// Parse file size from text
const parseFileSize = (sizeText) => {
  if (!sizeText) return 0;

  const units = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeText.match(/([0-9.]+)\s*([A-Z]+)/i);
  if (match) {
    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return Math.round(size * (units[unit] || 0));
  }
  return 0;
};

// Normalize title for comparison
const normalizeTitle = (str) => str.toLowerCase().replace(/[^a-z0-9]/gi, "");

// Create magnet link if not provided
const createMagnetLink = (infoHash, title) => {
  if (!infoHash) return null;
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`;
};

// Standardize torrent object structure
const createTorrentObject = (item, source) => {
  const title = (item.name || item.title || "").trim();
  const infoHash = item.hash || item.info_hash || "";
  const seeders = parseInt(item.seeders) || 0;
  const leechers = parseInt(item.leechers) || 0;
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
    size: parseInt(item.total_size) || parseFileSize(sizeText),
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

// ===== SOURCE-SPECIFIC SEARCH FUNCTIONS =====

// Search torrents from Nyaa JSON API
const searchNyaaAPI = async (query, category = "1_2") => {
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
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.ok) {
      throw new Error(`${source.name} request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => createTorrentObject(item, source.name));
  } catch (error) {
    console.error(`❌ ${source.name} search error:`, error);
    return [];
  }
};

// Search torrents from AnimeTosho JSON API
const searchAnimeTosho = async (query) => {
  const source = TORRENT_SOURCES.TOKYOTOSHO;

  try {
    const searchUrl = `${source.url}/json?qx=1&q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.ok) {
      throw new Error(`${source.name} request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => createTorrentObject(item, source.name));
  } catch (error) {
    console.error(`❌ ${source.name} search error:`, error);
    return [];
  }
};

// ===== ANIMETOSHO ID-BASED FUNCTIONS =====

// Generate AnimeTosho API URL with parameters
const buildAnimeToshoUrl = (quality = "all", aids, eids) => {
  const baseUrl = "https://feed.animetosho.org/json";

  if (eids === 0 || eids === null) {
    return quality.toLowerCase() === "all"
      ? `${baseUrl}?aids=${aids}`
      : `${baseUrl}?q=${quality}&aids=${aids}`;
  }

  return quality.toLowerCase() === "all"
    ? `${baseUrl}?qx=1&aids=${aids}&eids=${eids}`
    : `${baseUrl}?qx=1&q=${quality}&aids=${aids}&eids=${eids}`;
};

// Fetch torrents from AnimeTosho by IDs
const fetchAnimeToshoByIds = async (quality, aids, eids) => {
  try {
    const url = buildAnimeToshoUrl(quality, aids, eids);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`AnimeTosho API error: ${error.message}`);
  }
};

// ===== NEW HELPER FOR MULTIPLE TITLES =====
// Generate episode search queries for an array of possible titles (e.g. English and Romaji)
const generateQueriesFromTitles = (titles, episodeNumber) => {
  const querySet = new Set();

  titles
    .filter(Boolean) // remove undefined/null
    .forEach((title) => {
      const queries = generateEpisodeQueries(title, episodeNumber);
      queries.forEach((q) => querySet.add(q));
    });

  return Array.from(querySet);
};

// ===== MAIN SEARCH FUNCTIONS =====

// Remove duplicates from torrent array
const removeDuplicateTorrents = (torrents) => {
  const uniqueTorrents = [];
  const seen = new Set();

  torrents.forEach((torrent) => {
    const key = `${normalizeTitle(torrent.title)}_${torrent.infoHash}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTorrents.push(torrent);
    }
  });

  return uniqueTorrents;
};

// Sort torrents by quality and seeders
const sortTorrents = (torrents) => {
  const qualityOrder = ["1080p", "720p", "480p", "Unknown"];

  return torrents.sort((a, b) => {
    // Primary sort: seeders (descending)
    if (b.seeders !== a.seeders) {
      return b.seeders - a.seeders;
    }

    // Secondary sort: quality preference
    const aQualityIndex = qualityOrder.indexOf(a.quality);
    const bQualityIndex = qualityOrder.indexOf(b.quality);
    return aQualityIndex - bQualityIndex;
  });
};

// Search torrents using multiple sources
export const searchTorrents = async (
  query,
  category = "anime",
  sources = DEFAULT_SOURCE
) => {
  try {
    console.log(`🔍 Searching torrents: "${query}" from sources: ${sources}`);

    const searchPromises = [];

    // Determine which sources to search
    const shouldSearchNyaa =
      sources === "both" || sources === "nyaa" || sources.includes("nyaa");
    const shouldSearchTosho =
      sources === "both" ||
      sources === "tokyotosho" ||
      sources.includes("tokyotosho");

    if (shouldSearchNyaa) {
      searchPromises.push(searchNyaaAPI(query, category));
    }

    if (shouldSearchTosho) {
      searchPromises.push(searchAnimeTosho(query));
    }

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises);

    // Combine and process results
    const allTorrents = results.flat();
    const uniqueTorrents = removeDuplicateTorrents(allTorrents);
    const sortedTorrents = sortTorrents(uniqueTorrents);

    console.log(
      `✅ Found ${sortedTorrents.length} unique torrents for "${query}"`
    );
    return sortedTorrents;
  } catch (error) {
    console.error("❌ Error searching torrents:", error);
    return [];
  }
};

// Generate episode search queries
const generateEpisodeQueries = (animeTitle, episodeNumber) => {
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

// Filter torrents by episode number
const filterTorrentsByEpisode = (torrents, episodeNumber) => {
  if (!episodeNumber) return torrents;

  const normalizedEpisodeStr = normalizeTitle(episodeNumber.toString());

  return torrents
    .map((t) => ({
      ...t,
      parsedEpisode: t.episodeNumber || parseEpisodeNumber(t.title),
    }))
    .filter(
      (t) =>
        t.parsedEpisode === episodeNumber ||
        normalizeTitle(t.title).includes(normalizedEpisodeStr)
    );
};

// Search anime torrents with episode filtering
export const searchAnimeTorrents = async (
  animeTitle,
  episodeNumber = null,
  aids = null,
  eids = null,
  quality = "all",
  alternateTitles = []
) => {
  try {
    console.log("🔍 Searching anime torrents:", {
      animeTitle,
      alternateTitles,
      episodeNumber,
      aids,
      eids,
      quality,
    });

    let allTorrents = [];

    // Method 1: ID-based search using AnimeTosho if IDs are provided
    if (aids) {
      try {
        console.log(
          `🎯 Using ID-based search: animeId=${aids}, episodeId=${eids}`
        );
        const idBasedTorrents = await getAnimeToshoByIds(quality, aids, eids);

        if (idBasedTorrents.length > 0) {
          console.log(
            `✅ Found ${idBasedTorrents.length} torrents via ID-based search`
          );
          allTorrents = allTorrents.concat(idBasedTorrents);
        }
      } catch (error) {
        console.warn(
          "⚠️ ID-based search failed, falling back to text search:",
          error.message
        );
      }
    }

    // Method 2: Text-based search
    const titlesToSearch = [animeTitle, ...alternateTitles];

    console.log(
      `📝 Using text-based search for titles: ${titlesToSearch.join(", ")}`
    );

    const allQueries = generateQueriesFromTitles(titlesToSearch, episodeNumber);

    for (const query of allQueries) {
      const torrents = await searchTorrents(query, "1_2", "both");
      const filtered = filterTorrentsByEpisode(torrents, episodeNumber);

      if (filtered.length > 0) {
        console.log(`✅ Found ${filtered.length} results for "${query}"`);
        allTorrents = allTorrents.concat(filtered);
        break; // Exit on first successful query
      }
    }

    // Fallback: broader search if no specific matches
    if (allTorrents.length === 0) {
      console.warn(`⚠️ No specific matches found. Trying broader search.`);
      const broadTorrents = await searchTorrents(animeTitle, "1_2", "both");
      allTorrents = allTorrents.concat(broadTorrents);
    }

    // Process final results
    const uniqueTorrents = removeDuplicateTorrents(allTorrents);
    const sortedTorrents = sortTorrents(uniqueTorrents);

    console.log(`✅ Final result: ${sortedTorrents.length} unique torrents`);
    return sortedTorrents;
  } catch (error) {
    console.error("❌ Error in searchAnimeTorrents:", error);
    return [];
  }
};

// ===== TORRENT FILTERING AND SORTING =====

// Get best quality torrents for an anime episode
export const getBestTorrents = (torrents, episodeNumber = null) => {
  let filtered = torrents;

  // Filter by episode if specified
  if (episodeNumber) {
    filtered = torrents.filter((t) => t.episodeNumber === episodeNumber);
  }

  // Group by quality and release group
  const grouped = {};
  filtered.forEach((torrent) => {
    const key = `${torrent.quality}_${torrent.releaseGroup}`;
    if (!grouped[key] || grouped[key].seeders < torrent.seeders) {
      grouped[key] = torrent;
    }
  });

  // Sort by quality preference and seeders
  const qualityOrder = ["1080p", "720p", "480p", "Unknown"];
  const preferredGroups = ["SubsPlease", "Erai-raws", "HorribleSubs"];

  return Object.values(grouped).sort((a, b) => {
    // Primary sort: quality
    const aQualityIndex = qualityOrder.indexOf(a.quality);
    const bQualityIndex = qualityOrder.indexOf(b.quality);
    if (aQualityIndex !== bQualityIndex) {
      return aQualityIndex - bQualityIndex;
    }

    // Secondary sort: preferred release groups
    const aGroupIndex = preferredGroups.indexOf(a.releaseGroup);
    const bGroupIndex = preferredGroups.indexOf(b.releaseGroup);
    if (aGroupIndex !== -1 && bGroupIndex === -1) return -1;
    if (aGroupIndex === -1 && bGroupIndex !== -1) return 1;
    if (aGroupIndex !== bGroupIndex) return aGroupIndex - bGroupIndex;

    // Tertiary sort: seeders
    return b.seeders - a.seeders;
  });
};

// ===== SPECIALIZED SEARCH FUNCTIONS =====

// Search for anime batch/season torrents
export const searchAnimeBatch = async (animeTitle, season = null) => {
  const batchKeywords = ["batch", "complete", "season", "BD", "BluRay"];
  let query = animeTitle;

  if (season) {
    query += ` season ${season}`;
  }

  query += " " + batchKeywords.join(" OR ");
  return await searchTorrents(query, "1_2");
};

// Search from specific sources
export const searchTorrentsFromSource = async (
  query,
  source,
  category = "1_2"
) => {
  return await searchTorrents(query, category, source);
};

// ===== ANIMETOSHO ID-BASED EXPORTS =====

// Get specific anime episodes from AnimeTosho using anime/episode IDs
export const getAnimeToshoByIds = async (
  quality = "all",
  animeIds,
  episodeIds = null
) => {
  try {
    console.log(
      `🔍 Fetching AnimeTosho episodes: aids=${animeIds}, eids=${episodeIds}, quality=${quality}`
    );

    const data = await fetchAnimeToshoByIds(quality, animeIds, episodeIds);

    if (!Array.isArray(data)) {
      return [];
    }

    const torrents = data.map((item) =>
      createTorrentObject(item, "AnimeTosho")
    );

    console.log(`✅ Found ${torrents.length} AnimeTosho episodes`);
    return torrents;
  } catch (error) {
    console.error("❌ Error fetching AnimeTosho episodes:", error);
    return [];
  }
};

// Legacy export - kept for backward compatibility
export const getToshoEpisodes = fetchAnimeToshoByIds;
