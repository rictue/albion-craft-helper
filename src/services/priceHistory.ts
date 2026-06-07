import { getServer } from './api';

export interface HistoryPoint {
  timestamp: string;
  avg_price: number;
  item_count: number;
}

export interface HistorySeries {
  city: string;
  itemId: string;
  data: HistoryPoint[];
}

const SERVER_HOSTS: Record<string, string> = {
  europe: 'https://europe.albion-online-data.com',
  west:   'https://west.albion-online-data.com',
  east:   'https://east.albion-online-data.com',
};

export async function fetchPriceHistory(
  itemId: string,
  locations: string[],
  days: number = 30,
): Promise<HistorySeries[]> {
  const base = SERVER_HOSTS[getServer()] || SERVER_HOSTS.europe;
  const url = `${base}/api/v2/stats/history/${itemId}?locations=${locations.join(',')}&time-scale=24`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as Array<{ location: string; item_id: string; quality: number; data: HistoryPoint[] }>;
    const byCity = new Map<string, HistorySeries>();
    for (const entry of data) {
      if (entry.quality !== 1) continue;
      const existing = byCity.get(entry.location);
      if (existing) {
        existing.data.push(...entry.data);
      } else {
        byCity.set(entry.location, { city: entry.location, itemId: entry.item_id, data: [...entry.data] });
      }
    }
    const cutoff = Date.now() - days * 86400000;
    return [...byCity.values()].map(s => ({
      ...s,
      data: s.data
        .filter(p => new Date(p.timestamp).getTime() >= cutoff && p.avg_price > 0)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    }));
  } catch (err) {
    console.error('Price history fetch failed:', err);
    return [];
  }
}

/** The 5 royal cities — the in-game "Est. Market Value" is the trade average
 *  across these, Black Market and Caerleon excluded. */
const ROYAL_CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford'];

/**
 * Estimated market value (in-game "Est. Market Value") for a set of item IDs:
 * the median of the last 7 calendar days' volume-weighted daily trade price
 * across the royal cities. Median, not mean, so a single spiky day doesn't
 * drag the estimate — same model the transmute scanner uses. Returns a Map of
 * itemId → est value; items with no history are simply absent.
 */
export async function fetchRoyalEst(itemIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (itemIds.length === 0) return out;
  const base = SERVER_HOSTS[getServer()] || SERVER_HOSTS.europe;

  for (let i = 0; i < itemIds.length; i += 50) {
    const batch = itemIds.slice(i, i + 50);
    const url = `${base}/api/v2/stats/history/${batch.join(',')}?locations=${ROYAL_CITIES.join(',')}&time-scale=24`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json() as Array<{ location: string; item_id: string; quality: number; data: HistoryPoint[] }>;
      // Per item → per day → volume-weighted accumulator.
      const byItem = new Map<string, Map<string, { wsum: number; vol: number }>>();
      for (const entry of data) {
        if (entry.quality !== 1 || !ROYAL_CITIES.includes(entry.location)) continue;
        for (const p of entry.data) {
          if (p.avg_price > 0 && p.item_count > 0 && p.timestamp) {
            const day = p.timestamp.slice(0, 10);
            const days = byItem.get(entry.item_id) ?? new Map();
            const acc = days.get(day) ?? { wsum: 0, vol: 0 };
            acc.wsum += p.avg_price * p.item_count;
            acc.vol += p.item_count;
            days.set(day, acc);
            byItem.set(entry.item_id, days);
          }
        }
      }
      for (const [id, days] of byItem) {
        const dailyPrices = [...days.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .slice(-7)
          .map(([, acc]) => acc.wsum / acc.vol)
          .sort((a, b) => a - b);
        if (dailyPrices.length === 0) continue;
        const mid = Math.floor(dailyPrices.length / 2);
        const median = dailyPrices.length % 2 === 0
          ? (dailyPrices[mid - 1] + dailyPrices[mid]) / 2
          : dailyPrices[mid];
        out.set(id, Math.round(median));
      }
    } catch {
      // skip batch — caller falls back to market price for missing items
    }
  }
  return out;
}
