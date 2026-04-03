// Albion Online farming data
// Crops: 9 seeds per plot, 22h grow time, yields 3-6 per seed (6-12 with premium)
// Herbs: 9 seeds per plot, 22h grow time, yields 3-6 per seed (6-12 with premium)
// Animals: varies per plot, 22h grow time for baby→grown, then nurture for mount/product

export interface FarmItem {
  seedId: string;
  outputId: string;
  name: string;
  type: 'crop' | 'herb';
  tier: number;
  seedsPerPlot: number;
  yieldPerSeed: number;       // base yield (no premium)
  yieldPerSeedPremium: number; // with premium
  npcPrice: number;            // NPC merchant seed price (itemvalue from game data)
}

export interface AnimalItem {
  babyId: string;
  grownId: string;
  mountId?: string;
  name: string;
  tier: number;
  type: 'horse' | 'ox' | 'rare';
  perPlot: number;            // animals per pasture plot
  feedCropTier: number;       // what tier crop to feed
  feedAmount: number;         // crops needed per animal
  npcPrice: number;           // NPC merchant baby price
}

// NPC prices from in-game Farming Merchant (verified from screenshots)
export const CROPS: FarmItem[] = [
  { seedId: 'T1_FARM_CARROT_SEED', outputId: 'T1_CARROT', name: 'Carrot', type: 'crop', tier: 1, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 2312 },
  { seedId: 'T2_FARM_BEAN_SEED', outputId: 'T2_BEAN', name: 'Bean', type: 'crop', tier: 2, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 3468 },
  { seedId: 'T3_FARM_WHEAT_SEED', outputId: 'T3_WHEAT', name: 'Wheat', type: 'crop', tier: 3, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 5780 },
  { seedId: 'T4_FARM_TURNIP_SEED', outputId: 'T4_TURNIP', name: 'Turnip', type: 'crop', tier: 4, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 8670 },
  { seedId: 'T5_FARM_CABBAGE_SEED', outputId: 'T5_CABBAGE', name: 'Cabbage', type: 'crop', tier: 5, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 11560 },
  { seedId: 'T6_FARM_POTATO_SEED', outputId: 'T6_POTATO', name: 'Potato', type: 'crop', tier: 6, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 17340 },
  { seedId: 'T7_FARM_CORN_SEED', outputId: 'T7_CORN', name: 'Corn', type: 'crop', tier: 7, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 26010 },
  { seedId: 'T8_FARM_PUMPKIN_SEED', outputId: 'T8_PUMPKIN', name: 'Pumpkin', type: 'crop', tier: 8, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 34680 },
];

export const HERBS: FarmItem[] = [
  { seedId: 'T2_FARM_AGARIC_SEED', outputId: 'T2_AGARIC', name: 'Agaric', type: 'herb', tier: 2, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 3468 },
  { seedId: 'T3_FARM_COMFREY_SEED', outputId: 'T3_COMFREY', name: 'Comfrey', type: 'herb', tier: 3, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 5780 },
  { seedId: 'T4_FARM_BURDOCK_SEED', outputId: 'T4_BURDOCK', name: 'Burdock', type: 'herb', tier: 4, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 8670 },
  { seedId: 'T5_FARM_TEASEL_SEED', outputId: 'T5_TEASEL', name: 'Teasel', type: 'herb', tier: 5, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 11560 },
  { seedId: 'T6_FARM_FOXGLOVE_SEED', outputId: 'T6_FOXGLOVE', name: 'Foxglove', type: 'herb', tier: 6, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 17340 },
  { seedId: 'T7_FARM_MULLEIN_SEED', outputId: 'T7_MULLEIN', name: 'Mullein', type: 'herb', tier: 7, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 26010 },
  { seedId: 'T8_FARM_YARROW_SEED', outputId: 'T8_YARROW', name: 'Yarrow', type: 'herb', tier: 8, seedsPerPlot: 9, yieldPerSeed: 4, yieldPerSeedPremium: 9, npcPrice: 34680 },
];

// NPC baby animal prices from in-game Farming Merchant
export const ANIMALS: AnimalItem[] = [
  // Chickens/Goats/Geese/Sheep/Pigs/Cows (pasture animals)
  { babyId: 'T3_FARM_CHICKEN_BABY', grownId: 'T3_FARM_CHICKEN_GROWN', name: 'Chicken', tier: 3, type: 'ox', perPlot: 5, feedCropTier: 1, feedAmount: 10, npcPrice: 5780 },
  { babyId: 'T4_FARM_GOAT_BABY', grownId: 'T4_FARM_GOAT_GROWN', name: 'Goat', tier: 4, type: 'ox', perPlot: 4, feedCropTier: 2, feedAmount: 10, npcPrice: 8670 },
  { babyId: 'T5_FARM_GOOSE_BABY', grownId: 'T5_FARM_GOOSE_GROWN', name: 'Goose', tier: 5, type: 'ox', perPlot: 3, feedCropTier: 3, feedAmount: 10, npcPrice: 11560 },
  { babyId: 'T6_FARM_SHEEP_BABY', grownId: 'T6_FARM_SHEEP_GROWN', name: 'Sheep', tier: 6, type: 'ox', perPlot: 2, feedCropTier: 4, feedAmount: 10, npcPrice: 17340 },
  { babyId: 'T7_FARM_PIG_BABY', grownId: 'T7_FARM_PIG_GROWN', name: 'Pig', tier: 7, type: 'ox', perPlot: 1, feedCropTier: 5, feedAmount: 10, npcPrice: 26010 },
  { babyId: 'T8_FARM_COW_BABY', grownId: 'T8_FARM_COW_GROWN', name: 'Cow', tier: 8, type: 'ox', perPlot: 1, feedCropTier: 6, feedAmount: 10, npcPrice: 34680 },
  // Horses (foals)
  { babyId: 'T3_FARM_HORSE_BABY', grownId: 'T3_FARM_HORSE_GROWN', mountId: 'T3_MOUNT_HORSE', name: 'Riding Horse', tier: 3, type: 'horse', perPlot: 5, feedCropTier: 1, feedAmount: 10, npcPrice: 28900 },
  { babyId: 'T4_FARM_HORSE_BABY', grownId: 'T4_FARM_HORSE_GROWN', mountId: 'T4_MOUNT_HORSE', name: 'Armored Horse', tier: 4, type: 'horse', perPlot: 4, feedCropTier: 2, feedAmount: 10, npcPrice: 86700 },
  { babyId: 'T5_FARM_HORSE_BABY', grownId: 'T5_FARM_HORSE_GROWN', mountId: 'T5_MOUNT_HORSE', name: 'War Horse', tier: 5, type: 'horse', perPlot: 3, feedCropTier: 3, feedAmount: 10, npcPrice: 260000 },
  { babyId: 'T6_FARM_HORSE_BABY', grownId: 'T6_FARM_HORSE_GROWN', mountId: 'T6_MOUNT_HORSE', name: 'T6 Horse', tier: 6, type: 'horse', perPlot: 2, feedCropTier: 4, feedAmount: 10, npcPrice: 780000 },
  { babyId: 'T7_FARM_HORSE_BABY', grownId: 'T7_FARM_HORSE_GROWN', mountId: 'T7_MOUNT_HORSE', name: 'T7 Horse', tier: 7, type: 'horse', perPlot: 1, feedCropTier: 5, feedAmount: 10, npcPrice: 2340000 },
  { babyId: 'T8_FARM_HORSE_BABY', grownId: 'T8_FARM_HORSE_GROWN', mountId: 'T8_MOUNT_HORSE', name: 'T8 Horse', tier: 8, type: 'horse', perPlot: 1, feedCropTier: 6, feedAmount: 10, npcPrice: 7020000 },
  // Oxen
  { babyId: 'T3_FARM_OX_BABY', grownId: 'T3_FARM_OX_GROWN', mountId: 'T3_MOUNT_OX', name: 'Transport Ox', tier: 3, type: 'ox', perPlot: 5, feedCropTier: 1, feedAmount: 10, npcPrice: 28900 },
  { babyId: 'T4_FARM_OX_BABY', grownId: 'T4_FARM_OX_GROWN', mountId: 'T4_MOUNT_OX', name: 'T4 Ox', tier: 4, type: 'ox', perPlot: 4, feedCropTier: 2, feedAmount: 10, npcPrice: 86700 },
  { babyId: 'T5_FARM_OX_BABY', grownId: 'T5_FARM_OX_GROWN', mountId: 'T5_MOUNT_OX', name: 'T5 Ox', tier: 5, type: 'ox', perPlot: 3, feedCropTier: 3, feedAmount: 10, npcPrice: 260000 },
  { babyId: 'T6_FARM_OX_BABY', grownId: 'T6_FARM_OX_GROWN', mountId: 'T6_MOUNT_OX', name: 'T6 Ox', tier: 6, type: 'ox', perPlot: 2, feedCropTier: 4, feedAmount: 10, npcPrice: 780000 },
  { babyId: 'T7_FARM_OX_BABY', grownId: 'T7_FARM_OX_GROWN', mountId: 'T7_MOUNT_OX', name: 'T7 Ox', tier: 7, type: 'ox', perPlot: 1, feedCropTier: 5, feedAmount: 10, npcPrice: 2340000 },
  { babyId: 'T8_FARM_OX_BABY', grownId: 'T8_FARM_OX_GROWN', mountId: 'T8_MOUNT_OX', name: 'T8 Ox', tier: 8, type: 'ox', perPlot: 1, feedCropTier: 6, feedAmount: 10, npcPrice: 7020000 },
];

export const ALL_FARM_ITEMS = [...CROPS, ...HERBS];
export const ALL_ANIMALS = ANIMALS;

// City farming bonuses
export const CITY_FARM_BONUS: Record<string, string[]> = {
  'Lymhurst': ['crop', 'herb'],
  'Thetford': ['crop', 'herb'],
  'Bridgewatch': [],
  'Fort Sterling': [],
  'Martlock': [],
  'Caerleon': [],
};
