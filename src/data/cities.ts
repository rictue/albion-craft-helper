import type { CityInfo } from '../types';

export const CITIES: CityInfo[] = [
  {
    id: 'Fort Sterling',
    name: 'Fort Sterling',
    // Hammers, Spears, Holy Staffs, Plate Armor
    specializations: ['hammer', 'spear', 'holystaff', 'plate_helmet', 'plate_armor', 'plate_shoes'],
  },
  {
    id: 'Lymhurst',
    name: 'Lymhurst',
    // Swords, Bows, Arcane Staffs, Leather Armor
    specializations: ['sword', 'bow', 'arcanestaff', 'leather_helmet', 'leather_armor', 'leather_shoes'],
  },
  {
    id: 'Bridgewatch',
    name: 'Bridgewatch',
    // Crossbows, Daggers, Cursed Staffs, Cloth Armor
    specializations: ['crossbow', 'dagger', 'cursestaff', 'cloth_helmet', 'cloth_armor', 'cloth_shoes'],
  },
  {
    id: 'Martlock',
    name: 'Martlock',
    // Axes, Quarterstaffs, Frost Staffs, Offhands, Bags
    specializations: ['axe', 'quarterstaff', 'froststaff', 'shieldtype', 'booktype', 'torchtype', 'bags'],
  },
  {
    id: 'Thetford',
    name: 'Thetford',
    // Maces, Nature Staffs, Fire Staffs, Capes
    specializations: ['mace', 'naturestaff', 'firestaff', 'cape'],
  },
  {
    id: 'Caerleon',
    name: 'Caerleon',
    // War Gloves, Knuckles
    specializations: ['knuckles'],
  },
  {
    id: 'Black Market',
    name: 'Black Market',
    specializations: [],
  },
];

export const SELLING_LOCATIONS = CITIES.map(c => c.id);
