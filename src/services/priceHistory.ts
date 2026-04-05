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
    const res = await fetch(url);
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
