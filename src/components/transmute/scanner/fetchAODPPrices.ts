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

import { fetchPrices } from '../../../services/api';
import type { MarketPrice } from '../../../types';
import { RESOURCE_TYPES, TIER_LABELS } from './calculations';
import type { OrderBookPrice, PriceBook, ResourceType } from './types';

const RESOURCE_TO_FAMILY: Record<ResourceType, string> = {
  'Wood / Logs': 'WOOD',
  'Ore':         'ORE',
  'Fiber':       'FIBER',
  'Hide':        'HIDE',
  'Stone':       'ROCK',
};

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
): Promise<{ priceBook: PriceBook; result: FetchResult }> {
  const itemIds: string[] = [];
  const idToCell = new Map<string, { resource: ResourceType; level: string }>();

  for (const resource of RESOURCE_TYPES) {
    for (const level of TIER_LABELS) {
      const id = buildResourceItemId(resource, level);
      itemIds.push(id);
      idToCell.set(id, { resource, level });
    }
  }

  const prices: MarketPrice[] = await fetchPrices(
    itemIds,
    [city],
    /* allQualities */ true,
    /* forceRefresh */ true,
  );
  const quoteByItem = mergeQuotes(prices, city);

  // Build the new price book — start from the existing one so unaffected
  // cells (no AODP data) keep their manual entries.
  const next: PriceBook = structuredClone(current);
  let filledSells = 0;
  let filledBuys = 0;

  for (const id of itemIds) {
    const cell = idToCell.get(id);
    if (!cell) continue;

    const aodp = quoteByItem.get(id);
    if (!aodp) continue;

    const existing: OrderBookPrice = next[cell.resource][cell.level] ?? { buyOrder: '', sellOrder: '' };
    let sellOrder = existing.sellOrder;
    let buyOrder = existing.buyOrder;

    if (aodp.sell > 0) {
      sellOrder = String(aodp.sell);
      filledSells += 1;
    }
    if (aodp.buy > 0) {
      buyOrder = String(aodp.buy);
      filledBuys += 1;
    }

    next[cell.resource][cell.level] = { sellOrder, buyOrder };
  }

  return {
    priceBook: next,
    result: {
      filledSells,
      filledBuys,
      totalCells: itemIds.length,
      city,
      fetchedAt: Date.now(),
    },
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
