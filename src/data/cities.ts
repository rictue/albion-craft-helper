import type { CityInfo } from '../types';

// Royal city Local Production Bonuses — the real Albion mapping.
// Every royal city gets weapon/tool bonuses AND two armor-piece bonuses,
// but the armor pieces are SPLIT across cities (not clustered by armor
// type). That means e.g. Plate Armor (chest) is Bridgewatch, Plate Shoes
// is Martlock, Plate Helmet is Fort Sterling — there is no single
// "plate city". Verified against the Albion Online wiki and community
// bonus tables (Apr 2026).
export const CITIES: CityInfo[] = [
  {
    id: 'Fort Sterling',
    name: 'Fort Sterling',
    // Hammer, Spear, Holy Staff, Plate Helmet, Cloth Armor
    specializations: ['hammer', 'spear', 'holystaff', 'plate_helmet', 'cloth_armor'],
  },
  {
    id: 'Lymhurst',
    name: 'Lymhurst',
    // Sword, Bow, Arcane Staff, Leather Helmet, Leather Shoes
    specializations: ['sword', 'bow', 'arcanestaff', 'leather_helmet', 'leather_shoes'],
  },
  {
    id: 'Bridgewatch',
    name: 'Bridgewatch',
    // Crossbow, Dagger, Cursed Staff, Plate Armor, Cloth Shoes
    specializations: ['crossbow', 'dagger', 'cursestaff', 'plate_armor', 'cloth_shoes'],
  },
  {
    id: 'Martlock',
    name: 'Martlock',
    // Axe, Quarterstaff, Frost Staff, Offhands, Bags, Plate Shoes
    specializations: ['axe', 'quarterstaff', 'froststaff', 'shieldtype', 'booktype', 'torchtype', 'bags', 'plate_shoes'],
  },
  {
    id: 'Thetford',
    name: 'Thetford',
    // Mace, Nature Staff, Fire Staff, Cape, Leather Armor, Cloth Helmet
    specializations: ['mace', 'naturestaff', 'firestaff', 'cape', 'leather_armor', 'cloth_helmet'],
  },
  {
    id: 'Black Market',
    name: 'Black Market',
    specializations: [],
  },
];

export const SELLING_LOCATIONS = CITIES.map(c => c.id);
