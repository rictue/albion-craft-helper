/**
 * ZvZ meta items (25-50+ player fights). Sourced from AFM Meta Items
 * kill event statistics, filtered to equipment slot types only.
 *
 * This file is SEPARATE from items.ts because items.ts is auto-generated
 * by scripts/generate-items.mjs on every build. Anything added to items.ts
 * gets wiped on deploy.
 *
 * Updated: April 2026.
 */

export const ZVZ_META_BASE_IDS = new Set([
  // Holy Staffs
  'MAIN_HOLYSTAFF_AVALON',     // Hallowfall
  '2H_HOLYSTAFF_UNDEAD',       // Redemption Staff
  '2H_HOLYSTAFF_CRYSTAL',      // Exalted Staff
  // Nature Staffs
  'MAIN_NATURESTAFF',           // Nature Staff
  '2H_NATURESTAFF_HELL',        // Blight Staff
  '2H_NATURESTAFF_KEEPER',      // Rampant Staff
  // Plate
  'HEAD_PLATE_SET1',             // Soldier Helmet
  'HEAD_PLATE_SET3',             // Guardian Helmet
  'ARMOR_PLATE_KEEPER',          // Judicator Armor
  'SHOES_PLATE_AVALON',          // Boots of Valor
  // Leather
  'HEAD_LEATHER_SET1',           // Mercenary Hood
  'HEAD_LEATHER_SET3',           // Assassin Hood
  'HEAD_LEATHER_AVALON',         // Hood of Tenacity
  'ARMOR_LEATHER_HELL',          // Hellion Jacket
  'ARMOR_LEATHER_FEY',           // Mistwalker Jacket
  'ARMOR_LEATHER_AVALON',        // Jacket of Tenacity
  'SHOES_LEATHER_SET1',          // Mercenary Shoes
  'SHOES_LEATHER_MORGANA',       // Stalker Shoes
  // Cloth
  'HEAD_CLOTH_SET2',             // Cleric Cowl
  'HEAD_CLOTH_KEEPER',           // Druid Cowl
  'ARMOR_CLOTH_SET2',            // Cleric Robe
  'ARMOR_CLOTH_AVALON',          // Robe of Purity
  'SHOES_CLOTH_SET2',            // Cleric Sandals
  // Offhands
  'OFF_TOWERSHIELD_UNDEAD',      // Sarcophagus
  'OFF_SHIELD_CRYSTAL',          // Unbreakable Ward
  'OFF_HORN_KEEPER',             // Mistcaller
  'OFF_TORCH_CRYSTAL',           // Blueflame Torch
]);

export function isZvzMeta(baseId: string): boolean {
  return ZVZ_META_BASE_IDS.has(baseId);
}
