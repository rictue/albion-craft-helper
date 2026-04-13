import type { ItemDefinition, CategoryGroup } from '../types';

// Auto-generated from Albion Online game data + localization (ao-bin-dumps)
// Run: node scripts/generate-items.mjs
// Generated: 2026-04-04T15:00:11.179Z

const SWORD: ItemDefinition[] = [
  { baseId: 'MAIN_SWORD', name: 'Broadsword', category: 'weapon_1h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 8 }] },
  { baseId: '2H_CLAYMORE', name: 'Claymore', category: 'weapon_2h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'LEATHER', count: 12 }] },
  { baseId: '2H_DUALSWORD', name: 'Dual Swords', category: 'weapon_2h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'LEATHER', count: 12 }] },
  { baseId: 'MAIN_SCIMITAR_MORGANA', name: 'Clarent Blade', category: 'weapon_1h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_MAIN_SCIMITAR_MORGANA' },
  { baseId: '2H_CLEAVER_HELL', name: 'Carving Sword', category: 'weapon_2h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'LEATHER', count: 12 }], artifactId: 'ARTEFACT_2H_CLEAVER_HELL' },
  { baseId: '2H_DUALSCIMITAR_UNDEAD', name: 'Galatine Pair', category: 'weapon_2h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'LEATHER', count: 12 }], artifactId: 'ARTEFACT_2H_DUALSCIMITAR_UNDEAD' },
  { baseId: '2H_CLAYMORE_AVALON', name: 'Kingmaker', category: 'weapon_2h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'LEATHER', count: 12 }], artifactId: 'ARTEFACT_2H_CLAYMORE_AVALON' },
  { baseId: 'MAIN_SWORD_CRYSTAL', name: 'Infinity Blade', category: 'weapon_1h', subcategory: 'sword', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_MAIN_SWORD_CRYSTAL' },
];

const AXE: ItemDefinition[] = [
  { baseId: 'MAIN_AXE', name: 'Battleaxe', category: 'weapon_1h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 8 }, { materialBase: 'METALBAR', count: 16 }] },
  { baseId: '2H_AXE', name: 'Greataxe', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }] },
  { baseId: '2H_HALBERD', name: 'Halberd', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_HALBERD_MORGANA', name: 'Carrioncaller', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_HALBERD_MORGANA' },
  { baseId: '2H_SCYTHE_HELL', name: 'Infernal Scythe', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }], artifactId: 'ARTEFACT_2H_SCYTHE_HELL' },
  { baseId: '2H_DUALAXE_KEEPER', name: 'Bear Paws', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }], artifactId: 'ARTEFACT_2H_DUALAXE_KEEPER' },
  { baseId: '2H_AXE_AVALON', name: 'Realmbreaker', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }], artifactId: 'ARTEFACT_2H_AXE_AVALON' },
  { baseId: '2H_SCYTHE_CRYSTAL', name: 'Crystal Reaper', category: 'weapon_2h', subcategory: 'axe', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }], artifactId: 'ARTEFACT_2H_SCYTHE_CRYSTAL' },
];

const MACE: ItemDefinition[] = [
  { baseId: 'MAIN_MACE', name: 'Mace', category: 'weapon_1h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'CLOTH', count: 8 }] },
  { baseId: '2H_MACE', name: 'Heavy Mace', category: 'weapon_2h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: '2H_FLAIL', name: 'Morning Star', category: 'weapon_2h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: 'MAIN_ROCKMACE_KEEPER', name: 'Bedrock Mace', category: 'weapon_1h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_ROCKMACE_KEEPER' },
  { baseId: 'MAIN_MACE_HELL', name: 'Incubus Mace', category: 'weapon_1h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_MACE_HELL' },
  { baseId: '2H_MACE_MORGANA', name: 'Camlann Mace', category: 'weapon_2h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_MACE_MORGANA' },
  { baseId: '2H_DUALMACE_AVALON', name: 'Oathkeepers', category: 'weapon_2h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_DUALMACE_AVALON' },
  { baseId: 'MAIN_MACE_CRYSTAL', name: 'Dreadstorm Monarch', category: 'weapon_1h', subcategory: 'mace', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_MACE_CRYSTAL' },
];

const HAMMER: ItemDefinition[] = [
  { baseId: 'MAIN_HAMMER', name: 'Hammer', category: 'weapon_1h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 24 }] },
  { baseId: '2H_POLEHAMMER', name: 'Polehammer', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: '2H_HAMMER', name: 'Great Hammer', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: '2H_HAMMER_UNDEAD', name: 'Tombhammer', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HAMMER_UNDEAD' },
  { baseId: '2H_DUALHAMMER_HELL', name: 'Forge Hammers', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_DUALHAMMER_HELL' },
  { baseId: '2H_RAM_KEEPER', name: 'Grovekeeper', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_RAM_KEEPER' },
  { baseId: '2H_HAMMER_AVALON', name: 'Hand of Justice', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HAMMER_AVALON' },
  { baseId: '2H_HAMMER_CRYSTAL', name: 'Truebolt Hammer', category: 'weapon_2h', subcategory: 'hammer', recipe: [{ materialBase: 'METALBAR', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HAMMER_CRYSTAL' },
];

const SPEAR: ItemDefinition[] = [
  { baseId: 'MAIN_SPEAR', name: 'Spear', category: 'weapon_1h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_SPEAR', name: 'Pike', category: 'weapon_2h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_GLAIVE', name: 'Glaive', category: 'weapon_2h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }] },
  { baseId: 'MAIN_SPEAR_KEEPER', name: 'Heron Spear', category: 'weapon_1h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_SPEAR_KEEPER' },
  { baseId: '2H_HARPOON_HELL', name: 'Spirithunter', category: 'weapon_2h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_HARPOON_HELL' },
  { baseId: '2H_TRIDENT_UNDEAD', name: 'Trinity Spear', category: 'weapon_2h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_TRIDENT_UNDEAD' },
  { baseId: 'MAIN_SPEAR_LANCE_AVALON', name: 'Daybreaker', category: 'weapon_1h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_SPEAR_LANCE_AVALON' },
  { baseId: '2H_GLAIVE_CRYSTAL', name: 'Rift Glaive', category: 'weapon_2h', subcategory: 'spear', recipe: [{ materialBase: 'PLANKS', count: 12 }, { materialBase: 'METALBAR', count: 20 }], artifactId: 'ARTEFACT_2H_GLAIVE_CRYSTAL' },
];

const DAGGER: ItemDefinition[] = [
  { baseId: 'MAIN_DAGGER', name: 'Dagger', category: 'weapon_1h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 12 }] },
  { baseId: '2H_DAGGERPAIR', name: 'Dagger Pair', category: 'weapon_2h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 16 }] },
  { baseId: '2H_CLAWPAIR', name: 'Claws', category: 'weapon_2h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: 'MAIN_RAPIER_MORGANA', name: 'Bloodletter', category: 'weapon_1h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_MAIN_RAPIER_MORGANA' },
  { baseId: 'MAIN_DAGGER_HELL', name: 'Demonfang', category: 'weapon_1h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 12 }], artifactId: 'ARTEFACT_MAIN_DAGGER_HELL' },
  { baseId: '2H_DUALSICKLE_UNDEAD', name: 'Deathgivers', category: 'weapon_2h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_2H_DUALSICKLE_UNDEAD' },
  { baseId: '2H_DAGGER_KATAR_AVALON', name: 'Bridled Fury', category: 'weapon_2h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_DAGGER_KATAR_AVALON' },
  { baseId: '2H_DAGGERPAIR_CRYSTAL', name: 'Twin Slayers', category: 'weapon_2h', subcategory: 'dagger', recipe: [{ materialBase: 'METALBAR', count: 16 }, { materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_2H_DAGGERPAIR_CRYSTAL' },
];

const KNUCKLES: ItemDefinition[] = [
  { baseId: '2H_KNUCKLES_SET1', name: 'Brawler Gloves', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_KNUCKLES_SET2', name: 'Battle Bracers', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_KNUCKLES_SET3', name: 'Spiked Gauntlets', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_KNUCKLES_KEEPER', name: 'Ursine Maulers', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_KNUCKLES_KEEPER' },
  { baseId: '2H_KNUCKLES_HELL', name: 'Hellfire Hands', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_KNUCKLES_HELL' },
  { baseId: '2H_KNUCKLES_MORGANA', name: 'Ravenstrike Cestus', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_KNUCKLES_MORGANA' },
  { baseId: '2H_KNUCKLES_AVALON', name: 'Fists of Avalon', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_KNUCKLES_AVALON' },
  { baseId: '2H_KNUCKLES_CRYSTAL', name: 'Forcepulse Bracers', category: 'weapon_2h', subcategory: 'knuckles', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_KNUCKLES_CRYSTAL' },
];

const BOW: ItemDefinition[] = [
  { baseId: '2H_BOW', name: 'Bow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }] },
  { baseId: '2H_WARBOW', name: 'Warbow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }] },
  { baseId: '2H_LONGBOW', name: 'Longbow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }] },
  { baseId: '2H_LONGBOW_UNDEAD', name: 'Whispering Bow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }], artifactId: 'ARTEFACT_2H_LONGBOW_UNDEAD' },
  { baseId: '2H_BOW_HELL', name: 'Wailing Bow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }], artifactId: 'ARTEFACT_2H_BOW_HELL' },
  { baseId: '2H_BOW_KEEPER', name: 'Bow of Badon', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }], artifactId: 'ARTEFACT_2H_BOW_KEEPER' },
  { baseId: '2H_BOW_AVALON', name: 'Mistpiercer', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }], artifactId: 'ARTEFACT_2H_BOW_AVALON' },
  { baseId: '2H_BOW_CRYSTAL', name: 'Skystrider Bow', category: 'weapon_2h', subcategory: 'bow', recipe: [{ materialBase: 'PLANKS', count: 32 }], artifactId: 'ARTEFACT_2H_BOW_CRYSTAL' },
];

const CROSSBOW: ItemDefinition[] = [
  { baseId: '2H_CROSSBOW', name: 'Crossbow', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_CROSSBOWLARGE', name: 'Heavy Crossbow', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: 'MAIN_1HCROSSBOW', name: 'Light Crossbow', category: 'weapon_1h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_REPEATINGCROSSBOW_UNDEAD', name: 'Weeping Repeater', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_REPEATINGCROSSBOW_UNDEAD' },
  { baseId: '2H_DUALCROSSBOW_HELL', name: 'Boltcasters', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_DUALCROSSBOW_HELL' },
  { baseId: '2H_CROSSBOWLARGE_MORGANA', name: 'Siegebow', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_CROSSBOWLARGE_MORGANA' },
  { baseId: '2H_CROSSBOW_CANNON_AVALON', name: 'Energy Shaper', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_CROSSBOW_CANNON_AVALON' },
  { baseId: '2H_DUALCROSSBOW_CRYSTAL', name: 'Arclight Blasters', category: 'weapon_2h', subcategory: 'crossbow', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_DUALCROSSBOW_CRYSTAL' },
];

const QUARTERSTAFF: ItemDefinition[] = [
  { baseId: '2H_QUARTERSTAFF', name: 'Quarterstaff', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_IRONCLADEDSTAFF', name: 'Iron-clad Staff', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_DOUBLEBLADEDSTAFF', name: 'Double Bladed Staff', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }] },
  { baseId: '2H_COMBATSTAFF_MORGANA', name: 'Black Monk Stave', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_COMBATSTAFF_MORGANA' },
  { baseId: '2H_TWINSCYTHE_HELL', name: 'Soulscythe', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_TWINSCYTHE_HELL' },
  { baseId: '2H_ROCKSTAFF_KEEPER', name: 'Staff of Balance', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_ROCKSTAFF_KEEPER' },
  { baseId: '2H_QUARTERSTAFF_AVALON', name: 'Grailseeker', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_QUARTERSTAFF_AVALON' },
  { baseId: '2H_DOUBLEBLADEDSTAFF_CRYSTAL', name: 'Phantom Twinblade', category: 'weapon_2h', subcategory: 'quarterstaff', recipe: [{ materialBase: 'METALBAR', count: 12 }, { materialBase: 'LEATHER', count: 20 }], artifactId: 'ARTEFACT_2H_DOUBLEBLADEDSTAFF_CRYSTAL' },
];

const FIRESTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_FIRESTAFF', name: 'Fire Staff', category: 'weapon_1h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_FIRESTAFF', name: 'Great Fire Staff', category: 'weapon_2h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_INFERNOSTAFF', name: 'Infernal Staff', category: 'weapon_2h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: 'MAIN_FIRESTAFF_KEEPER', name: 'Wildfire Staff', category: 'weapon_1h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_FIRESTAFF_KEEPER' },
  { baseId: '2H_FIRESTAFF_HELL', name: 'Brimstone Staff', category: 'weapon_2h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_FIRESTAFF_HELL' },
  { baseId: '2H_INFERNOSTAFF_MORGANA', name: 'Blazing Staff', category: 'weapon_2h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_INFERNOSTAFF_MORGANA' },
  { baseId: '2H_FIRE_RINGPAIR_AVALON', name: 'Dawnsong', category: 'weapon_2h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_FIRE_RINGPAIR_AVALON' },
  { baseId: 'MAIN_FIRESTAFF_CRYSTAL', name: 'Flamewalker Staff', category: 'weapon_1h', subcategory: 'firestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_FIRESTAFF_CRYSTAL' },
];

const FROSTSTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_FROSTSTAFF', name: 'Frost Staff', category: 'weapon_1h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_FROSTSTAFF', name: 'Great Frost Staff', category: 'weapon_2h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_GLACIALSTAFF', name: 'Glacial Staff', category: 'weapon_2h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: 'MAIN_FROSTSTAFF_KEEPER', name: 'Hoarfrost Staff', category: 'weapon_1h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_FROSTSTAFF_KEEPER' },
  { baseId: '2H_ICEGAUNTLETS_HELL', name: 'Icicle Staff', category: 'weapon_2h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ICEGAUNTLETS_HELL' },
  { baseId: '2H_ICECRYSTAL_UNDEAD', name: 'Permafrost Prism', category: 'weapon_2h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ICECRYSTAL_UNDEAD' },
  { baseId: 'MAIN_FROSTSTAFF_AVALON', name: 'Chillhowl', category: 'weapon_1h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_FROSTSTAFF_AVALON' },
  { baseId: '2H_FROSTSTAFF_CRYSTAL', name: 'Arctic Staff', category: 'weapon_2h', subcategory: 'froststaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_FROSTSTAFF_CRYSTAL' },
];

const HOLYSTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_HOLYSTAFF', name: 'Holy Staff', category: 'weapon_1h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }] },
  { baseId: '2H_HOLYSTAFF', name: 'Great Holy Staff', category: 'weapon_2h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: '2H_DIVINESTAFF', name: 'Divine Staff', category: 'weapon_2h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: 'MAIN_HOLYSTAFF_MORGANA', name: 'Lifetouch Staff', category: 'weapon_1h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_HOLYSTAFF_MORGANA' },
  { baseId: '2H_HOLYSTAFF_HELL', name: 'Fallen Staff', category: 'weapon_2h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HOLYSTAFF_HELL' },
  { baseId: '2H_HOLYSTAFF_UNDEAD', name: 'Redemption Staff', category: 'weapon_2h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HOLYSTAFF_UNDEAD' },
  { baseId: 'MAIN_HOLYSTAFF_AVALON', name: 'Hallowfall', category: 'weapon_1h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_HOLYSTAFF_AVALON' },
  { baseId: '2H_HOLYSTAFF_CRYSTAL', name: 'Exalted Staff', category: 'weapon_2h', subcategory: 'holystaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_HOLYSTAFF_CRYSTAL' },
];

const ARCANESTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_ARCANESTAFF', name: 'Arcane Staff', category: 'weapon_1h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_ARCANESTAFF', name: 'Great Arcane Staff', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_ENIGMATICSTAFF', name: 'Enigmatic Staff', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: 'MAIN_ARCANESTAFF_UNDEAD', name: 'Witchwork Staff', category: 'weapon_1h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_ARCANESTAFF_UNDEAD' },
  { baseId: '2H_ARCANESTAFF_HELL', name: 'Occult Staff', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ARCANESTAFF_HELL' },
  { baseId: '2H_ENIGMATICORB_MORGANA', name: 'Malevolent Locus', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ENIGMATICORB_MORGANA' },
  { baseId: '2H_ARCANE_RINGPAIR_AVALON', name: 'Evensong', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ARCANE_RINGPAIR_AVALON' },
  { baseId: '2H_ARCANESTAFF_CRYSTAL', name: 'Astral Staff', category: 'weapon_2h', subcategory: 'arcanestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_ARCANESTAFF_CRYSTAL' },
];

const CURSESTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_CURSEDSTAFF', name: 'Cursed Staff', category: 'weapon_1h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }] },
  { baseId: '2H_CURSEDSTAFF', name: 'Great Cursed Staff', category: 'weapon_2h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: '2H_DEMONICSTAFF', name: 'Demonic Staff', category: 'weapon_2h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }] },
  { baseId: 'MAIN_CURSEDSTAFF_UNDEAD', name: 'Lifecurse Staff', category: 'weapon_1h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_CURSEDSTAFF_UNDEAD' },
  { baseId: '2H_SKULLORB_HELL', name: 'Cursed Skull', category: 'weapon_2h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_SKULLORB_HELL' },
  { baseId: '2H_CURSEDSTAFF_MORGANA', name: 'Damnation Staff', category: 'weapon_2h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'METALBAR', count: 12 }], artifactId: 'ARTEFACT_2H_CURSEDSTAFF_MORGANA' },
  { baseId: 'MAIN_CURSEDSTAFF_AVALON', name: 'Shadowcaller', category: 'weapon_1h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_CURSEDSTAFF_AVALON' },
  { baseId: 'MAIN_CURSEDSTAFF_CRYSTAL', name: 'Rotcaller Staff', category: 'weapon_1h', subcategory: 'cursestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_MAIN_CURSEDSTAFF_CRYSTAL' },
];

const NATURESTAFF: ItemDefinition[] = [
  { baseId: 'MAIN_NATURESTAFF', name: 'Nature Staff', category: 'weapon_1h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }] },
  { baseId: '2H_NATURESTAFF', name: 'Great Nature Staff', category: 'weapon_2h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: '2H_WILDSTAFF', name: 'Wild Staff', category: 'weapon_2h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }] },
  { baseId: 'MAIN_NATURESTAFF_KEEPER', name: 'Druidic Staff', category: 'weapon_1h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_NATURESTAFF_KEEPER' },
  { baseId: '2H_NATURESTAFF_HELL', name: 'Blight Staff', category: 'weapon_2h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_NATURESTAFF_HELL' },
  { baseId: '2H_NATURESTAFF_KEEPER', name: 'Rampant Staff', category: 'weapon_2h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 20 }, { materialBase: 'CLOTH', count: 12 }], artifactId: 'ARTEFACT_2H_NATURESTAFF_KEEPER' },
  { baseId: 'MAIN_NATURESTAFF_AVALON', name: 'Ironroot Staff', category: 'weapon_1h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_NATURESTAFF_AVALON' },
  { baseId: 'MAIN_NATURESTAFF_CRYSTAL', name: 'Forgebark Staff', category: 'weapon_1h', subcategory: 'naturestaff', recipe: [{ materialBase: 'PLANKS', count: 16 }, { materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_MAIN_NATURESTAFF_CRYSTAL' },
];

const PLATE_HELMET: ItemDefinition[] = [
  { baseId: 'HEAD_PLATE_SET1', name: 'Soldier Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'HEAD_PLATE_SET2', name: 'Knight Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'HEAD_PLATE_SET3', name: 'Guardian Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'HEAD_PLATE_UNDEAD', name: 'Graveguard Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_HEAD_PLATE_UNDEAD' },
  { baseId: 'HEAD_PLATE_HELL', name: 'Demon Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_HEAD_PLATE_HELL' },
  { baseId: 'HEAD_PLATE_KEEPER', name: 'Judicator Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_HEAD_PLATE_KEEPER' },
  { baseId: 'HEAD_PLATE_FEY', name: 'Duskweaver Helmet', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_HEAD_PLATE_FEY' },
  { baseId: 'HEAD_PLATE_AVALON', name: 'Helmet of Valor', category: 'head', subcategory: 'plate_helmet', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_HEAD_PLATE_AVALON' },
];

const PLATE_ARMOR: ItemDefinition[] = [
  { baseId: 'ARMOR_PLATE_SET1', name: 'Soldier Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }] },
  { baseId: 'ARMOR_PLATE_SET2', name: 'Knight Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }] },
  { baseId: 'ARMOR_PLATE_SET3', name: 'Guardian Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }] },
  { baseId: 'ARMOR_PLATE_UNDEAD', name: 'Graveguard Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }], artifactId: 'ARTEFACT_ARMOR_PLATE_UNDEAD' },
  { baseId: 'ARMOR_PLATE_HELL', name: 'Demon Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }], artifactId: 'ARTEFACT_ARMOR_PLATE_HELL' },
  { baseId: 'ARMOR_PLATE_KEEPER', name: 'Judicator Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }], artifactId: 'ARTEFACT_ARMOR_PLATE_KEEPER' },
  { baseId: 'ARMOR_PLATE_FEY', name: 'Duskweaver Armor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }], artifactId: 'ARTEFACT_ARMOR_PLATE_FEY' },
  { baseId: 'ARMOR_PLATE_AVALON', name: 'Armor of Valor', category: 'chest', subcategory: 'plate_armor', recipe: [{ materialBase: 'METALBAR', count: 16 }], artifactId: 'ARTEFACT_ARMOR_PLATE_AVALON' },
];

const PLATE_SHOES: ItemDefinition[] = [
  { baseId: 'SHOES_PLATE_SET1', name: 'Soldier Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'SHOES_PLATE_SET2', name: 'Knight Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'SHOES_PLATE_SET3', name: 'Guardian Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }] },
  { baseId: 'SHOES_PLATE_UNDEAD', name: 'Graveguard Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_SHOES_PLATE_UNDEAD' },
  { baseId: 'SHOES_PLATE_HELL', name: 'Demon Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_SHOES_PLATE_HELL' },
  { baseId: 'SHOES_PLATE_KEEPER', name: 'Judicator Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_SHOES_PLATE_KEEPER' },
  { baseId: 'SHOES_PLATE_FEY', name: 'Duskweaver Boots', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_SHOES_PLATE_FEY' },
  { baseId: 'SHOES_PLATE_AVALON', name: 'Boots of Valor', category: 'shoes', subcategory: 'plate_shoes', recipe: [{ materialBase: 'METALBAR', count: 8 }], artifactId: 'ARTEFACT_SHOES_PLATE_AVALON' },
];

const LEATHER_HELMET: ItemDefinition[] = [
  { baseId: 'HEAD_LEATHER_SET1', name: 'Mercenary Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'HEAD_LEATHER_SET2', name: 'Hunter Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'HEAD_LEATHER_SET3', name: 'Assassin Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'HEAD_LEATHER_MORGANA', name: 'Stalker Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_HEAD_LEATHER_MORGANA' },
  { baseId: 'HEAD_LEATHER_HELL', name: 'Hellion Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_HEAD_LEATHER_HELL' },
  { baseId: 'HEAD_LEATHER_UNDEAD', name: 'Specter Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_HEAD_LEATHER_UNDEAD' },
  { baseId: 'HEAD_LEATHER_FEY', name: 'Mistwalker Hood', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_HEAD_LEATHER_FEY' },
  { baseId: 'HEAD_LEATHER_AVALON', name: 'Hood of Tenacity', category: 'head', subcategory: 'leather_helmet', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_HEAD_LEATHER_AVALON' },
];

const LEATHER_ARMOR: ItemDefinition[] = [
  { baseId: 'ARMOR_LEATHER_SET1', name: 'Mercenary Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }] },
  { baseId: 'ARMOR_LEATHER_SET2', name: 'Hunter Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }] },
  { baseId: 'ARMOR_LEATHER_SET3', name: 'Assassin Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }] },
  { baseId: 'ARMOR_LEATHER_MORGANA', name: 'Stalker Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_ARMOR_LEATHER_MORGANA' },
  { baseId: 'ARMOR_LEATHER_HELL', name: 'Hellion Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_ARMOR_LEATHER_HELL' },
  { baseId: 'ARMOR_LEATHER_UNDEAD', name: 'Specter Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_ARMOR_LEATHER_UNDEAD' },
  { baseId: 'ARMOR_LEATHER_FEY', name: 'Mistwalker Jacket', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_ARMOR_LEATHER_FEY' },
  { baseId: 'ARMOR_LEATHER_AVALON', name: 'Jacket of Tenacity', category: 'chest', subcategory: 'leather_armor', recipe: [{ materialBase: 'LEATHER', count: 16 }], artifactId: 'ARTEFACT_ARMOR_LEATHER_AVALON' },
];

const LEATHER_SHOES: ItemDefinition[] = [
  { baseId: 'SHOES_LEATHER_SET1', name: 'Mercenary Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'SHOES_LEATHER_SET2', name: 'Hunter Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'SHOES_LEATHER_SET3', name: 'Assassin Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }] },
  { baseId: 'SHOES_LEATHER_MORGANA', name: 'Stalker Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_SHOES_LEATHER_MORGANA' },
  { baseId: 'SHOES_LEATHER_HELL', name: 'Hellion Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_SHOES_LEATHER_HELL' },
  { baseId: 'SHOES_LEATHER_UNDEAD', name: 'Specter Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_SHOES_LEATHER_UNDEAD' },
  { baseId: 'SHOES_LEATHER_FEY', name: 'Mistwalker Shoes', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_SHOES_LEATHER_FEY' },
  { baseId: 'SHOES_LEATHER_AVALON', name: 'Shoes of Tenacity', category: 'shoes', subcategory: 'leather_shoes', recipe: [{ materialBase: 'LEATHER', count: 8 }], artifactId: 'ARTEFACT_SHOES_LEATHER_AVALON' },
];

const CLOTH_HELMET: ItemDefinition[] = [
  { baseId: 'HEAD_CLOTH_SET1', name: 'Scholar Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'HEAD_CLOTH_SET2', name: 'Cleric Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'HEAD_CLOTH_SET3', name: 'Mage Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'HEAD_CLOTH_KEEPER', name: 'Druid Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_HEAD_CLOTH_KEEPER' },
  { baseId: 'HEAD_CLOTH_HELL', name: 'Fiend Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_HEAD_CLOTH_HELL' },
  { baseId: 'HEAD_CLOTH_MORGANA', name: 'Cultist Cowl', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_HEAD_CLOTH_MORGANA' },
  { baseId: 'HEAD_CLOTH_FEY', name: 'Feyscale Hat', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_HEAD_CLOTH_FEY' },
  { baseId: 'HEAD_CLOTH_AVALON', name: 'Cowl of Purity', category: 'head', subcategory: 'cloth_helmet', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_HEAD_CLOTH_AVALON' },
];

const CLOTH_ARMOR: ItemDefinition[] = [
  { baseId: 'ARMOR_CLOTH_SET1', name: 'Scholar Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }] },
  { baseId: 'ARMOR_CLOTH_SET2', name: 'Cleric Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }] },
  { baseId: 'ARMOR_CLOTH_SET3', name: 'Mage Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }] },
  { baseId: 'ARMOR_CLOTH_KEEPER', name: 'Druid Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }], artifactId: 'ARTEFACT_ARMOR_CLOTH_KEEPER' },
  { baseId: 'ARMOR_CLOTH_HELL', name: 'Fiend Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }], artifactId: 'ARTEFACT_ARMOR_CLOTH_HELL' },
  { baseId: 'ARMOR_CLOTH_MORGANA', name: 'Cultist Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }], artifactId: 'ARTEFACT_ARMOR_CLOTH_MORGANA' },
  { baseId: 'ARMOR_CLOTH_FEY', name: 'Feyscale Robe', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }], artifactId: 'ARTEFACT_ARMOR_CLOTH_FEY' },
  { baseId: 'ARMOR_CLOTH_AVALON', name: 'Robe of Purity', category: 'chest', subcategory: 'cloth_armor', recipe: [{ materialBase: 'CLOTH', count: 16 }], artifactId: 'ARTEFACT_ARMOR_CLOTH_AVALON' },
];

const CLOTH_SHOES: ItemDefinition[] = [
  { baseId: 'SHOES_CLOTH_SET1', name: 'Scholar Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'SHOES_CLOTH_SET2', name: 'Cleric Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'SHOES_CLOTH_SET3', name: 'Mage Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }] },
  { baseId: 'SHOES_CLOTH_KEEPER', name: 'Druid Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_SHOES_CLOTH_KEEPER' },
  { baseId: 'SHOES_CLOTH_HELL', name: 'Fiend Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_SHOES_CLOTH_HELL' },
  { baseId: 'SHOES_CLOTH_MORGANA', name: 'Cultist Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_SHOES_CLOTH_MORGANA' },
  { baseId: 'SHOES_CLOTH_FEY', name: 'Feyscale Sandals', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_SHOES_CLOTH_FEY' },
  { baseId: 'SHOES_CLOTH_AVALON', name: 'Sandals of Purity', category: 'shoes', subcategory: 'cloth_shoes', recipe: [{ materialBase: 'CLOTH', count: 8 }], artifactId: 'ARTEFACT_SHOES_CLOTH_AVALON' },
];

const SHIELDTYPE: ItemDefinition[] = [
  { baseId: 'OFF_SHIELD', name: 'Shield', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }] },
  { baseId: 'OFF_TOWERSHIELD_UNDEAD', name: 'Sarcophagus', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }], artifactId: 'ARTEFACT_OFF_TOWERSHIELD_UNDEAD' },
  { baseId: 'OFF_SHIELD_HELL', name: 'Caitiff Shield', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }], artifactId: 'ARTEFACT_OFF_SHIELD_HELL' },
  { baseId: 'OFF_SPIKEDSHIELD_MORGANA', name: 'Facebreaker', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }], artifactId: 'ARTEFACT_OFF_SPIKEDSHIELD_MORGANA' },
  { baseId: 'OFF_SHIELD_AVALON', name: 'Astral Aegis', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }], artifactId: 'ARTEFACT_OFF_SHIELD_AVALON' },
  { baseId: 'OFF_SHIELD_CRYSTAL', name: 'Unbreakable Ward', category: 'offhand', subcategory: 'shieldtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'METALBAR', count: 4 }], artifactId: 'ARTEFACT_OFF_SHIELD_CRYSTAL' },
];

const BOOKTYPE: ItemDefinition[] = [
  { baseId: 'OFF_BOOK', name: 'Tome of Spells', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }] },
  { baseId: 'OFF_ORB_MORGANA', name: 'Eye of Secrets', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }], artifactId: 'ARTEFACT_OFF_ORB_MORGANA' },
  { baseId: 'OFF_DEMONSKULL_HELL', name: 'Muisak', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }], artifactId: 'ARTEFACT_OFF_DEMONSKULL_HELL' },
  { baseId: 'OFF_TOTEM_KEEPER', name: 'Taproot', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }], artifactId: 'ARTEFACT_OFF_TOTEM_KEEPER' },
  { baseId: 'OFF_CENSER_AVALON', name: 'Celestial Censer', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }], artifactId: 'ARTEFACT_OFF_CENSER_AVALON' },
  { baseId: 'OFF_TOME_CRYSTAL', name: 'Timelocked Grimoire', category: 'offhand', subcategory: 'booktype', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }], artifactId: 'ARTEFACT_OFF_TOME_CRYSTAL' },
];

const TORCHTYPE: ItemDefinition[] = [
  { baseId: 'OFF_TORCH', name: 'Torch', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }] },
  { baseId: 'OFF_HORN_KEEPER', name: 'Mistcaller', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }], artifactId: 'ARTEFACT_OFF_HORN_KEEPER' },
  { baseId: 'OFF_TALISMAN_AVALON', name: 'Sacred Scepter', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }], artifactId: 'ARTEFACT_OFF_TALISMAN_AVALON' },
  { baseId: 'OFF_LAMP_UNDEAD', name: 'Cryptcandle', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }], artifactId: 'ARTEFACT_OFF_LAMP_UNDEAD' },
  { baseId: 'OFF_JESTERCANE_HELL', name: 'Leering Cane', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }], artifactId: 'ARTEFACT_OFF_JESTERCANE_HELL' },
  { baseId: 'OFF_TORCH_CRYSTAL', name: 'Blueflame Torch', category: 'offhand', subcategory: 'torchtype', recipe: [{ materialBase: 'PLANKS', count: 4 }, { materialBase: 'CLOTH', count: 4 }], artifactId: 'ARTEFACT_OFF_TORCH_CRYSTAL' },
];

const BAGS: ItemDefinition[] = [
  { baseId: 'BAG', name: 'Bag', category: 'bag', subcategory: 'bags', recipe: [{ materialBase: 'CLOTH', count: 8 }, { materialBase: 'LEATHER', count: 8 }] },
];

const CAPE: ItemDefinition[] = [
  { baseId: 'CAPE', name: 'Cape', category: 'cape', subcategory: 'cape', recipe: [{ materialBase: 'CLOTH', count: 4 }, { materialBase: 'LEATHER', count: 4 }] },
];

export const ITEM_CATEGORIES: CategoryGroup[] = [
  { id: 'sword', name: 'Swords', category: 'weapon_1h', items: SWORD },
  { id: 'axe', name: 'Axes', category: 'weapon_1h', items: AXE },
  { id: 'mace', name: 'Maces', category: 'weapon_1h', items: MACE },
  { id: 'hammer', name: 'Hammers', category: 'weapon_1h', items: HAMMER },
  { id: 'spear', name: 'Spears', category: 'weapon_1h', items: SPEAR },
  { id: 'dagger', name: 'Daggers', category: 'weapon_1h', items: DAGGER },
  { id: 'knuckles', name: 'War Gloves', category: 'weapon_2h', items: KNUCKLES },
  { id: 'bow', name: 'Bows', category: 'weapon_2h', items: BOW },
  { id: 'crossbow', name: 'Crossbows', category: 'weapon_2h', items: CROSSBOW },
  { id: 'quarterstaff', name: 'Quarterstaffs', category: 'weapon_2h', items: QUARTERSTAFF },
  { id: 'firestaff', name: 'Fire Staffs', category: 'weapon_1h', items: FIRESTAFF },
  { id: 'froststaff', name: 'Frost Staffs', category: 'weapon_1h', items: FROSTSTAFF },
  { id: 'holystaff', name: 'Holy Staffs', category: 'weapon_1h', items: HOLYSTAFF },
  { id: 'arcanestaff', name: 'Arcane Staffs', category: 'weapon_1h', items: ARCANESTAFF },
  { id: 'cursestaff', name: 'Cursed Staffs', category: 'weapon_1h', items: CURSESTAFF },
  { id: 'naturestaff', name: 'Nature Staffs', category: 'weapon_1h', items: NATURESTAFF },
  { id: 'plate_helmet', name: 'Plate Helmets', category: 'head', items: PLATE_HELMET },
  { id: 'plate_armor', name: 'Plate Armor', category: 'chest', items: PLATE_ARMOR },
  { id: 'plate_shoes', name: 'Plate Boots', category: 'shoes', items: PLATE_SHOES },
  { id: 'leather_helmet', name: 'Leather Hoods', category: 'head', items: LEATHER_HELMET },
  { id: 'leather_armor', name: 'Leather Jackets', category: 'chest', items: LEATHER_ARMOR },
  { id: 'leather_shoes', name: 'Leather Shoes', category: 'shoes', items: LEATHER_SHOES },
  { id: 'cloth_helmet', name: 'Cloth Cowls', category: 'head', items: CLOTH_HELMET },
  { id: 'cloth_armor', name: 'Cloth Robes', category: 'chest', items: CLOTH_ARMOR },
  { id: 'cloth_shoes', name: 'Cloth Sandals', category: 'shoes', items: CLOTH_SHOES },
  { id: 'shieldtype', name: 'Shields', category: 'offhand', items: SHIELDTYPE },
  { id: 'booktype', name: 'Tomes', category: 'offhand', items: BOOKTYPE },
  { id: 'torchtype', name: 'Torches', category: 'offhand', items: TORCHTYPE },
  { id: 'bags', name: 'Bags', category: 'bag', items: BAGS },
  { id: 'cape', name: 'Cape', category: 'cape', items: CAPE },
];

// ZvZ meta items (25-50+ player fights). Sourced from AFM Meta Items
// kill event statistics, filtered to equipment slot types only.
// Updated: April 2026.
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

// Tag all ZvZ meta items
for (const cat of ITEM_CATEGORIES) {
  for (const item of cat.items) {
    if (ZVZ_META_BASE_IDS.has(item.baseId)) {
      item.zvzMeta = true;
    }
  }
}

export const ALL_ITEMS: ItemDefinition[] = ITEM_CATEGORIES.flatMap(c => c.items);
