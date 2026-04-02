import type { MarketPrice } from '../types';

const API_BASE = 'https://europe.albion-online-data.com/api/v2/stats/prices';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: MarketPrice[];
  fetchedAt: number;
}

const priceCache = new Map<string, CacheEntry>();

export async function fetchPrices(
  itemIds: string[],
  locations: string[] = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Black Market'],
): Promise<MarketPrice[]> {
  if (itemIds.length === 0) return [];

  const cacheKey = itemIds.sort().join(',') + '|' + locations.join(',');
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // Batch in groups of 50 to stay under URL limits
  const results: MarketPrice[] = [];
  for (let i = 0; i < itemIds.length; i += 50) {
    const batch = itemIds.slice(i, i + 50);
    const url = `${API_BASE}/${batch.join(',')}.json?locations=${locations.join(',')}`;

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

  priceCache.set(cacheKey, { data: results, fetchedAt: Date.now() });
  return results;
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
