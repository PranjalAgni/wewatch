// YouTube Data API v3 search, with a small in-memory cache.
// Each search costs 100 quota units (default quota: 10,000/day), so repeated
// queries are served from the cache.

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const MAX_RESULTS = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export class YouTubeSearchError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const cache = new Map(); // normalized query -> { expiresAt, results }

// The API returns titles with HTML entities (e.g. &amp;, &#39;).
function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function toResult(item) {
  const { snippet } = item;
  const thumbs = snippet.thumbnails ?? {};
  return {
    videoId: item.id.videoId,
    title: decodeEntities(snippet.title ?? ""),
    channelTitle: decodeEntities(snippet.channelTitle ?? ""),
    thumbnailUrl: (thumbs.medium ?? thumbs.default ?? thumbs.high)?.url ?? null,
  };
}

export async function searchVideos(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YouTubeSearchError("YouTube search is not configured", 503);
  }

  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: String(MAX_RESULTS),
    q: query.trim(),
    key: apiKey,
  }).toString();

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    throw new YouTubeSearchError(`YouTube search request failed: ${error.message}`, 502);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const reason = body?.error?.message ?? `status ${response.status}`;
    console.error("YouTube search failed:", reason);
    throw new YouTubeSearchError("YouTube search failed", 502);
  }

  const data = await response.json();
  const results = (data.items ?? [])
    .filter((item) => item?.id?.videoId && item.snippet)
    .map(toResult);

  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  return results;
}
