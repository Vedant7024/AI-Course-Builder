const videoCache = new Map(); // query -> { at, data }
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 ghante

// Search results me se sirf YouTube watch links nikalo
function pickYouTubeVideos(results) {
  const seen = new Set();

  return results
    .filter((r) => /youtube\.com\/watch|youtu\.be\//.test(r.url || ""))
    .map((r) => {
      const videoId = extractVideoId(r.url);
      return {
        title: r.title || "",
        url: r.url,
        videoId,
        thumbnail: videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : null,
        description: String(r.content || "").slice(0, 300),
      };
    })
    .filter((v) => v.videoId && !seen.has(v.videoId) && seen.add(v.videoId));
}

async function searchYouTubeVideos(query) {
  const key = query.trim().toLowerCase();
  const hit = videoCache.get(key);

  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.data;
  }

  // Lamba query kam results deta hai, isliye chhota version bhi try hoga
  const shortQuery = query.trim().split(/\s+/).slice(0, 6).join(" ");

  const attempts = [
    `site:youtube.com/watch ${query} tutorial`,
    `${query} tutorial youtube`,
    `${shortQuery} youtube`,
  ];

  const found = [];
  const seenIds = new Set();
  let tried = 0;
  let failedCount = 0;
  let lastError;

  // Ek ke baad ek try karo, jab tak kam se kam 3 video na mil jayein
  for (const q of attempts) {
    tried += 1;

    try {
      const results = await searxSearch({ q, language: "en" });
      const videos = pickYouTubeVideos(results);

      console.log(
        `Video search "${q}" -> ${results.length} results, ${videos.length} YouTube`
      );

      for (const v of videos) {
        if (!seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          found.push(v);
        }
      }

      if (found.length >= 3) break;
    } catch (err) {
      failedCount += 1;
      lastError = err;
      console.warn(`Video search failed for "${q}":`, err.message);

      // Do baar fail ho chuka to aur try karna bekar hai
      if (failedCount >= 2) break;
    }
  }

  // Har search fail hui ho to asli error batao, "No videos found" nahi
  if (found.length === 0 && failedCount === tried) {
    throw lastError;
  }

  const videos = found.slice(0, 6);

  // Khali result cache mat karo, warna 6 ghante tak khali hi dikhega
  if (videos.length) {
    videoCache.set(key, { at: Date.now(), data: videos });
  }

  return videos;
}

   module.exports = { searchResearch, searchYouTubeVideos };