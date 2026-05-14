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

interface Row {
  id: string;
  resource: ResourceType;
  source: string;
  target: string;
  path: ChainPath;
  hops: number;
  inputPrice: number;
  outputPrice: number;
  netRevenue: number;
  totalCostPerUnit: number;
  profitPerUnit: number;
  marginPct: number;
  /** Cheapest 1-step alternative to acquire target (if exists). */
  directBuyCost?: number;
  /** Savings vs the best 1-step alternative (positive = chain is better). */
  savingsVsDirect?: number;
}

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
  const [chainOnlyWins, setChainOnlyWins] = useState<boolean>(true);

  // "now" snapshot kept in state (Date.now() inside render trips
  // react-hooks/purity).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const saleMult = getSaleMultiplier(feeSettings);
  const entryMult = getEntryMultiplier(feeSettings);

  const rows = useMemo<Row[]>(() => {
    const pairs = allChainOpportunities(presets);
    const ageCutoff = maxAgeHours > 0 ? now - maxAgeHours * ONE_HOUR : 0;

    // For each (resource, target), remember the cheapest 1-step path so
    // we can compute savingsVsDirect for multi-step entries to the same
    // target. The map key is "resource|target".
    const directBy = new Map<string, number>();
    for (const { source, target, path } of pairs) {
      if (path.nodes.length !== 2) continue; // 1 step = [source, target]
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
      if (hops > maxHops) continue;

      for (const resource of RESOURCE_TYPES) {
        if (resourceFilter !== 'all' && resource !== resourceFilter) continue;
        const sourceCell = priceBook[resource]?.[source];
        const targetCell = priceBook[resource]?.[target];
        if (!sourceCell || !targetCell) continue;

        const inputPriceStr = feeSettings.entrySource === 'buyOrder'
          ? sourceCell.buyOrder
          : sourceCell.sellOrder;
        const outputPriceStr = feeSettings.exitSource === 'sellOrder'
          ? targetCell.sellOrder
          : targetCell.buyOrder;

        const inputPrice = toNumber(inputPriceStr);
        const outputPrice = toNumber(outputPriceStr);
        if (inputPrice <= 0 || outputPrice <= 0) continue;

        // Staleness filter — skip cells whose source or target side is too old.
        if (ageCutoff > 0) {
          const inSideStr = feeSettings.entrySource === 'buyOrder'
            ? (sourceCell.buyConfirmedAt ?? sourceCell.buyDate)
            : (sourceCell.sellConfirmedAt ?? sourceCell.sellDate);
          const outSideStr = feeSettings.exitSource === 'sellOrder'
            ? (targetCell.sellConfirmedAt ?? targetCell.sellDate)
            : (targetCell.buyConfirmedAt ?? targetCell.buyDate);
          if (inSideStr) {
            const t = Date.parse(inSideStr);
            if (Number.isFinite(t) && t < ageCutoff) continue;
          }
          if (outSideStr) {
            const t = Date.parse(outSideStr);
            if (Number.isFinite(t) && t < ageCutoff) continue;
          }
        }

        const totalCostPerUnit = inputPrice * entryMult + path.totalStepCost;
        const netRevenue = outputPrice * saleMult;
        const profitPerUnit = Math.floor(netRevenue - totalCostPerUnit);
        if (profitPerUnit < minProfit) continue;

        const marginPct = totalCostPerUnit > 0 ? (profitPerUnit / totalCostPerUnit) * 100 : 0;

        // Compare against cheapest 1-step acquisition of the same target.
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
          outputPrice,
          netRevenue: Math.floor(netRevenue),
          totalCostPerUnit: Math.floor(totalCostPerUnit),
          profitPerUnit,
          marginPct,
          directBuyCost: directBuyCost !== undefined ? Math.floor(directBuyCost) : undefined,
          savingsVsDirect: savingsVsDirect !== undefined ? Math.floor(savingsVsDirect) : undefined,
        });
      }
    }

    return out
      .sort((a, b) => b.profitPerUnit - a.profitPerUnit)
      .slice(0, 50);
  }, [
    priceBook,
    presets,
    feeSettings,
    saleMult,
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
            Buy cheap source → transmute through multiple steps → sell target. Same city only.
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
            min={1}
            max={8}
            value={maxHops}
            onChange={(e) => setMaxHops(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
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
            Hide multi-hop rows where the direct 1-step path is cheaper anyway
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

      {/* Cost / profit grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
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

        <div className="text-vellum/55">Sell {row.target} net</div>
        <div className="text-right text-vellum tabular-nums">
          {row.netRevenue.toLocaleString('de-DE')}
        </div>

        <div className="text-vellum/55 font-bold pt-1">Profit / unit</div>
        <div className="text-right font-black text-moss-300 tabular-nums pt-1">
          +{row.profitPerUnit.toLocaleString('de-DE')}
          <span className="text-[10px] text-moss-300/65 ml-1">({row.marginPct.toFixed(1)}%)</span>
        </div>

        {row.savingsVsDirect !== undefined && (
          <>
            <div className="text-vellum/35 text-[10px]">vs direct 1-step</div>
            <div className={`text-right text-[10px] tabular-nums ${
              row.savingsVsDirect > 0 ? 'text-moss-300' : 'text-ember-400'
            }`}>
              {row.savingsVsDirect > 0 ? '+' : ''}{row.savingsVsDirect.toLocaleString('de-DE')} saved
            </div>
          </>
        )}
      </div>
    </div>
  );
}
