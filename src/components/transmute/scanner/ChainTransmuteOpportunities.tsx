/**
 * Multi-step (chain) transmutation profit scanner.
 *
 * Strategy: for each resource, for every pair (source S, target T) where
 * T is reachable from S in the transmute DAG, compute:
 *
 *   profit = sellPrice(T) * saleMult
 *          - buyPrice(S) * entryMult
 *          - sum of step silver costs along the cheapest S→T path
 *
 * We don't need intermediate-tier prices because we never sell or buy
 * intermediates — they're just transmute substrate.
 *
 * The scanner highlights "chain wins" — rows where chaining through
 * multiple steps is cheaper than the shortest direct (1-step) acquisition
 * of the target.
 */

import { useEffect, useMemo, useState } from 'react';
import { GitBranch, TrendingUp } from 'lucide-react';
import type { PresetCost, PriceBook, ResourceType } from './types';
import { RESOURCE_TYPES } from './calculations';
import { allChainOpportunities } from './chainPathfinder';
import type { ChainPath } from './chainPathfinder';
import { getSaleMultiplier, getEntryMultiplier } from '../../../utils/marketFees';
import type { MarketFeeSettings } from '../../../utils/marketFees';

interface Props {
  priceBook: PriceBook;
  presets: PresetCost[];
  feeSettings: MarketFeeSettings;
}

type ExitMode = 'sellOrder' | 'instantSell' | 'discord';

interface ExitScenario {
  mode: ExitMode;
  /** What the calc multiplied the reference price by. */
  multiplier: number;
  /** AODP price the scenario is referenced from (sell-order or buy-order side). */
  referencePrice: number;
  netRevenue: number;
  profit: number;
  marginPct: number;
}

interface Row {
  id: string;
  resource: ResourceType;
  source: string;
  target: string;
  path: ChainPath;
  hops: number;
  inputPrice: number;
  totalCostPerUnit: number;
  /** Per-exit-mode breakdown so the user can pick whichever route fits. */
  scenarios: ExitScenario[];
  /** Best (highest) profit across scenarios — drives the row's sort + filter. */
  bestProfit: number;
  /** Which exit mode produced bestProfit. */
  bestMode: ExitMode;
  /** Cheapest 1-step alternative to acquire target (if exists). */
  directBuyCost?: number;
  /** Savings vs the best 1-step alternative (positive = chain is better). */
  savingsVsDirect?: number;
}

const EXIT_LABELS: Record<ExitMode, string> = {
  sellOrder:   'Sell order',
  instantSell: 'Buy order',
  discord:     'Discord −5%',
};

const EXIT_HINTS: Record<ExitMode, string> = {
  sellOrder:   'Post, wait',
  instantSell: 'Sell into top buy now',
  discord:     'Private sale, no tax',
};

const ONE_HOUR = 3_600_000;

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ChainTransmuteOpportunities({ priceBook, presets, feeSettings }: Props) {
  const [resourceFilter, setResourceFilter] = useState<ResourceType | 'all'>('all');
  const [minProfit, setMinProfit] = useState<number>(1000);
  const [maxHops, setMaxHops] = useState<number>(4);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(24);
  // Default OFF: the pure-silver "is chain cheaper than 1-step direct" check
  // ignores fill speed. In practice low-enchant inputs (.0/.1/.2) fill buy
  // orders in minutes while high-enchant inputs (.3/.4) can sit for days
  // because open-world drops at those enchants are far rarer. Players
  // rationally chain through low enchants even when direct is a few silver
  // cheaper, so we show every profitable chain by default and let power
  // users opt in to the strict "must beat 1-step direct" filter.
  const [chainOnlyWins, setChainOnlyWins] = useState<boolean>(false);

  // "now" snapshot kept in state (Date.now() inside render trips
  // react-hooks/purity).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const entryMult = getEntryMultiplier(feeSettings);

  // Three exit multipliers — sell-order (post + wait), instant-sell (sell
  // into a buy order), and Discord (-5%, no tax). Memoize so the object
  // identity is stable across renders; otherwise the downstream useMemo
  // would re-run on every keystroke.
  const exitMults = useMemo<Record<ExitMode, number>>(() => ({
    sellOrder:   getSaleMultiplier({ ...feeSettings, saleMode: 'marketplace', exitSource: 'sellOrder' }),
    instantSell: getSaleMultiplier({ ...feeSettings, saleMode: 'marketplace', exitSource: 'buyOrder'  }),
    discord:     getSaleMultiplier({ ...feeSettings, saleMode: 'private' }),
  }), [feeSettings]);

  const rows = useMemo<Row[]>(() => {
    const pairs = allChainOpportunities(presets);
    const ageCutoff = maxAgeHours > 0 ? now - maxAgeHours * ONE_HOUR : 0;

    // For each (resource, target), remember the cheapest 1-step acquisition
    // path so we can compute savingsVsDirect on multi-step entries to the
    // same target. The map key is "resource|target".
    const directBy = new Map<string, number>();
    for (const { source, target, path } of pairs) {
      if (path.nodes.length !== 2) continue;
      for (const resource of RESOURCE_TYPES) {
        const inputPriceStr = feeSettings.entrySource === 'buyOrder'
          ? priceBook[resource]?.[source]?.buyOrder
          : priceBook[resource]?.[source]?.sellOrder;
        const inputPrice = toNumber(inputPriceStr);
        if (inputPrice <= 0) continue;
        const totalAcquisitionCost = inputPrice * entryMult + path.totalStepCost;
        const key = `${resource}|${target}`;
        const current = directBy.get(key);
        if (current === undefined || totalAcquisitionCost < current) {
          directBy.set(key, totalAcquisitionCost);
        }
      }
    }

    const out: Row[] = [];
    for (const { source, target, path } of pairs) {
      const hops = path.nodes.length - 1;
      // 1-step paths are already covered by the main scanner table on the
      // left — only multi-hop chains belong in this panel.
      if (hops < 2) continue;
      if (hops > maxHops) continue;

      for (const resource of RESOURCE_TYPES) {
        if (resourceFilter !== 'all' && resource !== resourceFilter) continue;
        const sourceCell = priceBook[resource]?.[source];
        const targetCell = priceBook[resource]?.[target];
        if (!sourceCell || !targetCell) continue;

        const inputPriceStr = feeSettings.entrySource === 'buyOrder'
          ? sourceCell.buyOrder
          : sourceCell.sellOrder;
        const inputPrice = toNumber(inputPriceStr);
        if (inputPrice <= 0) continue;

        // Pull BOTH target sides — we'll evaluate three exit routes:
        //  sellOrder (referenced from target's sell-order price),
        //  instantSell (referenced from target's buy-order price),
        //  discord (referenced from target's sell-order price, no tax).
        const targetSellOrderPrice = toNumber(targetCell.sellOrder);
        const targetBuyOrderPrice  = toNumber(targetCell.buyOrder);
        if (targetSellOrderPrice <= 0 && targetBuyOrderPrice <= 0) continue;

        // Staleness filter on the source side and on whichever target side
        // we have data for.
        if (ageCutoff > 0) {
          const inSideStr = feeSettings.entrySource === 'buyOrder'
            ? (sourceCell.buyConfirmedAt ?? sourceCell.buyDate)
            : (sourceCell.sellConfirmedAt ?? sourceCell.sellDate);
          if (inSideStr) {
            const t = Date.parse(inSideStr);
            if (Number.isFinite(t) && t < ageCutoff) continue;
          }
          // Take the freshest of the two target sides — if either side is
          // current, we trust the row enough to display it.
          const outDates = [
            targetCell.sellConfirmedAt ?? targetCell.sellDate,
            targetCell.buyConfirmedAt  ?? targetCell.buyDate,
          ].filter(Boolean) as string[];
          if (outDates.length > 0) {
            const ts = outDates.map(d => Date.parse(d)).filter(Number.isFinite);
            const freshest = ts.length ? Math.max(...ts) : 0;
            if (freshest > 0 && freshest < ageCutoff) continue;
          }
        }

        const totalCostPerUnit = inputPrice * entryMult + path.totalStepCost;
        const scenarios: ExitScenario[] = [];

        const pushScenario = (mode: ExitMode, refPrice: number) => {
          if (refPrice <= 0) return;
          const mult = exitMults[mode];
          const netRev = refPrice * mult;
          const profit = Math.floor(netRev - totalCostPerUnit);
          const margin = totalCostPerUnit > 0 ? (profit / totalCostPerUnit) * 100 : 0;
          scenarios.push({
            mode,
            multiplier: mult,
            referencePrice: refPrice,
            netRevenue: Math.floor(netRev),
            profit,
            marginPct: margin,
          });
        };

        pushScenario('sellOrder',   targetSellOrderPrice);
        pushScenario('instantSell', targetBuyOrderPrice);
        pushScenario('discord',     targetSellOrderPrice);

        if (scenarios.length === 0) continue;

        // Row gate: show the chain if ANY exit (sell order / buy order /
        // discord) clears the user's min-profit threshold. Earlier this
        // gate required the buy-order exit specifically, which hid
        // legitimate sell-order plays whenever AODP's buy-order side for
        // that target was missing or stale.
        const best = scenarios.reduce(
          (a, b) => (b.profit > a.profit ? b : a),
          scenarios[0],
        );
        if (best.profit < minProfit) continue;

        const directBuyCost = directBy.get(`${resource}|${target}`);
        const isMultiStep = hops > 1;
        const savingsVsDirect = (isMultiStep && directBuyCost !== undefined)
          ? directBuyCost - totalCostPerUnit
          : undefined;

        if (chainOnlyWins && isMultiStep && savingsVsDirect !== undefined && savingsVsDirect <= 0) {
          continue;
        }

        out.push({
          id: `${resource}-${path.nodes.join('>')}`,
          resource,
          source,
          target,
          path,
          hops,
          inputPrice,
          totalCostPerUnit: Math.floor(totalCostPerUnit),
          scenarios,
          bestProfit: best.profit,
          bestMode: best.mode,
          directBuyCost: directBuyCost !== undefined ? Math.floor(directBuyCost) : undefined,
          savingsVsDirect: savingsVsDirect !== undefined ? Math.floor(savingsVsDirect) : undefined,
        });
      }
    }

    return out
      .sort((a, b) => b.bestProfit - a.bestProfit)
      .slice(0, 200);
  }, [
    priceBook,
    presets,
    feeSettings,
    exitMults,
    entryMult,
    minProfit,
    maxHops,
    resourceFilter,
    maxAgeHours,
    chainOnlyWins,
    now,
  ]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Multi-step strategy</p>
          <h2 className="panel-title">Chain transmute</h2>
          <p className="mt-1 text-xs text-vellum/45">
            2+ hop paths only. Buy cheap source → transmute multiple steps → sell target. Same city.
            <span className="text-vellum/30"> 1-step flips are already in the scanner table on the left.</span>
          </p>
        </div>
        <GitBranch className="text-oldgold-300" size={22} />
      </div>

      {/* Controls */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Min profit
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={minProfit.toLocaleString('de-DE')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, '');
              setMinProfit(digits === '' ? 0 : Number(digits));
            }}
            className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none"
          />
        </label>
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Max hops
          </span>
          <input
            type="number"
            min={2}
            max={8}
            value={maxHops}
            onChange={(e) => setMaxHops(Math.max(2, Math.min(8, Number(e.target.value) || 2)))}
            className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none"
          />
        </label>
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Resource
          </span>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value as ResourceType | 'all')}
            className="w-full border-0 bg-transparent p-0 text-xs font-bold text-vellum outline-none"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all" style={{ backgroundColor: '#17100a', color: '#f3ead2' }}>All</option>
            {RESOURCE_TYPES.map((r) => (
              <option key={r} value={r} style={{ backgroundColor: '#17100a', color: '#f3ead2' }}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Max age (h)
          </span>
          <input
            type="number"
            min={0}
            max={168}
            value={maxAgeHours}
            onChange={(e) => setMaxAgeHours(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none"
          />
        </label>
      </div>

      {/* Chain-only-wins toggle */}
      <label className="mb-3 flex items-center justify-between gap-3 rounded border border-white/10 bg-ash-950/35 px-3 py-2 cursor-pointer">
        <span className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-vellum/75">
            Show only chain wins
          </span>
          <span className="text-[9.5px] text-vellum/40 normal-case tracking-normal">
            Hide multi-hop rows where direct 1-step is cheaper on paper. Off by default — low-enchant inputs fill buy orders much faster than high-enchant ones, so chaining is often the right call even when silver-cost says otherwise.
          </span>
        </span>
        <input
          type="checkbox"
          checked={chainOnlyWins}
          onChange={(e) => setChainOnlyWins(e.target.checked)}
          className="h-4 w-4 accent-oldgold-400"
        />
      </label>

      {/* Result list */}
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 bg-ash-950/35 px-4 py-6 text-center text-sm text-vellum/55">
          <TrendingUp size={18} className="mx-auto mb-2 text-vellum/40" />
          No profitable chains at this target.<br />
          Lower the min profit, raise max hops, or fetch fresh prices first.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
          {rows.map((row) => (
            <ChainCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-vellum/40 leading-snug">
        Math uses current Market Fees for source acquisition (entry) and target sale (exit), plus the silver
        cost of every step in the cheapest path. Intermediate prices are irrelevant — you never sell them.
      </div>
    </section>
  );
}

function ChainCard({ row }: { row: Row }) {
  const isWin = row.savingsVsDirect !== undefined && row.savingsVsDirect > 0;

  return (
    <div className={`rounded border px-2.5 py-2 ${
      isWin
        ? 'border-moss-300/50 bg-moss-500/10'
        : row.hops > 1
          ? 'border-oldgold-300/30 bg-oldgold-500/5'
          : 'border-white/10 bg-ash-900/50'
    }`}>
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="text-[12px] font-black text-vellum truncate">
          {row.resource}
        </div>
        <div className="flex items-center gap-1.5">
          {isWin && (
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-moss-300">
              chain win
            </span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-vellum/55">
            {row.hops}×hop
          </span>
        </div>
      </div>

      {/* Path */}
      <div className="font-mono text-[11px] text-oldgold-300 mb-1.5 tabular-nums">
        {row.path.nodes.join(' → ')}
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-2">
        <div className="text-vellum/55">Buy {row.source} at</div>
        <div className="text-right text-vellum tabular-nums">
          {row.inputPrice.toLocaleString('de-DE')}
        </div>

        <div className="text-vellum/55">+ transmute cost</div>
        <div className="text-right text-vellum tabular-nums">
          {row.path.totalStepCost.toLocaleString('de-DE')}
        </div>

        <div className="text-vellum/55">= total cost / unit</div>
        <div className="text-right text-vellum tabular-nums font-bold">
          {row.totalCostPerUnit.toLocaleString('de-DE')}
        </div>
      </div>

      {/* Per-exit comparison — sell order vs instant sell vs Discord */}
      <div className="rounded bg-ash-950/45 border border-white/5 p-1.5 space-y-0.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-vellum/45 mb-1 px-1">
          Exit options
        </div>
        {row.scenarios.map((s) => {
          const isBest = s.mode === row.bestMode;
          const isLoss = s.profit < 0;
          return (
            <div
              key={s.mode}
              className={`grid grid-cols-[1fr_auto_auto] items-baseline gap-2 px-1.5 py-0.5 rounded text-[11px] ${
                isBest ? 'bg-moss-500/15 ring-1 ring-moss-300/30' : ''
              }`}
            >
              <div>
                <span className={isBest ? 'text-moss-300 font-bold' : 'text-vellum/75'}>
                  {EXIT_LABELS[s.mode]}
                </span>
                <span className="text-vellum/35 text-[9px] ml-1">
                  @{s.referencePrice.toLocaleString('de-DE')}
                </span>
              </div>
              <div className="text-vellum/55 tabular-nums text-[10px]">
                net {s.netRevenue.toLocaleString('de-DE')}
              </div>
              <div className={`tabular-nums font-bold text-right min-w-[70px] ${
                isLoss ? 'text-ember-400' : isBest ? 'text-moss-300' : 'text-vellum/80'
              }`}>
                {s.profit > 0 ? '+' : ''}{s.profit.toLocaleString('de-DE')}
                <span className={`block text-[9px] font-normal ${
                  isLoss ? 'text-ember-400/65' : 'text-vellum/40'
                }`}>
                  {s.marginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        <div className="px-1.5 pt-0.5 text-[9px] text-vellum/30 leading-tight">
          {EXIT_HINTS[row.bestMode]} → best for this row
        </div>
      </div>

      {row.savingsVsDirect !== undefined && (
        <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
          <span className="text-vellum/35">vs direct 1-step</span>
          <span className={`tabular-nums ${
            row.savingsVsDirect > 0 ? 'text-moss-300' : 'text-ember-400'
          }`}>
            {row.savingsVsDirect > 0 ? '+' : ''}{row.savingsVsDirect.toLocaleString('de-DE')} saved
          </span>
        </div>
      )}
    </div>
  );
}
