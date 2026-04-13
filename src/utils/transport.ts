/**
 * Transport helpers — shared by pages that reason about moving items between
 * locations (MarketFlipper, BMRunner). Keep the mount list and weight estimates
 * in one place so both pages stay consistent.
 */

export interface MountOption {
  id: string;
  name: string;
  capacity: number; // carry capacity in kg (approximate)
  /** Visual grouping label for the <optgroup> dropdown. */
  group: string;
}

// Capacity values are community-sourced approximations (total load with
// typical bags/equipment). If you find an exact value differs in-game,
// tweak the number here — every page picks it up automatically.
export const TRANSPORT_MOUNTS: MountOption[] = [
  // ── Horses (fast, low carry — good for BM running with small loads) ──
  { id: 't3horse',  name: 'T3 Riding Horse',      capacity: 500,   group: 'Horses' },
  { id: 't4horse',  name: 'T4 Riding Horse',      capacity: 650,   group: 'Horses' },
  { id: 't5horse',  name: 'T5 Armored Horse',     capacity: 800,   group: 'Horses' },
  { id: 't6horse',  name: 'T6 Armored Horse',     capacity: 950,   group: 'Horses' },
  { id: 't7horse',  name: 'T7 Armored Horse',     capacity: 1100,  group: 'Horses' },
  { id: 't8horse',  name: 'T8 Armored Horse',     capacity: 1300,  group: 'Horses' },

  // ── Oxen (slow, high carry — classic transport) ──
  { id: 't4ox',     name: 'T4 Transport Ox',      capacity: 2500,  group: 'Oxen' },
  { id: 't5ox',     name: 'T5 Transport Ox',      capacity: 3000,  group: 'Oxen' },
  { id: 't6ox',     name: 'T6 Transport Ox',      capacity: 3500,  group: 'Oxen' },
  { id: 't7ox',     name: 'T7 Transport Ox',      capacity: 4000,  group: 'Oxen' },
  { id: 't8ox',     name: 'T8 Transport Ox',      capacity: 4500,  group: 'Oxen' },

  // ── Boars / Wild Boars (medium speed, decent carry, charge ability) ──
  { id: 't4boar',   name: 'T4 Saddled Boar',      capacity: 1100,  group: 'Boars' },
  { id: 't5boar',   name: 'T5 Saddled Wild Boar', capacity: 1300,  group: 'Boars' },
  { id: 't6boar',   name: 'T6 Saddled Wild Boar', capacity: 1500,  group: 'Boars' },
  { id: 't7boar',   name: 'T7 Saddled Wild Boar', capacity: 1700,  group: 'Boars' },
  { id: 't8boar',   name: 'T8 Saddled Wild Boar', capacity: 2000,  group: 'Boars' },

  // ── Bears (tanky, medium carry) ──
  { id: 't5bear',   name: 'T5 Saddled Bear',      capacity: 1400,  group: 'Bears' },
  { id: 't6bear',   name: 'T6 Saddled Bear',      capacity: 1600,  group: 'Bears' },
  { id: 't7bear',   name: 'T7 Saddled Bear',      capacity: 1900,  group: 'Bears' },
  { id: 't8bear',   name: 'T8 Saddled Bear',      capacity: 2200,  group: 'Bears' },

  // ── Direwolves / Swiftclaws (fast sprint, low carry) ──
  { id: 't5swift',  name: 'T5 Swiftclaw',         capacity: 600,   group: 'Wolves' },
  { id: 't6wolf',   name: 'T6 Direwolf',          capacity: 700,   group: 'Wolves' },
  { id: 't7wolf',   name: 'T7 Direwolf',          capacity: 850,   group: 'Wolves' },
  { id: 't8wolf',   name: 'T8 Direwolf',          capacity: 1000,  group: 'Wolves' },

  // ── Stags (good all-rounder) ──
  { id: 't6stag',   name: 'T6 Stag',              capacity: 900,   group: 'Stags' },
  { id: 't7stag',   name: 'T7 Stag',              capacity: 1050,  group: 'Stags' },
  { id: 't8stag',   name: 'T8 Stag',              capacity: 1200,  group: 'Stags' },

  // ── Mammoths (very slow, massive carry) ──
  { id: 't5mam',    name: 'T5 Transport Mammoth', capacity: 9000,  group: 'Mammoths' },
  { id: 't8mam',    name: 'T8 Transport Mammoth', capacity: 16000, group: 'Mammoths' },
];

/** Group mounts by their `group` field for use in <optgroup> dropdowns. */
export function getMountGroups(): { group: string; mounts: MountOption[] }[] {
  const map = new Map<string, MountOption[]>();
  for (const m of TRANSPORT_MOUNTS) {
    if (!map.has(m.group)) map.set(m.group, []);
    map.get(m.group)!.push(m);
  }
  return [...map.entries()].map(([group, mounts]) => ({ group, mounts }));
}

export function getMountCapacity(id: string): number {
  return TRANSPORT_MOUNTS.find(m => m.id === id)?.capacity ?? 4500;
}

/**
 * Rough item weight in kg based on its item ID. These are approximations —
 * exact Albion weights vary per item and per tier — but good enough for trip
 * planning math.
 */
export function getItemWeight(itemId: string): number {
  // Raw & refined resources — in Albion ALL resources weigh ~1 kg each
  // regardless of tier. The old 0.1/0.2 values were 10x too low, causing
  // the site to say "1 trip" when 15K logs actually need 2-4 trips.
  if (/T\d+_(WOOD|ORE|HIDE|FIBER|ROCK)(_|$)/.test(itemId)) return 1.0;
  if (/T\d+_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(_|$)/.test(itemId)) return 1.0;

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
