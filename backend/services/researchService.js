
const videoCache = new Map();

const CACHE_MS = 1000 * 60 * 60 * 6; // 6 hours

// Get SearXNG base URL from environment variables
function getBaseUrl() {
  const base = process.env.SEARXNG_URL;

  if (!base) {
    throw new Error(
      "SEARXNG_URL is missing from backend environment variables"
    );
  }

  return base.replace(/\/+$/, "");
}

// Search using SearXNG JSON API
async function searxSearch(params) {
  const url = `${getBaseUrl()}/search?${new URLSearchParams({
    ...params,
    format: "json",
  })}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`SearXNG returned HTTP ${res.status}`);
  }

  const data = await res.json();

  return Array.isArray(data.results) ? data.results : [];
}

// Extract YouTube video ID
function extractVideoId(url) {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be" || u.hostname.endsWith(".youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      u.hostname === "youtube.com" ||
      u.hostname.endsWith(".youtube.com")
    ) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }

      const parts = u.pathname.split("/").filter(Boolean);

      if (["embed", "shorts", "live"].includes(parts[0])) {
        return parts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Pick only valid and unique YouTube videos
function pickYouTubeVideos(results) {
  const seen = new Set();
  const videos = [];

  for (const r of results) {
    const videoId = extractVideoId(r.url || "");

    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);

    videos.push({
      title: r.title || "",
      url: r.url,
      videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      description: String(r.content || "").slice(0, 300),
    });
  }

  return videos;
}

// Search YouTube videos
async function searchYouTubeVideos(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    return [];
  }

  const key = cleanQuery.toLowerCase();

  // Check cache
  const hit = videoCache.get(key);

  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.data;
  }

  // Short query for better search results
  const shortQuery = cleanQuery
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  const attempts = [
    `site:youtube.com/watch ${cleanQuery} tutorial`,
    `${cleanQuery} tutorial youtube`,
    `${shortQuery} youtube`,
  ];

  const found = [];
  const seenIds = new Set();

  let tried = 0;
  let failedCount = 0;
  let lastError;

  // Try searches one by one
  for (const q of attempts) {
    tried++;

    try {
      const results = await searxSearch({
        q,
        language: "en",
      });

      const videos = pickYouTubeVideos(results);

      console.log(
        `Video search "${q}" -> ${results.length} results, ${videos.length} YouTube videos`
      );

      for (const video of videos) {
        if (!seenIds.has(video.videoId)) {
          seenIds.add(video.videoId);
          found.push(video);
        }
      }

      // Stop when at least 3 videos are found
      if (found.length >= 3) {
        break;
      }
    } catch (err) {
      failedCount++;
      lastError = err;

      console.warn(
        `Video search failed for "${q}":`,
        err.message
      );

      // Stop after two failed requests
      if (failedCount >= 2) {
        break;
      }
    }
  }

  // Return empty list instead of throwing a 500
  // when all video searches fail
  if (found.length === 0 && failedCount === tried) {
    console.error(
      "All YouTube searches failed:",
      lastError?.message
    );

    return [];
  }

  const videos = found.slice(0, 6);

  // Cache only successful results
  if (videos.length > 0) {
    videoCache.set(key, {
      at: Date.now(),
      data: videos,
    });
  }

  return videos;
}

// Research search for course generation
async function searchResearch(topic) {
  const cleanTopic = String(topic || "").trim();

  if (!cleanTopic) {
    throw new Error("Research topic is required");
  }

  const results = await searxSearch({
    q: cleanTopic,
    language: "en",
  });

  return results.slice(0, 6).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: String(r.content || "").slice(0, 300),
  }));
}

module.exports = {
  searchResearch,
  searchYouTubeVideos,
};
