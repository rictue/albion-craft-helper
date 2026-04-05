import type { MarketPrice } from '../types';

export type AlbionServer = 'europe' | 'west' | 'east';

const SERVER_URLS: Record<AlbionServer, string> = {
  europe: 'https://europe.albion-online-data.com/api/v2/stats/prices',
  west: 'https://west.albion-online-data.com/api/v2/stats/prices',
  east: 'https://east.albion-online-data.com/api/v2/stats/prices',
};

const STORAGE_KEY = 'albion-server';

export function getServer(): AlbionServer {
  return (localStorage.getItem(STORAGE_KEY) as AlbionServer) || 'europe';
}

export function setServer(server: AlbionServer): void {
  localStorage.setItem(STORAGE_KEY, server);
  clearPriceCache();
}

function getApiBase(): string {
  return SERVER_URLS[getServer()];
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LS_CACHE_KEY = 'albion-price-cache-v2';
const LS_CACHE_MAX_ENTRIES = 40; // cap to avoid localStorage quota issues

interface CacheEntry {
  data: MarketPrice[];
  fetchedAt: number;
}

const priceCache = new Map<string, CacheEntry>();

// Hydrate from localStorage on module load
try {
  const raw = localStorage.getItem(LS_CACHE_KEY);
  if (raw) {
    const parsed: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.fetchedAt && now - v.fetchedAt < CACHE_TTL) {
        priceCache.set(k, v);
      }
    }
  }
} catch {}

function persistCache() {
  try {
    // Keep only N most recent entries to stay under quota
    const entries = [...priceCache.entries()].sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, LS_CACHE_MAX_ENTRIES);
    const obj: Record<string, CacheEntry> = {};
    for (const [k, v] of entries) obj[k] = v;
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Quota exceeded - drop half
    const entries = [...priceCache.entries()].sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, LS_CACHE_MAX_ENTRIES / 2);
    priceCache.clear();
    for (const [k, v] of entries) priceCache.set(k, v);
    try {
      const obj: Record<string, CacheEntry> = {};
      for (const [k, v] of entries) obj[k] = v;
      localStorage.setItem(LS_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }
}

// Track last fetch time for UI display
let lastFetchTime: number | null = null;
export function getLastFetchTime(): number | null { return lastFetchTime; }

// Clear cache to force fresh fetch
export function clearPriceCache(): void {
  priceCache.clear();
  try { localStorage.removeItem(LS_CACHE_KEY); } catch {}
}

// In-flight request deduplication: if the same cacheKey is already being fetched,
// subsequent callers get the same promise instead of firing a parallel request.
const inFlight = new Map<string, Promise<MarketPrice[]>>();

export async function fetchPrices(
  itemIds: string[],
  locations: string[] = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Black Market'],
  allQualities = false,
  forceRefresh = false,
): Promise<MarketPrice[]> {
  if (itemIds.length === 0) return [];

  const qualityParam = allQualities ? '' : '&qualities=1';
  const cacheKey = itemIds.slice().sort().join(',') + '|' + locations.join(',') + qualityParam;
  const cached = priceCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // If an identical request is already in flight, return its promise
  const existing = inFlight.get(cacheKey);
  if (existing && !forceRefresh) return existing;

  const promise = (async () => {
    // Batch in groups of 50 to stay under URL limits
    const results: MarketPrice[] = [];
    for (let i = 0; i < itemIds.length; i += 50) {
      const batch = itemIds.slice(i, i + 50);
      const url = `${getApiBase()}/${batch.join(',')}.json?locations=${locations.join(',')}${qualityParam}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data: MarketPrice[] = await response.json();
        results.push(...data);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        // Return stale cache if available
        if (cached) return cached.data;
      }
    }

    const now = Date.now();
    priceCache.set(cacheKey, { data: results, fetchedAt: now });
    lastFetchTime = now;
    persistCache();
    return results;
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

export function buildPriceMap(prices: MarketPrice[], city: string, useBlackMarketBuyPrice = false): Map<string, number> {
  const map = new Map<string, number>();

  for (const price of prices) {
    if (price.city !== city) continue;

    // On Black Market, use buy_price_max (players sell TO buy orders)
    if (useBlackMarketBuyPrice && city === 'Black Market') {
      if (price.buy_price_max > 0) {
        const existing = map.get(price.item_id);
        if (!existing || price.buy_price_max > existing) {
          map.set(price.item_id, price.buy_price_max);
        }
      }
    } else {
      if (price.sell_price_min > 0) {
        const existing = map.get(price.item_id);
        if (!existing || price.sell_price_min < existing) {
          map.set(price.item_id, price.sell_price_min);
        }
      }
    }
  }

  return map;
}

export function getBuyPrice(prices: MarketPrice[], itemId: string, city: string): number {
  const matching = prices.filter(p => p.item_id === itemId && p.city === city && p.sell_price_min > 0);
  if (matching.length === 0) return 0;
  return Math.min(...matching.map(p => p.sell_price_min));
}

export function getSellPrice(prices: MarketPrice[], itemId: string, city: string): number {
  const matching = prices.filter(p => p.item_id === itemId && p.city === city && p.sell_price_min > 0);
  if (matching.length === 0) return 0;
  return Math.min(...matching.map(p => p.sell_price_min));
}
