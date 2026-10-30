function getBaseUrl() {
  const base = process.env.SEARXNG_URL;
  if (!base) throw new Error("SEARXNG_URL is missing from environment variables");
  return base.replace(/\/$/, "");
}

async function searxSearch(params) {
  const url = `${getBaseUrl()}/search?${new URLSearchParams({
    ...params,
    format: "json",
  })}`;

  // Render free plan pe SearXNG sleep ho jata hai, isliye lamba timeout
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) {
    throw new Error(`SearXNG returned HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

async function searchResearch(topic) {
  const results = await searxSearch({ q: topic, language: "en" });

  return results.slice(0, 6).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: (r.content || "").slice(0, 300),
  }));
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

const videoCache = new Map(); // query -> { at, data }
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 ghante

async function searchYouTubeVideos(query) {
  const key = query.trim().toLowerCase();
  const hit = videoCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  let results = [];
  try {
    // general category: sirf kaam karne wale engines use hote hain
    results = await searxSearch({
      q: `${query} tutorial youtube`,
      language: "en",
    });
  } catch (err) {
    console.warn("Video search failed:", err.message);
    return []; // 500 mat do, bas khali list
  }

  const seen = new Set();
  const videos = results
    .filter((r) => /youtube\.com\/watch|youtu\.be\//.test(r.url || ""))
    .map((r) => {
      const videoId = extractVideoId(r.url);
      return {
        title: r.title || "",
        url: r.url,
        videoId,
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
      };
    })
    .filter((v) => v.videoId && !seen.has(v.videoId) && seen.add(v.videoId))
    .slice(0, 6);

  if (videos.length) videoCache.set(key, { at: Date.now(), data: videos });
  return videos;
}

module.exports = { searchResearch, searchYouTubeVideos };