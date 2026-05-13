/**
 * Laborer reference data + pure calculations.
 *
 * House → laborer journal cycle:
 *   1. Buy or craft empty journals (tier T_n)
 *   2. Hand to laborer (lives in your house, requires happiness)
 *   3. Wait the cycle time (24h regardless of tier)
 *   4. Receive: rewards (resources/items matching laborer type) + filled journal
 *   5. Sell rewards + filled journal on the AH
 *
 * The model below treats each laborer cycle as:
 *   profit / cycle =
 *     (sellPriceOfRewards − marketTax) +
 *     (filledJournalPrice − emptyJournalCost − marketTax)
 *     − happinessUpkeep
 *
 * The user enters live prices (no game API for laborer reward output) and
 * the calculator handles the math + ROI on building upgrades.
 *
 * Numbers below are *defaults*. The exact rewards-per-cycle and journal
 * fame yield differ between laborer types and patches — the user should
 * override with what their own laborers produce.
 */

export type LaborerType =
  | 'lumberjack'    // wood
  | 'miner'         // ore
  | 'stonemason'    // stone
  | 'fiber'         // fiber
  | 'skinner'       // hide
  | 'blacksmith'    // metal bars
  | 'fletcher'      // planks
  | 'mage'          // cloth (cloth crafter)
  | 'tanner'        // leather
  | 'imbuer'        // stone blocks
  | 'cook';         // meat / meals

export interface LaborerInfo {
  id: LaborerType;
  name: string;
  /** Journal type sold/filled on the AH. Use the canonical journal item id. */
  journalIdRoot: string;     // e.g. 'JOURNAL_LUMBERJACK'
  /** Friendly category — affects expected output items the user enters. */
  rewardLabel: string;
}

export const LABORERS: LaborerInfo[] = [
  { id: 'lumberjack', name: 'Lumberjack', journalIdRoot: 'JOURNAL_LUMBERJACK',  rewardLabel: 'Logs' },
  { id: 'miner',      name: 'Miner',      journalIdRoot: 'JOURNAL_MINER',       rewardLabel: 'Ore' },
  { id: 'stonemason', name: 'Stonemason', journalIdRoot: 'JOURNAL_STONEMASON',  rewardLabel: 'Rock' },
  { id: 'fiber',      name: 'Fiber Harvester', journalIdRoot: 'JOURNAL_FIBER',  rewardLabel: 'Fiber' },
  { id: 'skinner',    name: 'Skinner',    journalIdRoot: 'JOURNAL_HIDE',        rewardLabel: 'Hide' },
  { id: 'blacksmith', name: 'Blacksmith', journalIdRoot: 'JOURNAL_BLACKSMITH',  rewardLabel: 'Metal bars' },
  { id: 'fletcher',   name: 'Fletcher',   journalIdRoot: 'JOURNAL_FLETCHER',    rewardLabel: 'Planks' },
  { id: 'mage',       name: 'Mage',       journalIdRoot: 'JOURNAL_MAGE',        rewardLabel: 'Cloth' },
  { id: 'tanner',     name: 'Leatherworker', journalIdRoot: 'JOURNAL_TANNER',   rewardLabel: 'Leather' },
  { id: 'imbuer',     name: 'Imbuer',     journalIdRoot: 'JOURNAL_IMBUER',      rewardLabel: 'Stone blocks' },
  { id: 'cook',       name: 'Cook',       journalIdRoot: 'JOURNAL_COOK',        rewardLabel: 'Meat / meals' },
];

/**
 * Reference base reward quantity per cycle at 100% happiness, tier .0 journal.
 * Real values vary patch to patch — these are conservative starting points the
 * user can override. They represent "approximate units of the listed reward".
 */
export const DEFAULT_REWARD_QTY: Record<number, number> = {
  3: 60,
  4: 80,
  5: 110,
  6: 140,
  7: 180,
  8: 220,
};

/** Happiness multiplier on reward quantity (linear scale). */
export function happinessMultiplier(happinessPct: number): number {
  return Math.max(0, happinessPct) / 100;
}

/** House upgrade cost reference (rough silver — for ROI hints only). */
export const HOUSE_UPGRADE_COST: Record<number, number> = {
  3: 200_000,
  4: 500_000,
  5: 1_200_000,
  6: 3_000_000,
  7: 7_500_000,
  8: 18_000_000,
};

export interface LaborerInput {
  /** Building / journal tier (3-8). */
  tier: number;
  /** Reward quantity received per cycle at base. User overrides default. */
  rewardQty: number;
  /** Sell price per reward unit (silver). */
  rewardPrice: number;
  /** Empty journal cost (buy or craft) per cycle. */
  emptyJournalCost: number;
  /** Filled journal sell price per cycle. */
  filledJournalPrice: number;
  /** Happiness % (0-100). 100% = full reward. */
  happinessPct: number;
  /** Premium player? Affects market tax. */
  premium: boolean;
  /** Happiness upkeep per cycle (silver). User-entered. */
  upkeep: number;
  /** Optional: building upgrade cost — for ROI breakdown. */
  upgradeFromCost?: number;
  upgradeToCost?: number;
}

export interface LaborerOutput {
  rewardsRevenue: number;
  rewardsTax: number;
  journalsRevenue: number;
  journalsTax: number;
  journalsCost: number;
  upkeep: number;
  netPerCycle: number;
  netPerDay: number;        // = netPerCycle, cycle is 24h
  cyclesToPayoffUpgrade?: number;
  daysToPayoffUpgrade?: number;
  /** Sanity flags surfaced as warnings in the UI. */
  warnings: string[];
}

export function calculateLaborer(input: LaborerInput): LaborerOutput {
  const tax = input.premium ? 0.065 : 0.105;

  const effRewards = Math.max(0, input.rewardQty) * happinessMultiplier(input.happinessPct);
  const rewardsRevenueGross = effRewards * Math.max(0, input.rewardPrice);
  const rewardsTax = rewardsRevenueGross * tax;
  const rewardsRevenue = rewardsRevenueGross - rewardsTax;

  const journalsRevenueGross = Math.max(0, input.filledJournalPrice);
  const journalsTax = journalsRevenueGross * tax;
  const journalsRevenue = journalsRevenueGross - journalsTax;
  const journalsCost = Math.max(0, input.emptyJournalCost);

  const upkeep = Math.max(0, input.upkeep);
  const netPerCycle = rewardsRevenue + journalsRevenue - journalsCost - upkeep;
  const netPerDay = netPerCycle;

  let cyclesToPayoff: number | undefined;
  let daysToPayoff: number | undefined;
  if (
    input.upgradeFromCost !== undefined &&
    input.upgradeToCost !== undefined &&
    input.upgradeToCost > input.upgradeFromCost &&
    netPerCycle > 0
  ) {
    const delta = input.upgradeToCost - input.upgradeFromCost;
    cyclesToPayoff = delta / netPerCycle;
    daysToPayoff = cyclesToPayoff;
  }

  const warnings: string[] = [];
  if (input.happinessPct < 70) {
    warnings.push('Happiness below 70% — feed your laborer or expect reduced rewards.');
  }
  if (netPerCycle <= 0) {
    warnings.push('Net per cycle is non-positive — check prices, journal cost, or upkeep.');
  }
  if (input.emptyJournalCost >= input.filledJournalPrice && input.filledJournalPrice > 0) {
    warnings.push('Empty journal costs more than the filled price — journal arbitrage is inverted.');
  }

  return {
    rewardsRevenue,
    rewardsTax,
    journalsRevenue,
    journalsTax,
    journalsCost,
    upkeep,
    netPerCycle,
    netPerDay,
    cyclesToPayoffUpgrade: cyclesToPayoff,
    daysToPayoffUpgrade: daysToPayoff,
    warnings,
  };
}
