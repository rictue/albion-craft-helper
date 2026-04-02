// Fetches Albion Online game data + localization and generates src/data/items.ts
// Run: node scripts/generate-items.mjs

import { writeFileSync } from 'fs';

const ITEMS_JSON_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const LOC_JSON_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/localization.json';

const SUBCATEGORY_NAMES = {
  'sword': 'Swords', 'axe': 'Axes', 'mace': 'Maces', 'hammer': 'Hammers',
  'spear': 'Spears', 'dagger': 'Daggers', 'knuckles': 'War Gloves',
  'bow': 'Bows', 'crossbow': 'Crossbows', 'quarterstaff': 'Quarterstaffs',
  'firestaff': 'Fire Staffs', 'froststaff': 'Frost Staffs', 'holystaff': 'Holy Staffs',
  'arcanestaff': 'Arcane Staffs', 'cursestaff': 'Cursed Staffs', 'naturestaff': 'Nature Staffs',
  'plate_helmet': 'Plate Helmets', 'plate_armor': 'Plate Armor', 'plate_shoes': 'Plate Boots',
  'leather_helmet': 'Leather Hoods', 'leather_armor': 'Leather Jackets', 'leather_shoes': 'Leather Shoes',
  'cloth_helmet': 'Cloth Cowls', 'cloth_armor': 'Cloth Robes', 'cloth_shoes': 'Cloth Sandals',
  'shieldtype': 'Shields', 'booktype': 'Tomes', 'torchtype': 'Torches',
  'bags': 'Bags',
};

const MAT_TYPES = ['METALBAR', 'PLANKS', 'CLOTH', 'LEATHER'];

async function main() {
  console.log('Fetching Albion item data...');
  const [itemsRes, locRes] = await Promise.all([
    fetch(ITEMS_JSON_URL),
    fetch(LOC_JSON_URL),
  ]);
  const data = await itemsRes.json();
  const locData = await locRes.json();

  // Build name map from localization
  console.log('Parsing localization...');
  const nameMap = {};
  const tus = locData?.tmx?.body?.tu;
  if (Array.isArray(tus)) {
    for (const tu of tus) {
      const id = tu?.['@tuid'] || '';
      if (!id.startsWith('@ITEMS_T4_') || id.endsWith('_DESC')) continue;
      const tuvs = Array.isArray(tu.tuv) ? tu.tuv : [tu.tuv];
      const en = tuvs.find(v => v?.['@xml:lang'] === 'EN-US');
      if (!en?.seg) continue;
      const baseId = id.replace('@ITEMS_T4_', '');
      nameMap[baseId] = en.seg.replace("Adept's ", '').trim();
    }
  }
  console.log(`Loaded ${Object.keys(nameMap).length} item names`);

  // Parse items
  const weapons = data.items.weapon || [];
  const equip = data.items.equipmentitem || [];
  const allRaw = [...weapons, ...equip];

  const weaponSubs = new Set(['sword','axe','mace','hammer','spear','dagger','knuckles','bow','crossbow',
    'quarterstaff','firestaff','froststaff','holystaff','arcanestaff','cursestaff','naturestaff']);
  const armorSubs = new Set(['plate_helmet','plate_armor','plate_shoes','leather_helmet','leather_armor',
    'leather_shoes','cloth_helmet','cloth_armor','cloth_shoes']);
  const offhandSubs = new Set(['shieldtype','booktype','torchtype']);

  const items = [];

  for (const item of allRaw) {
    const id = item['@uniquename'] || '';
    if (!id.startsWith('T4_')) continue;

    const sub = item['@shopsubcategory1'] || '';
    const isWeapon = weaponSubs.has(sub);
    const isArmor = armorSubs.has(sub);
    const isOffhand = offhandSubs.has(sub);
    const isBag = sub === 'bags';
    const isCape = sub.startsWith('accessoires_capes');

    if (!isWeapon && !isArmor && !isOffhand && !isBag && !isCape) continue;

    let cr = item.craftingrequirements;
    if (Array.isArray(cr)) cr = cr[0];
    if (!cr) continue;

    const rawRes = Array.isArray(cr.craftresource) ? cr.craftresource : cr.craftresource ? [cr.craftresource] : [];
    if (rawRes.length === 0) continue;

    const baseId = id.replace('T4_', '');

    let category = 'weapon_2h';
    if (isWeapon && baseId.startsWith('MAIN_')) category = 'weapon_1h';
    if (isArmor && sub.includes('helmet')) category = 'head';
    if (isArmor && sub.includes('armor')) category = 'chest';
    if (isArmor && sub.includes('shoes')) category = 'shoes';
    if (isOffhand) category = 'offhand';
    if (isBag) category = 'bag';
    if (isCape) category = 'cape';

    const recipe = [];
    let artifactId = null;

    for (const r of rawRes) {
      const rName = (r['@uniquename'] || '').replace('T4_', '');
      const count = parseInt(r['@count']) || 0;
      if (MAT_TYPES.includes(rName)) {
        recipe.push({ materialBase: rName, count });
      } else if (rName.startsWith('ARTEFACT_')) {
        artifactId = rName;
      }
    }

    if (recipe.length === 0) continue;

    // Get name from localization, fallback to ID-derived name
    const name = nameMap[baseId] || baseId
      .replace(/^(MAIN_|2H_|OFF_|HEAD_|ARMOR_|SHOES_)/, '')
      .replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    const finalSub = isCape ? 'cape' : sub;

    items.push({ baseId, name, category, subcategory: finalSub, recipe, artifactId });
  }

  // Group and generate
  const categoryOrder = [
    'sword','axe','mace','hammer','spear','dagger','knuckles',
    'bow','crossbow','quarterstaff',
    'firestaff','froststaff','holystaff','arcanestaff','cursestaff','naturestaff',
    'plate_helmet','plate_armor','plate_shoes',
    'leather_helmet','leather_armor','leather_shoes',
    'cloth_helmet','cloth_armor','cloth_shoes',
    'shieldtype','booktype','torchtype',
    'bags','cape',
  ];

  const grouped = {};
  for (const item of items) {
    const key = item.subcategory;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  let ts = `import type { ItemDefinition, CategoryGroup } from '../types';\n\n`;
  ts += `// Auto-generated from Albion Online game data + localization (ao-bin-dumps)\n`;
  ts += `// Run: node scripts/generate-items.mjs\n`;
  ts += `// Generated: ${new Date().toISOString()}\n\n`;

  const catGroups = [];

  for (const sub of categoryOrder) {
    const catItems = grouped[sub];
    if (!catItems || catItems.length === 0) continue;

    const varName = sub.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const displayName = SUBCATEGORY_NAMES[sub] || sub;

    ts += `const ${varName}: ItemDefinition[] = [\n`;
    for (const item of catItems) {
      const recipeStr = item.recipe.map(r => `{ materialBase: '${r.materialBase}', count: ${r.count} }`).join(', ');
      const artStr = item.artifactId ? `, artifactId: '${item.artifactId}'` : '';
      ts += `  { baseId: '${item.baseId}', name: '${item.name.replace(/'/g, "\\'")}', category: '${item.category}', subcategory: '${item.subcategory}', recipe: [${recipeStr}]${artStr} },\n`;
    }
    ts += `];\n\n`;

    catGroups.push({ id: sub, name: displayName, varName, category: catItems[0].category });
  }

  ts += `export const ITEM_CATEGORIES: CategoryGroup[] = [\n`;
  for (const g of catGroups) {
    ts += `  { id: '${g.id}', name: '${g.name}', category: '${g.category}', items: ${g.varName} },\n`;
  }
  ts += `];\n\n`;
  ts += `export const ALL_ITEMS: ItemDefinition[] = ITEM_CATEGORIES.flatMap(c => c.items);\n`;

  writeFileSync('src/data/items.ts', ts);
  console.log(`Generated ${items.length} items in ${catGroups.length} categories`);
}

main().catch(console.error);
