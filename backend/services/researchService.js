const axios = require("axios");

const videoCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000;

const getBaseUrl = () =>
  (process.env.SEARXNG_URL ||
    "https://ai-course-builder-searxng.onrender.com").replace(/\/+$/, "");

function extractVideoId(url = "") {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(
        hostname
      )
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
    const videoId =
      extractVideoId(result.url || "") ||
      extractVideoId(result.iframe_src || "");

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

async function searxSearch(query, videosOnly = false) {
  const response = await axios.get(`${getBaseUrl()}/search`, {
    params: {
      q: query,
      format: "json",
      language: "en",
      ...(videosOnly ? { categories: "videos" } : {}),
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

async function searchYouTubeVideos(query, options = {}) {
  const topic = String(query || "").trim();
  const summary = String(options.summary || "").trim();
  const script = String(options.script || "").trim();

  if (!topic) return [];

  const cacheKey = `${topic}|${summary}|${script.slice(0, 200)}`.toLowerCase();
  const cached = videoCache.get(cacheKey);

  if (cached && Date.now() - cached.at < CACHE_DURATION) {
    return cached.data;
  }

  const searchQueries = [
    `${topic} tutorial`,
    `${topic} explained`,
    `${topic} full course`,
    summary ? `${topic} ${summary.slice(0, 120)} tutorial` : "",
    script ? `${topic} ${script.slice(0, 100)} explained` : "",
  ].filter(Boolean);

  const collectedVideos = [];
  const seenIds = new Set();

  for (const searchQuery of searchQueries) {
    // Try video-specific results first, then normal search results.
    for (const videosOnly of [true, false]) {
      try {
        console.log(
          `Searching SearXNG (${videosOnly ? "videos" : "general"}):`,
          searchQuery
        );

        const results = await searxSearch(searchQuery, videosOnly);
        const extractedVideos = pickYouTubeVideos(results);

        console.log("SearXNG results:", results.length);
        console.log("YouTube videos extracted:", extractedVideos.length);

        for (const video of extractedVideos) {
          if (seenIds.has(video.videoId)) continue;

          seenIds.add(video.videoId);
          collectedVideos.push(video);

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

    if (collectedVideos.length >= 6) break;
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