import { describe, it, expect } from 'vitest';
import { shortestPathsFrom, allChainOpportunities } from './chainPathfinder';
import type { PresetCost } from './types';

// Reduced preset set covering enough of the Albion graph to exercise both
// same-tier and cross-tier transmute edges without dragging in the full
// 40-entry list.
const PRESETS: PresetCost[] = [
  { id: '4.0-4.1', from: '4.0', to: '4.1', cost: 1000 },
  { id: '4.1-4.2', from: '4.1', to: '4.2', cost: 2000 },
  { id: '4.0-5.0', from: '4.0', to: '5.0', cost: 900 },
  { id: '5.0-5.1', from: '5.0', to: '5.1', cost: 2300 },
  { id: '4.1-5.1', from: '4.1', to: '5.1', cost: 1800 },
];

describe('shortestPathsFrom', () => {
  it('finds direct 1-hop targets', () => {
    const paths = shortestPathsFrom('4.0', PRESETS);
    expect(paths.has('4.1')).toBe(true);
    expect(paths.get('4.1')?.totalStepCost).toBe(1000);
    expect(paths.get('4.1')?.nodes).toEqual(['4.0', '4.1']);
  });

  it('finds multi-hop chained targets', () => {
    const paths = shortestPathsFrom('4.0', PRESETS);
    // 4.0 → 4.1 → 4.2 = 1000 + 2000 = 3000
    expect(paths.get('4.2')?.totalStepCost).toBe(3000);
    expect(paths.get('4.2')?.nodes).toEqual(['4.0', '4.1', '4.2']);
  });

  it('picks the cheaper path when multiple exist', () => {
    const paths = shortestPathsFrom('4.0', PRESETS);
    // To reach 5.1 either:
    //   4.0 → 5.0 → 5.1 = 900 + 2300 = 3200
    //   4.0 → 4.1 → 5.1 = 1000 + 1800 = 2800  ← cheaper
    const path = paths.get('5.1');
    expect(path?.totalStepCost).toBe(2800);
    expect(path?.nodes).toEqual(['4.0', '4.1', '5.1']);
  });

  it('drops the trivial source-only entry', () => {
    const paths = shortestPathsFrom('4.0', PRESETS);
    expect(paths.has('4.0')).toBe(false);
  });

  it('returns empty when source has no outgoing edges', () => {
    // 4.2 is a leaf in this reduced preset graph (no edges leaving it).
    const paths = shortestPathsFrom('4.2', PRESETS);
    expect(paths.size).toBe(0);
  });
});

describe('allChainOpportunities', () => {
  it('emits a row for every reachable (source, target) pair', () => {
    const opportunities = allChainOpportunities(PRESETS);
    const pairs = opportunities.map(o => `${o.source}→${o.target}`);
    // 4.0 reaches 4.1, 4.2, 5.0, 5.1 → 4 pairs
    // 4.1 reaches 4.2, 5.1 → 2 pairs
    // 5.0 reaches 5.1 → 1 pair
    // Total = 7
    expect(pairs).toContain('4.0→5.1');
    expect(pairs).toContain('4.1→5.1');
    expect(pairs).toContain('5.0→5.1');
    expect(opportunities.length).toBe(7);
  });

  it('each entry carries the cheapest path', () => {
    const opportunities = allChainOpportunities(PRESETS);
    const fourToFiveOne = opportunities.find(o => o.source === '4.0' && o.target === '5.1');
    expect(fourToFiveOne?.path.totalStepCost).toBe(2800);
  });
});
