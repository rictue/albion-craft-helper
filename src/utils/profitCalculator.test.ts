import { describe, it, expect } from 'vitest';
import { calculateCrafting } from './profitCalculator';
import { DEFAULT_FEE_SETTINGS } from './marketFees';
import type { ItemDefinition } from '../types';

// Test fixture: a generic T6 sword with simple recipe. Doubles as a smoke
// test that every field on CraftingResult populates with sensible values.
const SWORD: ItemDefinition = {
  baseId: 'MAIN_SWORD',
  name: 'Broadsword',
  category: 'weapon_1h',
  subcategory: 'sword',
  recipe: [
    { materialBase: 'METALBAR', count: 16 },
    { materialBase: 'LEATHER', count: 8 },
  ],
};

describe('calculateCrafting', () => {
  it('happy path: positive profit with reasonable inputs', () => {
    const prices = new Map<string, number>([
      ['T6_METALBAR', 1500],
      ['T6_LEATHER', 1200],
      ['T6_MAIN_SWORD', 50_000],
    ]);
    const result = calculateCrafting(
      SWORD,
      6,
      0,
      1,
      0.25, // return rate
      DEFAULT_FEE_SETTINGS,
      0, // no station fee
      prices,
    );
    expect(result.sellPrice).toBe(50_000);
    expect(result.totalMaterialCost).toBe(16 * 1500 + 8 * 1200); // 33,600
    // effective = raw * (1 - RR) + 0 artifact = 33600 * 0.75 = 25,200
    expect(result.effectiveMaterialCost).toBeCloseTo(25_200, 0);
    // profit = sell * 0.96 (premium instant sell) - 25,200 = 48,000 - 25,200 = 22,800
    expect(result.profit).toBeCloseTo(22_800, 0);
    expect(result.profitMargin).toBeGreaterThan(0);
  });

  it('return rate of 0 = pay full material cost', () => {
    const prices = new Map<string, number>([
      ['T6_METALBAR', 1500],
      ['T6_LEATHER', 1200],
      ['T6_MAIN_SWORD', 50_000],
    ]);
    const result = calculateCrafting(SWORD, 6, 0, 1, 0, DEFAULT_FEE_SETTINGS, 0, prices);
    expect(result.effectiveMaterialCost).toBeCloseTo(33_600, 0);
  });

  it('quantity scales linearly on both sides', () => {
    const prices = new Map<string, number>([
      ['T6_METALBAR', 1500],
      ['T6_LEATHER', 1200],
      ['T6_MAIN_SWORD', 50_000],
    ]);
    const single = calculateCrafting(SWORD, 6, 0, 1, 0.25, DEFAULT_FEE_SETTINGS, 0, prices);
    const batch = calculateCrafting(SWORD, 6, 0, 10, 0.25, DEFAULT_FEE_SETTINGS, 0, prices);
    expect(batch.profit).toBeCloseTo(single.profit * 10, 0);
    expect(batch.sellPrice).toBe(single.sellPrice * 10);
  });

  it('zero output price → still produces a result with negative profit', () => {
    const prices = new Map<string, number>([
      ['T6_METALBAR', 1500],
      ['T6_LEATHER', 1200],
      // No sell price for the sword
    ]);
    const result = calculateCrafting(SWORD, 6, 0, 1, 0.25, DEFAULT_FEE_SETTINGS, 0, prices);
    expect(result.sellPrice).toBe(0);
    expect(result.profit).toBeLessThan(0); // all material cost, no revenue
  });

  it('artifact items: artifact never gets return rate', () => {
    const ARTIFACT_SWORD: ItemDefinition = {
      ...SWORD,
      baseId: 'MAIN_SCIMITAR_MORGANA',
      name: 'Clarent Blade',
      artifactId: 'ARTEFACT_MAIN_SCIMITAR_MORGANA',
    };
    const prices = new Map<string, number>([
      ['T6_METALBAR', 1500],
      ['T6_LEATHER', 1200],
      ['T6_ARTEFACT_MAIN_SCIMITAR_MORGANA', 100_000],
      ['T6_MAIN_SCIMITAR_MORGANA', 250_000],
    ]);
    const result = calculateCrafting(ARTIFACT_SWORD, 6, 0, 1, 0.25, DEFAULT_FEE_SETTINGS, 0, prices);
    // effective = raw * 0.75 + artifact (no RR) = 33600 * 0.75 + 100000 = 25200 + 100000 = 125,200
    expect(result.effectiveMaterialCost).toBeCloseTo(125_200, 0);
  });
});
