/**
 * Auto-fill the scanner's PriceBook from the Albion Online Data Project.
 *
 * The scanner stores prices per (resource, tier.enchant) pair. AODP serves
 * them by Albion item ID, so we map our display labels to the in-game item
 * IDs and fetch one batch for the selected city.
 *
 * Coverage caveats:
 *  - AODP is community-uploaded. Niche tier+enchant slices can be 5min..6h
 *    stale or missing entirely. We leave existing manual entries untouched
 *    when AODP returns 0 / no data.
 *  - Raw resources are quality 1 (Normal). Higher qualities don't apply.
 *  - Caerleon is intentionally excluded from the city list per repo
 *    convention.
 */

import { fetchPrices, getServer } from '../../../services/api';
import type { MarketPrice } from '../../../types';

const HISTORY_HOSTS: Record<string, string> = {
  europe: 'https://europe.albion-online-data.com',
  west:   'https://west.albion-online-data.com',
  east:   'https://east.albion-online-data.com',
};
import { RESOURCE_TYPES, TIER_LABELS } from './calculations';
import type { OrderBookPrice, PriceBook, ResourceType } from './types';

const RESOURCE_TO_FAMILY: Record<ResourceType, string> = {
  'Wood / Logs': 'WOOD',
  'Ore':         'ORE',
  'Fiber':       'FIBER',
  'Hide':        'HIDE',
  'Stone':       'ROCK',
};

// The 5 royal cities. The in-game "Market Value" is the average trade price
// across the Royal Continent — these cities, never the Black Market. We
// average their sell prices to reproduce that est. value.
const ROYAL_CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford'] as const;

/** Per resource → per tier.enchant → est. market value (avg sell across the
 *  5 royal cities, Black Market excluded). */
export type EstValueBook = Record<ResourceType, Record<string, number>>;

/**
 * Build the Albion item ID for a raw resource at a given tier+enchant.
 *
 * Examples:
 *   ('Wood / Logs', '4.0') → 'T4_WOOD'
 *   ('Wood / Logs', '5.3') → 'T5_WOOD_LEVEL3@3'
 *   ('Stone',       '8.4') → 'T8_ROCK_LEVEL4@4'
 */
export function buildResourceItemId(resource: ResourceType, level: string): string {
  const family = RESOURCE_TO_FAMILY[resource];
  const [tier, enchant] = level.split('.');
  if (enchant === '0' || enchant === undefined) {
    return `T${tier}_${family}`;
  }
  return `T${tier}_${family}_LEVEL${enchant}@${enchant}`;
}

export interface FetchResult {
  filledSells: number;
  filledBuys: number;
  totalCells: number;
  city: string;
  fetchedAt: number;
  /** AODP-side staleness summary across the cells we filled. */
  staleness?: {
    /** Age in ms of the oldest AODP value we used. */
    oldestAgeMs: number;
    /** Age in ms of the freshest AODP value we used. */
    freshestAgeMs: number;
    /** Median age in ms across the cells we filled. */
    medianAgeMs: number;
    /** Count of cells where data is <1h old. */
    fresh: number;
    /** Count of cells where data is 1-24h old. */
    recent: number;
    /** Count of cells where data is >24h old. */
    stale: number;
  };
}

interface MergedQuote {
  sell: number;
  buy: number;
  sellDate: number;
  buyDate: number;
}

/**
 * Fetch raw resource prices for one city and merge them into the current
 * PriceBook. Cells where AODP has no data keep their existing manual value.
 *
 * AODP coverage notes:
 *  - Sell orders are far more common in uploads than buy orders, so any
 *    given fetch typically fills more sell cells than buy cells. That is
 *    a property of the dataset, not a bug.
 *  - We pass forceRefresh so the in-app 30s cache doesn't keep handing
 *    back the same (possibly incomplete) snapshot.
 *  - We pass allQualities=true and merge sell/buy independently from
 *    every returned row, so a missing quality-1 row but a populated
 *    quality-0 row still fills the cell.
 */
export async function fetchScannerPrices(
  current: PriceBook,
  city: string,
): Promise<{ priceBook: PriceBook; estValue: EstValueBook; result: FetchResult }> {
  const itemIds: string[] = [];
  const idToCell = new Map<string, { resource: ResourceType; level: string }>();

  for (const resource of RESOURCE_TYPES) {
    for (const level of TIER_LABELS) {
      const id = buildResourceItemId(resource, level);
      itemIds.push(id);
      idToCell.set(id, { resource, level });
    }
  }

  // Fetch the selected city (for the scanner grid) PLUS every royal city, so
  // we can compute the Royal-Continent average ("est. market value").
  const cities = Array.from(new Set<string>([city, ...ROYAL_CITIES]));
  const prices: MarketPrice[] = await fetchPrices(
    itemIds,
    cities,
    /* allQualities */ true,
    /* forceRefresh */ true,
  );
  const quoteByItem = mergeQuotes(prices, city);

  // Build the new price book — start from the existing one so unaffected
  // cells (no AODP data) keep their manual entries.
  const next: PriceBook = structuredClone(current);
  let filledSells = 0;
  let filledBuys = 0;
  const ages: number[] = [];
  const now = Date.now();

  for (const id of itemIds) {
    const cell = idToCell.get(id);
    if (!cell) continue;

    const aodp = quoteByItem.get(id);
    if (!aodp) continue;

    const existing: OrderBookPrice = next[cell.resource][cell.level] ?? { buyOrder: '', sellOrder: '' };
    let sellOrder = existing.sellOrder;
    let buyOrder = existing.buyOrder;
    let sellDate = existing.sellDate;
    let buyDate  = existing.buyDate;
    let sellConfirmedAt = existing.sellConfirmedAt;
    let buyConfirmedAt  = existing.buyConfirmedAt;
    const nowIso = new Date(now).toISOString();

    // Fetch is authoritative — it always pulls fresh AODP, overwriting any
    // prior value (including a manual edit). Manual edits apply only until
    // the next fetch, which is the behaviour the user wants: type to
    // override now, fetch to snap back to live market data.
    if (aodp.sell > 0) {
      sellOrder = String(aodp.sell);
      sellDate = aodp.sellDate > 0 ? new Date(aodp.sellDate).toISOString() : undefined;
      // We just confirmed this side via fetch — overrides any stale AODP
      // *_date that came from the dedup pipeline.
      sellConfirmedAt = nowIso;
      filledSells += 1;
      if (aodp.sellDate > 0) ages.push(now - aodp.sellDate);
    }
    if (aodp.buy > 0) {
      buyOrder = String(aodp.buy);
      buyDate = aodp.buyDate > 0 ? new Date(aodp.buyDate).toISOString() : undefined;
      buyConfirmedAt = nowIso;
      filledBuys += 1;
      if (aodp.buyDate > 0) ages.push(now - aodp.buyDate);
    }

    next[cell.resource][cell.level] = {
      sellOrder, buyOrder, sellDate, buyDate, sellConfirmedAt, buyConfirmedAt,
    };
  }

  // Est. market value = the in-game "Market Value" = the volume-weighted
  // average TRADE price across the 5 royal cities (Black Market excluded),
  // from AODP history's avg_price. NOT the sell-order average — real trades
  // settle below the ask, so the est value sits between buy and sell.
  const estValue = await fetchRoyalEstValues(itemIds, idToCell);

  return {
    priceBook: next,
    estValue,
    result: {
      filledSells,
      filledBuys,
      totalCells: itemIds.length,
      city,
      fetchedAt: now,
      staleness: ages.length > 0 ? summarizeAges(ages) : undefined,
    },
  };
}

/**
 * Volume-weighted average trade price across the royal cities, per item,
 * from AODP history (avg_price × item_count). This is what the in-game
 * "Market Value" estimates. Batched; failures degrade to a partial book
 * (the chain panel then falls back to the sell-order price for missing
 * cells). Quality 1 only (raw resources).
 */
async function fetchRoyalEstValues(
  itemIds: string[],
  idToCell: Map<string, { resource: ResourceType; level: string }>,
): Promise<EstValueBook> {
  const book = RESOURCE_TYPES.reduce((b, r) => { b[r] = {}; return b; }, {} as EstValueBook);
  const base = HISTORY_HOSTS[getServer()] || HISTORY_HOSTS.europe;
  const royal = new Set<string>(ROYAL_CITIES);

  for (let i = 0; i < itemIds.length; i += 50) {
    const batch = itemIds.slice(i, i + 50);
    const url = `${base}/api/v2/stats/history/${batch.join(',')}?locations=${ROYAL_CITIES.join(',')}&time-scale=24`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json() as Array<{ location: string; item_id: string; quality: number; data: Array<{ timestamp: string; avg_price: number; item_count: number }> }>;
      // Collect daily points per item across royal cities. Two reasons we
      // align by CALENDAR day rather than array position: (1) cities upload
      // different numbers of days, so `slice(-7)` per city mixes date ranges;
      // (2) we then collapse each day to one volume-weighted price and take
      // the MEDIAN across the last 7 days.
      //
      // Median, not mean: raw-resource prices are volatile — within a week the
      // same hide trades at 35k and 30k. A volume-weighted mean gets dragged
      // toward whichever spike day had the most volume; the median ignores the
      // extreme days and returns the "typical day" price, which is both more
      // stable and closer to the in-game 7-day average.
      const pts = new Map<string, Map<string, { wsum: number; vol: number }>>();
      for (const entry of data) {
        if (entry.quality !== 1 || !royal.has(entry.location)) continue;
        for (const p of entry.data) {
          if (p.avg_price > 0 && p.item_count > 0 && p.timestamp) {
            const day = p.timestamp.slice(0, 10);
            const byDay = pts.get(entry.item_id) ?? new Map();
            const acc = byDay.get(day) ?? { wsum: 0, vol: 0 };
            acc.wsum += p.avg_price * p.item_count;
            acc.vol += p.item_count;
            byDay.set(day, acc);
            pts.set(entry.item_id, byDay);
          }
        }
      }
      for (const [id, byDay] of pts) {
        const cell = idToCell.get(id);
        if (!cell) continue;
        // One volume-weighted price per day, then median of the last 7 days.
        const dailyPrices = Array.from(byDay.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))   // oldest → newest by date
          .slice(-7)
          .map(([, acc]) => acc.wsum / acc.vol)
          .sort((a, b) => a - b);                 // ascending, for median
        if (dailyPrices.length === 0) continue;
        const mid = Math.floor(dailyPrices.length / 2);
        const median = dailyPrices.length % 2 === 0
          ? (dailyPrices[mid - 1] + dailyPrices[mid]) / 2
          : dailyPrices[mid];
        book[cell.resource][cell.level] = Math.round(median);
      }
    } catch {
      // skip this batch — chain panel falls back to sell-order price
    }
  }
  return book;
}

function summarizeAges(ages: number[]): NonNullable<FetchResult['staleness']> {
  const sorted = [...ages].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const ONE_HOUR = 3_600_000;
  const ONE_DAY = 24 * ONE_HOUR;
  let fresh = 0;
  let recent = 0;
  let stale = 0;
  for (const age of ages) {
    if (age < ONE_HOUR) fresh += 1;
    else if (age < ONE_DAY) recent += 1;
    else stale += 1;
  }
  return {
    oldestAgeMs: sorted[sorted.length - 1],
    freshestAgeMs: sorted[0],
    medianAgeMs: median,
    fresh,
    recent,
    stale,
  };
}

/**
 * AODP returns one row per (item_id, city, quality). Raw resources are
 * always quality 1 in practice, but a few uploads tag them quality 0, so
 * we accept any quality and merge sell/buy independently — keeping the
 * freshest non-zero value for each side. That fixes the "buy orders not
 * pulled" case where one row had the sell side and a different row had
 * the buy side.
 */
function mergeQuotes(prices: MarketPrice[], city: string): Map<string, MergedQuote> {
  const map = new Map<string, MergedQuote>();
  for (const p of prices) {
    if (p.city !== city) continue;
    const current = map.get(p.item_id) ?? { sell: 0, buy: 0, sellDate: 0, buyDate: 0 };

    const sellDate = parseDate(p.sell_price_min_date);
    const buyDate = parseDate(p.buy_price_max_date);

    if (p.sell_price_min > 0 && sellDate >= current.sellDate) {
      current.sell = p.sell_price_min;
      current.sellDate = sellDate;
    }
    if (p.buy_price_max > 0 && buyDate >= current.buyDate) {
      current.buy = p.buy_price_max;
      current.buyDate = buyDate;
    }

    map.set(p.item_id, current);
  }
  return map;
}

function parseDate(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Cities the scanner can auto-fill. Caerleon excluded per repo convention. */
export const SCANNER_CITIES = [
  'Bridgewatch',
  'Fort Sterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Black Market',
] as const;

export type ScannerCity = typeof SCANNER_CITIES[number];
