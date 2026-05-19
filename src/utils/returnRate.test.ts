import { describe, it, expect } from 'vitest';
import { calculateReturnRate, calculateLPB, lpbToReturnRate } from './returnRate';

describe('lpbToReturnRate', () => {
  it('zero LPB → zero RR', () => {
    expect(lpbToReturnRate(0)).toBe(0);
  });

  it('LPB 18 (base only) → ~15.25% RR', () => {
    expect(lpbToReturnRate(18)).toBeCloseTo(0.1525, 3);
  });

  it('LPB 92 (base + city + focus) → ~47.9% RR', () => {
    expect(lpbToReturnRate(92)).toBeCloseTo(0.479, 3);
  });
});

describe('calculateLPB', () => {
  it('non-spec city, no focus → 18 LPB (base only)', () => {
    expect(calculateLPB('Bridgewatch', 'sword', false)).toBe(18);
  });

  it('spec city for the subcategory, no focus → 33 LPB', () => {
    expect(calculateLPB('Lymhurst', 'sword', false)).toBe(33);
  });

  it('spec city + focus → 92 LPB (18 + 15 + 59)', () => {
    expect(calculateLPB('Lymhurst', 'sword', true)).toBe(92);
  });

  it('non-spec city + focus → 77 LPB (18 + 59, no city bonus)', () => {
    expect(calculateLPB('Bridgewatch', 'sword', true)).toBe(77);
  });

  it('daily station bonus adds to LPB', () => {
    expect(calculateLPB('Bridgewatch', 'sword', false, 0, 10)).toBe(28);
  });
});

describe('calculateReturnRate', () => {
  it('Lymhurst sword + focus = ~47.9% RR', () => {
    expect(calculateReturnRate('Lymhurst', 'sword', true)).toBeCloseTo(0.479, 3);
  });

  it('Bridgewatch sword (no spec, no focus) = ~15.25% RR', () => {
    expect(calculateReturnRate('Bridgewatch', 'sword', false)).toBeCloseTo(0.1525, 3);
  });

  it('caps at 0.999 even with absurd LPB inputs', () => {
    // Not a realistic scenario but guards against UI passing wild custom bonuses.
    expect(calculateReturnRate('Lymhurst', 'sword', true, 0, 10_000)).toBeLessThan(1);
    expect(calculateReturnRate('Lymhurst', 'sword', true, 0, 10_000)).toBeGreaterThan(0.99);
  });
});
