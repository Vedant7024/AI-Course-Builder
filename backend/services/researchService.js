
const axios = require("axios");

const videoCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000;

function getBaseUrl() {
  return (
    process.env.SEARXNG_URL ||
    "https://ai-course-builder-searxng.onrender.com"
  ).replace(/\/+$/, "");
}

function extractVideoId(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
    ) {
      const id = parsed.searchParams.get("v");
      if (id) return id;

      const match = parsed.pathname.match(
        /^\/(?:embed|shorts|live|v)\/([^/?]+)/
      );

      return match ? match[1] : null;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function pickYouTubeVideos(results = []) {
  const videos = [];
  const seen = new Set();

  for (const result of results) {
    const candidates = [
      result.url,
      result.iframe_src,
      result.embed_url,
    ].filter(Boolean);

    let videoId = null;

    for (const url of candidates) {
      videoId = extractVideoId(url);
      if (videoId) break;
    }

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
  const response = await axios.get(`${getBaseUrl()}/search`, {
    params: {
      q: query,
      format: "json",
      language: "en",
      categories: "general",
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

  const queries = [
    `site:youtube.com/watch ${cleanQuery} tutorial`,
    `site:youtube.com/watch ${cleanQuery} full course`,
    `site:youtube.com ${cleanQuery} tutorial`,
  ];

  const videos = [];
  const seen = new Set();

  for (const searchQuery of queries) {
    try {
      console.log("SearXNG query:", searchQuery);

      const results = await searxSearch(searchQuery);
      const extracted = pickYouTubeVideos(results);

      console.log("Search results:", results.length);
      console.log("Videos extracted:", extracted.length);

      for (const video of extracted) {
        if (!seen.has(video.videoId)) {
          seen.add(video.videoId);
          videos.push(video);
        }

        if (videos.length >= 6) break;
      }

      if (videos.length >= 6) break;
    } catch (error) {
      console.error(
        "YouTube search failed:",
        error.response?.status || error.message
      );
    }
  }

  const finalVideos = videos.slice(0, 6);

  // Cache only successful searches.
  if (finalVideos.length) {
    videoCache.set(cacheKey, {
      at: Date.now(),
      data: finalVideos,
    });
  }

  console.log("Final videos:", finalVideos.length);
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
