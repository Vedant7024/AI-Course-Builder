
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
  } catch {
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
      result.embed_src,
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
    `${cleanQuery} YouTube tutorial`,
    `site:youtube.com/watch ${cleanQuery}`,
    `${cleanQuery} beginner tutorial video`,
    `${cleanQuery} full course YouTube`,
  ];

  const videos = [];
  const seen = new Set();

  for (const searchQuery of queries) {
    try {
      console.log("[YouTube Search] Query:", searchQuery);

      const results = await searxSearch(searchQuery);
      const extracted = pickYouTubeVideos(results);

      console.log("[YouTube Search] Results:", results.length);
      console.log("[YouTube Search] Extracted:", extracted.length);

      for (const video of extracted) {
        if (seen.has(video.videoId)) continue;

        seen.add(video.videoId);
        videos.push(video);

        if (videos.length >= 6) break;
      }

      if (videos.length >= 6) break;
    } catch (error) {
      console.error(
        "[YouTube Search] Failed:",
        error.response?.status || error.message
      );
    }
  }

  const finalVideos = videos.slice(0, 6);

  if (finalVideos.length > 0) {
    videoCache.set(cacheKey, {
      at: Date.now(),
      data: finalVideos,
    });
  }

  console.log("[YouTube Search] Final videos:", finalVideos.length);

  return finalVideos;
}

async function searxSearch(query) {
  const baseUrl = (
    process.env.SEARXNG_URL ||
    "https://ai-course-builder-searxng.onrender.com"
  ).replace(/\/+$/, "");

  const response = await fetch(
    `${baseUrl}/search?${new URLSearchParams({
      q: query,
      format: "json",
      language: "en",
      categories: "general",
    })}`,
    { signal: AbortSignal.timeout(30000) }
  );

  if (!response.ok) {
    throw new Error(`SearXNG error: ${response.status}`);
  }

  return response.json();
}


async function searchResearch(query) {
  const data = await searxSearch(query);
  return data.results || [];
}

module.exports = {
  searchYouTubeVideos,
  searchResearch,
};
