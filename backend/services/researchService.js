
const axios = require("axios");

const videoCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000;

const getBaseUrl = () => {
  return (process.env.SEARXNG_URL || "https://ai-course-builder-searxng.onrender.com")
    .replace(/\/+$/, "");
};

function extractVideoId(url = "") {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v");
      }

      const match = parsed.pathname.match(
        /^\/(?:embed|shorts|live|v)\/([^/?]+)/
      );

      return match ? match[1] : null;
    }

    return null;
  } catch {
    return null;
  }
}

function pickYouTubeVideos(results = []) {
  const videos = [];
  const seen = new Set();

  for (const result of results) {
    const url = result.url || "";
    const iframeSrc = result.iframe_src || "";

    const videoId =
      extractVideoId(url) ||
      extractVideoId(iframeSrc);

    if (!videoId || seen.has(videoId)) continue;

    seen.add(videoId);

    videos.push({
      videoId,
      title: result.title || "YouTube Tutorial",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      description: result.content || result.description || "",
    });
  }

  return videos;
}

async function searxSearch(query) {
  const baseUrl = getBaseUrl();

  const response = await axios.get(`${baseUrl}/search`, {
    params: {
      q: query,
      format: "json",
      language: "en",
    },
    timeout: 25000,
    headers: {
      Accept: "application/json",
      "User-Agent": "AICourseBuilder/1.0",
    },
  });

  return Array.isArray(response.data?.results)
    ? response.data.results
    : [];
}

async function searchYouTubeVideos(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) return [];

  const cacheKey = cleanQuery.toLowerCase();
  const cached = videoCache.get(cacheKey);

  if (cached && Date.now() - cached.at < CACHE_DURATION) {
    return cached.data;
  }

  const searchQueries = [
    `${cleanQuery} tutorial`,
    `${cleanQuery} full course`,
  ];

  const collectedVideos = [];
  const seenIds = new Set();

  for (const searchQuery of searchQueries) {
    try {
      console.log("Searching SearXNG:", searchQuery);

      const results = await searxSearch(searchQuery);
      const extractedVideos = pickYouTubeVideos(results);

      console.log("SearXNG results:", results.length);
      console.log("YouTube videos extracted:", extractedVideos.length);

      for (const video of extractedVideos) {
        if (!seenIds.has(video.videoId)) {
          seenIds.add(video.videoId);
          collectedVideos.push(video);
        }

        if (collectedVideos.length >= 6) break;
      }

      if (collectedVideos.length >= 6) break;
    } catch (error) {
      console.error(
        "SearXNG search failed:",
        error.response?.status || error.message
      );
    }
  }

  const finalVideos = collectedVideos.slice(0, 6);

  if (finalVideos.length > 0) {
    videoCache.set(cacheKey, {
      at: Date.now(),
      data: finalVideos,
    });
  }

  console.log("Final YouTube videos:", finalVideos.length);

  return finalVideos;
}

async function searchResearch(topic) {
  const cleanTopic = String(topic || "").trim();

  if (!cleanTopic) return [];

  try {
    const results = await searxSearch(cleanTopic);

    return results.slice(0, 10).map((result) => ({
      title: result.title || "Research Result",
      url: result.url || "",
      description: result.content || result.description || "",
    }));
  } catch (error) {
    console.error(
      "Research search failed:",
      error.response?.status || error.message
    );

    return [];
  }
}

module.exports = {
  searchYouTubeVideos,
  searchResearch,
};
