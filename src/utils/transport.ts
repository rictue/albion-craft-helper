/**
 * Transport helpers — shared by pages that reason about moving items between
 * locations (MarketFlipper, BMRunner). Keep the mount list and weight estimates
 * in one place so both pages stay consistent.
 */

export interface MountOption {
  id: string;
  name: string;
  capacity: number; // carry capacity in kg
}

export const TRANSPORT_MOUNTS: MountOption[] = [
  { id: 't4ox',  name: 'T4 Transport Ox',       capacity: 2500 },
  { id: 't5ox',  name: 'T5 Transport Ox',       capacity: 3000 },
  { id: 't6ox',  name: 'T6 Transport Ox',       capacity: 3500 },
  { id: 't7ox',  name: 'T7 Transport Ox',       capacity: 4000 },
  { id: 't8ox',  name: 'T8 Transport Ox',       capacity: 4500 },
  { id: 't5mam', name: 'T5 Transport Mammoth',  capacity: 9000 },
  { id: 't8mam', name: 'T8 Transport Mammoth',  capacity: 16000 },
];

export function getMountCapacity(id: string): number {
  return TRANSPORT_MOUNTS.find(m => m.id === id)?.capacity ?? 4500;
}

/**
 * Rough item weight in kg based on its item ID. These are approximations —
 * exact Albion weights vary per item and per tier — but good enough for trip
 * planning math.
 */
export function getItemWeight(itemId: string): number {
  // Raw & refined resources
  if (/T\d+_(WOOD|ORE|HIDE|FIBER|ROCK)(_|$)/.test(itemId)) return 0.1;
  if (/T\d+_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(_|$)/.test(itemId)) return 0.2;

  // Equipment
  if (itemId.includes('_2H_')) return 11.5;
  if (itemId.includes('_MAIN_')) return 5;
  if (itemId.includes('_OFF_')) return 3;
  if (itemId.includes('_ARMOR_')) return 7;
  if (itemId.includes('_HEAD_')) return 3;
  if (itemId.includes('_SHOES_')) return 3;
  if (itemId.includes('_BAG')) return 3;
  if (itemId.includes('_CAPE')) return 2;

  // Consumables / default
  return 1;
}
