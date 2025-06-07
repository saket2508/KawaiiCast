import fetch from "node-fetch";
import * as cheerio from "cheerio";

const NYAA_BASE_URL = "https://nyaa.si";
const NYAA_SEARCH_URL = `${NYAA_BASE_URL}/?page=rss&q=`;

// Parse episode number from title
const parseEpisodeNumber = (title) => {
  const patterns = [
    /Episode (\d+)/i,
    /Ep\.?\s*(\d+)/i,
    /E(\d+)/i,
    /- (\d+)(?:\s|$)/,
    /\[(\d+)\]/,
    /S\d+E(\d+)/i,
    /#(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
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

// Search torrents using Nyaa RSS feed
export const searchTorrents = async (query, category = "1_2") => {
  try {
    console.log(`🔍 Searching torrents: "${query}"`);

    const searchUrl = `${NYAA_SEARCH_URL}${encodeURIComponent(
      query
    )}&c=${category}&f=0&s=seeders&o=desc`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nyaa request failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });

    const torrents = [];

    $("item").each((index, item) => {
      const $item = $(item);
      const title = $item.find("title").text();
      const link = $item.find("link").text();
      const description = $item.find("description").text();
      const pubDate = $item.find("pubDate").text();

      // Extract magnet URI from description
      const magnetMatch = description.match(/magnet:\?[^"]+/);
      const magnet = magnetMatch ? magnetMatch[0] : null;

      // Extract seeders/leechers from description
      const seedersMatch = description.match(/Seeders:\s*(\d+)/);
      const leechersMatch = description.match(/Leechers:\s*(\d+)/);
      const sizeMatch = description.match(/Size:\s*([0-9.]+ [A-Z]+)/i);

      if (magnet) {
        torrents.push({
          title: title.trim(),
          magnet,
          link,
          size: parseFileSize(sizeMatch ? sizeMatch[1] : "0 B"),
          sizeText: sizeMatch ? sizeMatch[1] : "Unknown",
          seeders: seedersMatch ? parseInt(seedersMatch[1]) : 0,
          leechers: leechersMatch ? parseInt(leechersMatch[1]) : 0,
          publishDate: new Date(pubDate),
          episodeNumber: parseEpisodeNumber(title),
          quality: parseQuality(title),
          releaseGroup: parseReleaseGroup(title),
        });
      }
    });

    console.log(`✅ Found ${torrents.length} torrents for "${query}"`);
    return torrents;
  } catch (error) {
    console.error("❌ Error searching torrents:", error);
    return [];
  }
};

// Search anime torrents with episode filtering
export const searchAnimeTorrents = async (animeTitle, episodeNumber = null) => {
  try {
    let query = animeTitle;

    // Add episode number to search if specified
    if (episodeNumber) {
      // Try multiple episode formats
      const episodeQueries = [
        `${animeTitle} ${episodeNumber.toString().padStart(2, "0")}`, // Episode 01
        `${animeTitle} Episode ${episodeNumber}`,
        `${animeTitle} E${episodeNumber}`,
        `${animeTitle} - ${episodeNumber}`,
      ];

      // Use the first format and try others if needed
      query = episodeQueries[0];
    }

    const torrents = await searchTorrents(query, "1_2"); // Anime category

    // Filter by episode number if specified
    if (episodeNumber) {
      const filtered = torrents.filter(
        (t) =>
          t.episodeNumber === episodeNumber ||
          t.title.includes(`${episodeNumber.toString().padStart(2, "0")}`)
      );

      if (filtered.length > 0) {
        return filtered;
      }

      // If no exact matches, return all and let the client filter
      console.log(
        `⚠️ No exact episode ${episodeNumber} matches, returning all results`
      );
    }

    return torrents;
  } catch (error) {
    console.error("❌ Error searching anime torrents:", error);
    return [];
  }
};

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
    // First by quality
    const aQualityIndex = qualityOrder.indexOf(a.quality);
    const bQualityIndex = qualityOrder.indexOf(b.quality);
    if (aQualityIndex !== bQualityIndex) {
      return aQualityIndex - bQualityIndex;
    }

    // Then by preferred release groups
    const aGroupIndex = preferredGroups.indexOf(a.releaseGroup);
    const bGroupIndex = preferredGroups.indexOf(b.releaseGroup);
    if (aGroupIndex !== -1 && bGroupIndex === -1) return -1;
    if (aGroupIndex === -1 && bGroupIndex !== -1) return 1;
    if (aGroupIndex !== bGroupIndex) return aGroupIndex - bGroupIndex;

    // Finally by seeders
    return b.seeders - a.seeders;
  });
};

// Search for specific anime season/batch torrents
export const searchAnimeBatch = async (animeTitle, season = null) => {
  const batchKeywords = ["batch", "complete", "season", "BD", "BluRay"];
  let query = animeTitle;

  if (season) {
    query += ` season ${season}`;
  }

  query += " " + batchKeywords.join(" OR ");

  return await searchTorrents(query, "1_2");
};
