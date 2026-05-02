/**
 * Central constants — verified against Albion Online live data.
 *
 * Anything that lived as a one-off `const X = 0.065` inside a calculator
 * lives here so we have a single source of truth. Calculator-specific
 * details (recipe-by-recipe focus base, etc.) stay in their own files,
 * but anything cross-cutting belongs here.
 */

// ====================== TAX ======================
/** Premium player: 2.5% setup + 4% sales = 6.5% total deduction from sell price */
export const TAX_PREMIUM = 0.065;
/** Non-premium: 2.5% setup + 8% sales = 10.5% total */
export const TAX_NON_PREMIUM = 0.105;
/** Discord-style direct sale discount — sellers offer -5%, no tax */
export const DISCORD_DISCOUNT = 0.05;

// ====================== LPB / RETURN RATE ======================
/** Base local production bonus everywhere — applies to refining and crafting */
export const BASE_LPB = 18;
/** Refining-specialty city contribution to LPB (Fort Sterling=Wood, Lymhurst=Fiber, etc.) */
export const REFINE_CITY_LPB = 40;
/** Crafting-specialty city contribution to LPB (royal city item-category bonus) */
export const CRAFT_CITY_LPB = 15;
/** Focus contribution to LPB (refining and crafting both) */
export const FOCUS_LPB = 59;

// ====================== ENCHANT MULTIPLIERS ======================
/** Item value multiplier for enchant level — also drives focus cost and resource value */
export const ENCHANT_IV_MULT: Record<number, number> = {
  0: 1, 1: 2, 2: 4, 3: 8, 4: 16,
};

/** Resource (T_n) item value used for station fees and journal fame */
export const RESOURCE_ITEM_VALUE: Record<number, number> = {
  2: 4, 3: 8, 4: 16, 5: 32, 6: 64, 7: 128, 8: 256,
};

// ====================== WEIGHT ======================
/** All raw resources in Albion weigh 0.1 kg per unit */
export const RAW_WEIGHT_KG = 0.1;
/** All refined materials weigh 0.2 kg per unit */
export const REFINED_WEIGHT_KG = 0.2;
/** Equipment / meals are heavier; rough average for transport math */
export const ITEM_WEIGHT_KG = 1.0;

// ====================== STATION FEE ======================
/**
 * Default per-craft station fee (silver) used as a starting placeholder
 * when the user hasn't typed their own number. Real fees vary by item
 * value × current nutrition pricing on the station.
 */
export const DEFAULT_STATION_FEE = 300;

// ====================== TRANSPORT MOUNTS ======================
export interface TransportMount {
  id: string;
  name: string;
  /** Carry capacity in kg */
  capacity: number;
}
export const TRANSPORT_MOUNTS: TransportMount[] = [
  { id: 't4ox',   name: 'T4 Transport Ox',       capacity: 2500 },
  { id: 't5ox',   name: 'T5 Transport Ox',       capacity: 3000 },
  { id: 't6ox',   name: 'T6 Transport Ox',       capacity: 3500 },
  { id: 't7ox',   name: 'T7 Transport Ox',       capacity: 4000 },
  { id: 't8ox',   name: 'T8 Transport Ox',       capacity: 4500 },
  { id: 't5mam',  name: 'T5 Transport Mammoth',  capacity: 9000 },
  { id: 't8mam',  name: 'T8 Transport Mammoth',  capacity: 16000 },
];

// ====================== STALE DATA ======================
/** Show "stale data" warning if AODP price is older than this many hours */
export const STALE_PRICE_HOURS = 6;

// ====================== ROYAL CITIES ======================
/** Royal cities (excludes Caerleon — removed per user, also excludes Black Market). */
export const ROYAL_CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford'] as const;
export type RoyalCity = typeof ROYAL_CITIES[number];
