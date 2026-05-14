/**
 * Same-city chain-transmute path search.
 *
 * The transmute graph is a DAG: tier and enchant can only go UP, never
 * down, so cycles are impossible. From any source tier.enchant we want
 * the cheapest cumulative silver cost to reach any target tier.enchant,
 * paying only the transmute step costs along the way (intermediate item
 * prices don't matter — we don't buy/sell intermediates).
 *
 * Example: T4.0 → T5.0 → T5.1 in three steps, cost = 909 + 2324 = 3233.
 * If T4.0 + 3233 is cheaper than T5.0 alone, chaining beats direct.
 */

import { TRANSMUTATION_STEPS } from './calculations';
import type { PresetCost } from './types';

export interface ChainPath {
  /** Ordered list of tier.enchant labels: [source, ..., target]. */
  nodes: string[];
  /** Sum of silver costs across every transmute step in the path. */
  totalStepCost: number;
}

/**
 * For one starting node, return the cheapest path to every target node
 * reachable through the transmute graph. Uses topological-order DP over
 * the DAG so we always relax predecessors before successors.
 */
export function shortestPathsFrom(
  source: string,
  presets: PresetCost[],
): Map<string, ChainPath> {
  const costOf = (from: string, to: string): number | undefined => {
    const match = presets.find(p => p.from === from && p.to === to);
    return match?.cost;
  };

  // Adjacency from a node → outgoing edges.
  const adjacency = new Map<string, { to: string; cost: number }[]>();
  for (const step of TRANSMUTATION_STEPS) {
    const c = costOf(step.from, step.to);
    if (c === undefined || c < 0) continue;
    if (!adjacency.has(step.from)) adjacency.set(step.from, []);
    adjacency.get(step.from)!.push({ to: step.to, cost: c });
  }

  // Topological order — for our DAG it's just lexicographic on (tier, enchant).
  const nodes = collectAllNodes();
  const indexOf = new Map(nodes.map((n, i) => [n, i]));

  // Sort by (tier, enchant). Since we always go UP, processing in this
  // order means every node's predecessors are settled by the time we
  // visit it. We still iterate forward from the source via BFS so we
  // skip unreachable nodes entirely.
  const best = new Map<string, ChainPath>();
  best.set(source, { nodes: [source], totalStepCost: 0 });

  const sortedReachable = nodes
    .filter(n => indexOf.get(n)! >= indexOf.get(source)!)
    .sort((a, b) => compareNodes(a, b));

  for (const node of sortedReachable) {
    const current = best.get(node);
    if (!current) continue;
    const out = adjacency.get(node) || [];
    for (const edge of out) {
      const newCost = current.totalStepCost + edge.cost;
      const newPath = [...current.nodes, edge.to];
      const existing = best.get(edge.to);
      if (!existing || newCost < existing.totalStepCost) {
        best.set(edge.to, { nodes: newPath, totalStepCost: newCost });
      }
    }
  }

  // Strip the trivial source-only entry — a 1-element "path" isn't a
  // transmute opportunity.
  best.delete(source);
  return best;
}

/** Every (source, target) pair where target is reachable from source. */
export function allChainOpportunities(presets: PresetCost[]): Array<{
  source: string;
  target: string;
  path: ChainPath;
}> {
  const out: Array<{ source: string; target: string; path: ChainPath }> = [];
  const nodes = collectAllNodes();
  for (const source of nodes) {
    const paths = shortestPathsFrom(source, presets);
    for (const [target, path] of paths.entries()) {
      out.push({ source, target, path });
    }
  }
  return out;
}

function collectAllNodes(): string[] {
  const set = new Set<string>();
  for (const step of TRANSMUTATION_STEPS) {
    set.add(step.from);
    set.add(step.to);
  }
  return Array.from(set);
}

function compareNodes(a: string, b: string): number {
  const [at, ae] = a.split('.').map(Number);
  const [bt, be] = b.split('.').map(Number);
  if (at !== bt) return at - bt;
  return ae - be;
}
