
const videoCache = new Map();
const CACHE_MS = 6 * 60 * 60 * 1000;

function getBaseUrl() {
  const base = process.env.SEARXNG_URL;

  if (!base) {
    throw new Error("SEARXNG_URL is missing");
  }

  return base.replace(/\/+$/, "");
}

async function searxSearch(params) {
  const url = `${getBaseUrl()}/search?${new URLSearchParams({
    ...params,
    format: "json",
  })}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`SearXNG HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

function extractVideoId(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const parts = parsed.pathname.split("/").filter(Boolean);

      if (["embed", "shorts", "live"].includes(parts[0])) {
        return parts[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function pickYouTubeVideos(results) {
  const videos = [];
  const seen = new Set();

  for (const result of results) {
    const id =
      extractVideoId(result.url || "") ||
      extractVideoId(result.iframe_src || "");

    if (!id || seen.has(id)) continue;

    seen.add(id);

    videos.push({
      videoId: id,
      title: result.title || "YouTube tutorial",
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      description: String(
        result.content || result.description || ""
      ).slice(0, 300),
    });
  }

  return videos;
}

async function searchYouTubeVideos(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) return [];

  const cacheKey = cleanQuery.toLowerCase();
  const cached = videoCache.get(cacheKey);

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data;
  }

  const shortQuery = cleanQuery.split(/\s+/).slice(0, 8).join(" ");

  // One SearXNG request per search.
  const attempts = [
    {
      q: `${shortQuery} tutorial`,
      categories: "videos",
      language: "en",
    },
    {
      q: `site:youtube.com/watch ${shortQuery}`,
      language: "en",
    },
  ];

  let found = [];
  let lastError = null;

  for (const params of attempts) {
    try {
      console.log("SearXNG query:", params.q);

      const results = await searxSearch(params);
      console.log("SearXNG results:", results.length);

      found = pickYouTubeVideos(results);
      console.log("Extracted YouTube videos:", found.length);

      if (found.length > 0) break;
    } catch (error) {
      lastError = error;
      console.error("SearXNG search failed:", error.message);

      // Do not hammer SearXNG after rate limiting or server errors.
      if (/HTTP (429|502|503|504)/.test(error.message)) {
        break;
      }
    }
  }

  const finalVideos = found.slice(0, 6);

  // Cache only successful, non-empty results.
  if (finalVideos.length > 0) {
    videoCache.set(cacheKey, {
      at: Date.now(),
      data: finalVideos,
    });
  }

  console.log("Final YouTube videos:", finalVideos.length);

  if (finalVideos.length === 0 && lastError) {
    console.error("SearXNG could not return video results.");
  }

  return finalVideos;
}

async function searchResearch(topic) {
  const cleanTopic = String(topic || "").trim();

  if (!cleanTopic) {
    throw new Error("Research topic is required");
  }

  const results = await searxSearch({
    q: cleanTopic,
    language: "en",
  });

  return results.slice(0, 6).map((result) => ({
    title: result.title || "",
    url: result.url || "",
    content: String(result.content || "").slice(0, 300),
  }));
}

module.exports = {
  searchResearch,
  searchYouTubeVideos,
};
