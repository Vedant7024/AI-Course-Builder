
const videoCache = new Map();
const CACHE_MS = 6 * 60 * 60 * 1000;

function getBaseUrl() {
  const base = process.env.SEARXNG_URL;

  if (!base) {
    throw new Error("SEARXNG_URL is missing in backend/.env");
  }

  return base.replace(/\/+$/, "");
}

async function searxSearch(params) {
  const url = `${getBaseUrl()}/search?${new URLSearchParams({
    ...params,
    format: "json",
  })}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`SearXNG HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(`SearXNG returned ${contentType}`);
  }

  const data = await response.json();

  if (data.unresponsive_engines?.length) {
    console.warn("Unresponsive engines:", data.unresponsive_engines);
  }

  return Array.isArray(data.results) ? data.results : [];
}

function extractVideoId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

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

    return null;
  } catch {
    return null;
  }
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
      title: result.title || "YouTube tutorial",
      url: `https://www.youtube.com/watch?v=${id}`,
      videoId: id,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      description: String(
        result.content || result.description || ""
      ).slice(0, 300),
    });
  }

  return videos;
}

async function youtubeApiSearch(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) return [];

  const url = `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "10",
    videoEmbeddable: "true",
    q: `${query} tutorial`,
    key: apiKey,
  })}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`YouTube API HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.items || [])
    .filter((item) => item.id?.videoId)
    .map((item) => {
      const id = item.id.videoId;

      return {
        title: item.snippet?.title || "YouTube tutorial",
        url: `https://www.youtube.com/watch?v=${id}`,
        videoId: id,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        description: String(item.snippet?.description || "").slice(0, 300),
      };
    });
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
  const found = [];
  const seen = new Set();

  const attempts = [
    {
      q: `${cleanQuery} tutorial`,
      engines: "youtube",
      categories: "videos",
      language: "en",
    },
    {
      q: shortQuery,
      engines: "youtube",
      categories: "videos",
      language: "en",
    },
    {
      q: `site:youtube.com/watch ${cleanQuery} tutorial`,
      language: "en",
    },
  ];

  for (const params of attempts) {
    try {
      console.log("Searching YouTube:", params.q);

      const results = await searxSearch(params);
      const videos = pickYouTubeVideos(results);

      console.log("SearXNG results:", results.length);
      console.log("Extracted videos:", videos.length);

      for (const video of videos) {
        if (!seen.has(video.videoId)) {
          seen.add(video.videoId);
          found.push(video);
        }
      }

      if (found.length >= 6) break;
    } catch (error) {
      console.error("SearXNG search failed:", error.message);
    }
  }

  if (found.length < 3) {
    try {
      const apiVideos = await youtubeApiSearch(shortQuery);

      for (const video of apiVideos) {
        if (!seen.has(video.videoId)) {
          seen.add(video.videoId);
          found.push(video);
        }
      }
    } catch (error) {
      console.error("YouTube API failed:", error.message);
    }
  }

  const finalVideos = found.slice(0, 6);

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
