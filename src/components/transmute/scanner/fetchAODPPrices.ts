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
  filledCells: number;
  totalCells: number;
  city: string;
  fetchedAt: number;
}

/**
 * Fetch raw resource prices for one city and merge them into the current
 * PriceBook. Cells where AODP has no data keep their existing manual value.
 * Returns the new PriceBook plus a summary of how many cells got filled.
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

  const prices: MarketPrice[] = await fetchPrices(itemIds, [city], /* allQualities */ false);
  const cellByItem = indexByItemQuality1(prices, city);

  // Build the new price book — start from the existing one so unaffected
  // cells (no AODP data) keep their manual entries.
  const next: PriceBook = structuredClone(current);
  let filledCells = 0;

  for (const id of itemIds) {
    const cell = idToCell.get(id);
    if (!cell) continue;

    const aodp = cellByItem.get(id);
    if (!aodp) continue;

    const sell = aodp.sell_price_min > 0 ? String(aodp.sell_price_min) : '';
    const buy  = aodp.buy_price_max  > 0 ? String(aodp.buy_price_max)  : '';

    if (!sell && !buy) continue;

    const existing: OrderBookPrice = next[cell.resource][cell.level] ?? { buyOrder: '', sellOrder: '' };
    next[cell.resource][cell.level] = {
      // Prefer AODP value when it has one; fall back to whatever the user
      // had previously entered.
      sellOrder: sell || existing.sellOrder,
      buyOrder:  buy  || existing.buyOrder,
    };
    filledCells += 1;
  }

  return {
    priceBook: next,
    result: {
      filledCells,
      totalCells: itemIds.length,
      city,
      fetchedAt: Date.now(),
    },
  };
}

/** Map item_id → quality-1 row for the requested city. */
function indexByItemQuality1(prices: MarketPrice[], city: string): Map<string, MarketPrice> {
  const map = new Map<string, MarketPrice>();
  for (const p of prices) {
    if (p.city !== city) continue;
    if (p.quality !== 1) continue;
    // Some entries duplicate; keep the freshest one.
    const existing = map.get(p.item_id);
    if (!existing) {
      map.set(p.item_id, p);
      continue;
    }
    const existingDate = Date.parse(existing.sell_price_min_date || existing.buy_price_max_date || '');
    const incomingDate = Date.parse(p.sell_price_min_date || p.buy_price_max_date || '');
    if (Number.isFinite(incomingDate) && incomingDate > existingDate) {
      map.set(p.item_id, p);
    }
  }
  return map;
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
