async function searchResearch(topic) {
  const baseUrl = process.env.SEARXNG_URL;

  if (!baseUrl) {
    console.warn("SearXNG_URL is not configured. Research skipped.");
    return [];
  }

  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", `${topic} tutorial documentation`);
  url.searchParams.set("format", "json");
  url.searchParams.set("safesearch", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SearXNG returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.results)) {
      throw new Error("Invalid SearXNG response.");
    }

    return data.results
      .filter((item) => item.title && item.url)
      .slice(0, 6)
      .map((item) => ({
        title: String(item.title).slice(0, 250),
        url: String(item.url).slice(0, 2000),
        content: String(item.content || "").slice(0, 800),
      }));
  } catch (error) {
    console.error("Research search failed:", error.message);
    throw new Error(
      "Web research failed. Check your SearXNG URL and JSON API settings."
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function searchYouTubeVideos(topic) {
  const baseUrl = process.env.SEARXNG_URL;

  if (!baseUrl) {
    throw new Error("SEARXNG_URL is missing from backend .env");
  }

  const url = new URL("/search", baseUrl);

  url.searchParams.set(
    "q",
    `site:youtube.com/watch ${topic} tutorial`
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("safesearch", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.results)) {
    throw new Error("Invalid YouTube search response.");
  }

  return data.results
    .filter(
      (item) =>
        item.title &&
        item.url &&
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/.test(
          item.url
        )
    )
    .slice(0, 5)
    .map((item) => ({
      title: String(item.title).slice(0, 250),
      url: item.url,
      description: String(item.content || "").slice(0, 500),
    }));
}

module.exports = { searchResearch, searchYouTubeVideos };