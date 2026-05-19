import { describe, it, expect } from 'vitest';
import {
  getSaleMultiplier,
  getEntryMultiplier,
  DEFAULT_FEE_SETTINGS,
  PRIVATE_SALE_MULTIPLIER,
} from './marketFees';

describe('getSaleMultiplier', () => {
  it('premium + instant sell (buy order exit) = 4% tax only', () => {
    const m = getSaleMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'premium',
      exitSource: 'buyOrder',
    });
    expect(m).toBeCloseTo(0.96, 4);
  });

  it('premium + sell order exit = 4% tax + 2.5% setup fee', () => {
    const m = getSaleMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'premium',
      exitSource: 'sellOrder',
    });
    expect(m).toBeCloseTo(0.935, 4);
  });

  it('non-premium + instant sell = 8% tax only', () => {
    const m = getSaleMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'normal',
      exitSource: 'buyOrder',
    });
    expect(m).toBeCloseTo(0.92, 4);
  });

  it('non-premium + sell order = 8% + 2.5% = 10.5%', () => {
    const m = getSaleMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'normal',
      exitSource: 'sellOrder',
    });
    expect(m).toBeCloseTo(0.895, 4);
  });

  it('private sale bypasses marketplace entirely', () => {
    const m = getSaleMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      saleMode: 'private',
    });
    expect(m).toBe(PRIVATE_SALE_MULTIPLIER);
  });
});

describe('getEntryMultiplier', () => {
  it('instant buy (sell order entry) = no setup fee', () => {
    const m = getEntryMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'premium',
      entrySource: 'sellOrder',
    });
    expect(m).toBeCloseTo(1.0, 4);
  });

  it('buy order entry = +2.5% setup fee (premium)', () => {
    const m = getEntryMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      taxProfile: 'premium',
      entrySource: 'buyOrder',
    });
    expect(m).toBeCloseTo(1.025, 4);
  });

  it('entry side ignores saleMode — even private sellers pay entry fees', () => {
    const m = getEntryMultiplier({
      ...DEFAULT_FEE_SETTINGS,
      saleMode: 'private',
      taxProfile: 'premium',
      entrySource: 'buyOrder',
    });
    expect(m).toBeCloseTo(1.025, 4);
  });
});
