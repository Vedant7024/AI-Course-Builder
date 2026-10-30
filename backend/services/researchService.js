const videoCache = new Map();

const CACHE_MS = 1000 * 60 * 60 * 6;

// Get SearXNG URL
function getBaseUrl() {
  const base = process.env.SEARXNG_URL;

  if (!base) {
    throw new Error(
      "SEARXNG_URL is missing from backend environment variables"
    );
  }

  return base.replace(/\/+$/, "");
}

// Search SearXNG
async function searxSearch(params) {
  const url = `${getBaseUrl()}/search?${new URLSearchParams({
    ...params,
    format: "json",
  })}`;

  console.log("SearXNG request:", url);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SearXNG returned HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `SearXNG returned non-JSON response: ${contentType}`
    );
  }

  const data = await response.json();

  // Debugging: batata hai kaun sa engine fail/timeout hua
  if (
    Array.isArray(data.unresponsive_engines) &&
    data.unresponsive_engines.length > 0
  ) {
    console.warn(
      "SearXNG unresponsive engines:",
      JSON.stringify(data.unresponsive_engines)
    );
  }

  return Array.isArray(data.results)
    ? data.results
    : [];
}

// Extract YouTube video ID
function extractVideoId(url) {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname
      .replace(/^www\./, "")
      .toLowerCase();

    if (hostname === "youtu.be") {
      return parsed.pathname
        .split("/")
        .filter(Boolean)[0] || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const parts = parsed.pathname
        .split("/")
        .filter(Boolean);

      if (
        ["embed", "shorts", "live"].includes(parts[0])
      ) {
        return parts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Convert search results into YouTube videos
function pickYouTubeVideos(results) {
  const videos = [];
  const seen = new Set();

  for (const result of results) {
    // youtube engine kabhi url me aur kabhi iframe_src me link deta hai
    const videoId =
      extractVideoId(result.url || "") ||
      extractVideoId(result.iframe_src || "");

    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);

    videos.push({
      title: result.title || "YouTube tutorial",

      url: `https://www.youtube.com/watch?v=${videoId}`,

      videoId,

      thumbnail:
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,

      description: String(
        result.content || result.description || ""
      ).slice(0, 300),
    });
  }

  return videos;
}

// Fallback: YouTube Data API (sirf tab chalega jab YOUTUBE_API_KEY set ho)
async function youtubeApiSearch(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams(
    {
      part: "snippet",
      type: "video",
      maxResults: "6",
      videoEmbeddable: "true",
      q: `${query} tutorial`,
      key: apiKey,
    }
  )}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `YouTube API returned HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return (data.items || [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      title: item.snippet?.title || "YouTube tutorial",
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      videoId: item.id.videoId,
      thumbnail: `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
      description: String(
        item.snippet?.description || ""
      ).slice(0, 300),
    }));
}

// Search YouTube videos
async function searchYouTubeVideos(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    return [];
  }

  const cacheKey = cleanQuery.toLowerCase();

  // Return cached results
  const cached = videoCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.at < CACHE_MS
  ) {
    console.log("Returning cached YouTube videos");

    return cached.data;
  }

  const shortQuery = cleanQuery
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  // Search directly using YouTube engine first
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

    {
      q: `${shortQuery} youtube`,
      language: "en",
    },
  ];

  const found = [];
  const seenIds = new Set();

  for (const params of attempts) {
    try {
      console.log(
        "Searching YouTube:",
        params.q
      );

      const results = await searxSearch(params);

      const videos = pickYouTubeVideos(results);

      console.log(
        `Search returned ${results.length} results and ${videos.length} YouTube videos`
      );

      for (const video of videos) {
        if (!seenIds.has(video.videoId)) {
          seenIds.add(video.videoId);

          found.push(video);
        }
      }

      if (found.length >= 3) {
        break;
      }
    } catch (error) {
      console.error(
        "YouTube search error:",
        error.message
      );
    }
  }

  // SearXNG se kuch na mile to YouTube API (agar key set ho) try karo
  if (found.length === 0) {
    try {
      const apiVideos = await youtubeApiSearch(shortQuery);

      console.log(
        `YouTube API fallback returned ${apiVideos.length} videos`
      );

      for (const video of apiVideos) {
        if (!seenIds.has(video.videoId)) {
          seenIds.add(video.videoId);

          found.push(video);
        }
      }
    } catch (error) {
      console.error(
        "YouTube API fallback error:",
        error.message
      );
    }
  }

  const finalVideos = found.slice(0, 6);

  // Cache successful results only
  if (finalVideos.length > 0) {
    videoCache.set(cacheKey, {
      at: Date.now(),
      data: finalVideos,
    });
  }

  console.log(
    `Final YouTube video count: ${finalVideos.length}`
  );

  return finalVideos;
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

  return results.slice(0, 6).map((result) => ({
    title: result.title || "",
    url: result.url || "",
    content: String(
      result.content || ""
    ).slice(0, 300),
  }));
}

module.exports = {
  searchResearch,
  searchYouTubeVideos,
};