import type { CityInfo } from '../types';

export const CITIES: CityInfo[] = [
  {
    id: 'Fort Sterling',
    name: 'Fort Sterling',
    specializations: ['hammer', 'spear', 'holy', 'plate_head', 'plate_chest', 'plate_shoes'],
  },
  {
    id: 'Lymhurst',
    name: 'Lymhurst',
    specializations: ['sword', 'bow', 'arcane', 'leather_head', 'leather_chest', 'leather_shoes'],
  },
  {
    id: 'Bridgewatch',
    name: 'Bridgewatch',
    specializations: ['crossbow', 'dagger', 'cursed', 'cloth_head', 'cloth_chest', 'cloth_shoes'],
  },
  {
    id: 'Martlock',
    name: 'Martlock',
    specializations: ['axe', 'quarterstaff', 'frost', 'offhand', 'bag'],
  },
  {
    id: 'Thetford',
    name: 'Thetford',
    specializations: ['mace', 'nature', 'fire', 'cape'],
  },
  {
    id: 'Caerleon',
    name: 'Caerleon',
    specializations: [],
  },
  {
    id: 'Black Market',
    name: 'Black Market',
    specializations: [],
  },
];

export const SELLING_LOCATIONS = CITIES.map(c => c.id);
