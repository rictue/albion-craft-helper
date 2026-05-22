/**
 * Steam Community Announcements client.
 *
 * SBI posts every patch note + dev talk + sale to Steam's
 * announcements feed (appid 761890). This is the canonical
 * machine-readable source — Valve runs the ISteamNews API expressly
 * for third-party consumers, so unlike scraping albiononline.com we're
 * working through a publicly sanctioned channel.
 *
 * Steam Web API does not set CORS headers, so requests go through the
 * same proxy chain we use for gameinfo.
 */

const ALBION_STEAM_APPID = 761890;

const STEAM_NEWS_URL =
  `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${ALBION_STEAM_APPID}&count=15&format=json`;

const CORS_PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

export interface NewsItem {
  /** Steam unique announcement id, used as React key. */
  gid: string;
  title: string;
  /** Steam announcement URL — what "Read more" links to. */
  url: string;
  author: string;
  /** Unix milliseconds. */
  dateMs: number;
  /** Short plain-text excerpt for the card preview (~200 chars). */
  excerpt: string;
  /** First image found in the BBCode contents, or null. */
  thumbnail: string | null;
  /** Heuristic flag — is this a patch / dev-talk / hotfix? Drives a
   *  badge on the card so the user can spot patch notes vs sales. */
  kind: 'patch' | 'dev' | 'event' | 'sale' | 'other';
}

interface SteamNewsResponse {
  appnews?: {
    newsitems?: Array<{
      gid: string;
      title: string;
      url: string;
      author: string;
      contents: string;
      /** Seconds. */
      date: number;
    }>;
  };
}

const CACHE_KEY = 'albion-steam-news-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

interface CacheShape {
  fetchedAt: number;
  items: NewsItem[];
}

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(items: NewsItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    // Quota or unavailable — in-memory only.
  }
}

/**
 * Strip Steam BBCode down to a plain-text excerpt and pull the first
 * image URL out for use as a card thumbnail. We don't do full BBCode
 * rendering on the card — that lives in the popup / external Steam
 * page. Excerpt is capped to ~280 chars at a word boundary.
 */
export function parseBbcode(contents: string): { excerpt: string; thumbnail: string | null } {
  // 1. Find the first [img]URL[/img]. Steam announcements lead with a
  //    hero image roughly 1200×675, perfect for our card thumbnail.
  let thumbnail: string | null = null;
  const imgMatch = contents.match(/\[img\](.+?)\[\/img\]/i);
  if (imgMatch) {
    let url = imgMatch[1].trim();
    // Protocol-relative URLs like //assets.albiononline.com/... need https://
    if (url.startsWith('//')) url = 'https:' + url;
    thumbnail = url;
  }

  // 2. Strip BBCode to plain text. Handle the tags that actually appear
  //    in SBI's announcements; anything we miss becomes harmless empty
  //    string via the catch-all at the end.
  let text = contents;
  // Drop img tags entirely (already captured the thumbnail).
  text = text.replace(/\[img\].+?\[\/img\]/gi, '');
  // YouTube embed → drop.
  text = text.replace(/\[previewyoutube=.+?\]\[\/previewyoutube\]/gi, '');
  // [url=link]text[/url] → keep the visible text only.
  text = text.replace(/\[url=[^\]]+\](.+?)\[\/url\]/gi, '$1');
  // Headings, bold, italic, lists — strip the markers, keep contents.
  text = text.replace(/\[\/?(b|i|u|h1|h2|h3|h4|list|olist|noparse|spoiler|quote|code|table|tr|th|td|sub|sup)\]/gi, ' ');
  // [*] list bullets → bullet character.
  text = text.replace(/\[\*\]/g, '• ');
  // Any remaining single-bracket tags (catch-all).
  text = text.replace(/\[[^\]]+\]/g, ' ');
  // Collapse whitespace.
  text = text.replace(/\s+/g, ' ').trim();

  // 3. Trim to a word boundary near 280 chars so the excerpt looks
  //    natural in the card.
  const MAX = 280;
  if (text.length > MAX) {
    const cut = text.slice(0, MAX);
    const lastSpace = cut.lastIndexOf(' ');
    text = (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  return { excerpt: text, thumbnail };
}

/** Best-effort classification of an announcement based on its title.
 *  We use simple keyword matching — false positives are harmless
 *  because the badge is purely cosmetic. */
function classifyKind(title: string): NewsItem['kind'] {
  const lower = title.toLowerCase();
  if (lower.includes('patch') || lower.includes('hotfix') || lower.includes('balance')) return 'patch';
  if (lower.includes('dev talk') || lower.includes('dev update') || lower.includes('roadmap')) return 'dev';
  if (lower.includes('sale') || lower.includes('discount') || lower.includes('vanity')) return 'sale';
  if (lower.includes('event') || lower.includes('season') || lower.includes('challenge') || lower.includes('giveaway')) return 'event';
  return 'other';
}

async function fetchSteamNewsRaw(): Promise<SteamNewsResponse | null> {
  for (const buildUrl of CORS_PROXIES) {
    try {
      const res = await fetch(buildUrl(STEAM_NEWS_URL), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text) continue;
      try {
        return JSON.parse(text) as SteamNewsResponse;
      } catch {
        continue;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Public entrypoint used by the dashboard panel. Stale-while-revalidate:
 *  if the cache is fresh (<1h) it returns immediately; otherwise it
 *  refetches and updates. On failure, it returns whatever cache exists
 *  rather than blanking the panel out. */
export async function fetchAlbionNews(force = false): Promise<{ items: NewsItem[]; fetchedAt: number; stale: boolean }> {
  const cached = readCache();
  const now = Date.now();
  const cacheFresh = cached && (now - cached.fetchedAt) < CACHE_TTL_MS;

  if (cacheFresh && !force) {
    return { items: cached!.items, fetchedAt: cached!.fetchedAt, stale: false };
  }

  const raw = await fetchSteamNewsRaw();
  if (!raw || !raw.appnews?.newsitems) {
    // Network or parse failure — return cache if we have any, else empty.
    if (cached) return { items: cached.items, fetchedAt: cached.fetchedAt, stale: true };
    return { items: [], fetchedAt: 0, stale: true };
  }

  const items: NewsItem[] = raw.appnews.newsitems.map((n) => {
    const { excerpt, thumbnail } = parseBbcode(n.contents ?? '');
    return {
      gid: n.gid,
      title: n.title,
      url: n.url,
      author: n.author,
      dateMs: n.date * 1000,
      excerpt,
      thumbnail,
      kind: classifyKind(n.title),
    };
  });

  writeCache(items);
  return { items, fetchedAt: now, stale: false };
}
