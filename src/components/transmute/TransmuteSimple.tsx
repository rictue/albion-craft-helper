/**
 * Transmute (Simple) — target-driven, guided.
 *
 * You pick only the TARGET (the resource + tier.enchant you want to sell).
 * The tool scans every royal city for every possible source, then tells YOU
 * which base resource to buy + where it's cheapest + the transmute path —
 * the lowest total-cost way to reach your target. You type the sell price,
 * see the daily sell volume, and read one clear profit answer.
 *
 * Same engine as /transmute (TRANSMUTATION_STEPS, presets, chain pathfinder,
 * AODP fetch + history). Lives at /transmute-simple; the original is
 * untouched so you can keep whichever you prefer.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Wand2 } from 'lucide-react';
import { fetchPrices } from '../../services/api';
import { fetchPriceHistory } from '../../services/priceHistory';
import { RESOURCE_TYPES, TIER_LABELS, DEFAULT_PRESETS } from './scanner/calculations';
import type { ResourceType } from './scanner/types';
import { shortestPathsFrom } from './scanner/chainPathfinder';
import { buildResourceItemId } from './scanner/fetchAODPPrices';
import { getSaleMultiplier, getEntryMultiplier } from '../../utils/marketFees';
import type { MarketFeeSettings } from '../../utils/marketFees';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import { usePageMeta } from '../../hooks/usePageMeta';

const TIERS = [4, 5, 6, 7, 8] as const;
const ENCHANTS = [0, 1, 2, 3, 4] as const;
const CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford'] as const;

type ExitMode = 'sellOrder' | 'buyOrder' | 'direct';

interface SourceQuote { price: number; instant: number; city: string }

export default function TransmuteSimple() {
  usePageMeta({
    title: 'Quick Transmute',
    description: 'Target-driven Albion Online transmutation helper: pick the tier/enchant you want to sell, and it tells you the cheapest base resource to buy, in which city, the transmute path, sell volume, and profit at your own sell price.',
  });

  const [resource, setResource] = useState<ResourceType>('Hide');
  const [toTier, setToTier] = useState(8);
  const [toEnch, setToEnch] = useState(2);

  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [qty, setQty] = useState(100);
  const [premium, setPremium] = useState(true);
  const [exit, setExit] = useState<ExitMode>('buyOrder');

  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  // Cheapest acquisition per source level across royal cities, from last scan.
  const [sourcePrices, setSourcePrices] = useState<Map<string, SourceQuote>>(new Map());
  const [targetVolByCity, setTargetVolByCity] = useState<{ city: string; volPerDay: number; price: number }[]>([]);

  const to = `${toTier}.${toEnch}`;
  const toId = buildResourceItemId(resource, to);

  const feeSettings = useMemo<MarketFeeSettings>(() => ({
    saleMode: exit === 'direct' ? 'private' : 'marketplace',
    taxProfile: premium ? 'premium' : 'normal',
    entrySource: 'buyOrder', // you buy-order the base resource (cheap acquisition)
    exitSource: exit === 'sellOrder' ? 'sellOrder' : 'buyOrder',
  }), [exit, premium]);

  // Best source = the buy-able level with the lowest (acquire + transmute)
  // cost that can reach the target. This is the "what to buy" answer.
  const bestSource = useMemo(() => {
    if (sourcePrices.size === 0) return null;
    const entryMult = getEntryMultiplier(feeSettings);
    let best: null | {
      source: string; city: string; sourceBuy: number;
      path: { nodes: string[]; totalStepCost: number }; transmuteCost: number; totalCost: number;
    } = null;
    for (const [src, q] of sourcePrices) {
      if (src === to || q.price <= 0) continue; // must transmute UP into target
      const path = shortestPathsFrom(src, DEFAULT_PRESETS).get(to);
      if (!path) continue;
      const totalCost = q.price * entryMult + path.totalStepCost;
      if (!best || totalCost < best.totalCost) {
        best = { source: src, city: q.city, sourceBuy: q.price, path, transmuteCost: path.totalStepCost, totalCost };
      }
    }
    return best;
  }, [sourcePrices, to, feeSettings]);

  const result = useMemo(() => {
    const s = typeof sellPrice === 'number' ? sellPrice : 0;
    if (!bestSource || s <= 0) return null;
    const saleMult = getSaleMultiplier(feeSettings);
    const netSell = s * saleMult;
    const profitPerUnit = netSell - bestSource.totalCost;
    const roi = bestSource.totalCost > 0 ? (profitPerUnit / bestSource.totalCost) * 100 : 0;
    const breakEven = saleMult > 0 ? bestSource.totalCost / saleMult : 0;
    return { netSell, profitPerUnit, roi, breakEven, saleMult, totalProfit: profitPerUnit * Math.max(1, qty) };
  }, [bestSource, sellPrice, feeSettings, qty]);

  // Scan: cheapest source per level across cities + target daily volume.
  const handleScan = async () => {
    setScanning(true);
    setScanNote('');
    try {
      const sourceIds = TIER_LABELS.map(l => ({ level: l, id: buildResourceItemId(resource, l) }));
      const [prices, hist] = await Promise.all([
        fetchPrices(sourceIds.map(s => s.id), [...CITIES], true, true),
        fetchPriceHistory(toId, [...CITIES], 14),
      ]);

      const idToLevel = new Map(sourceIds.map(s => [s.id, s.level]));
      const map = new Map<string, SourceQuote>();
      for (const p of prices) {
        const level = idToLevel.get(p.item_id);
        if (!level || !(CITIES as readonly string[]).includes(p.city)) continue;
        const cur = map.get(level) ?? { price: 0, instant: 0, city: '' };
        // Acquisition via buy order = the city's buy-order level; cheaper is
        // better. Track instant (sell-order) too as info.
        if (p.buy_price_max > 0 && (cur.price === 0 || p.buy_price_max < cur.price)) {
          cur.price = p.buy_price_max; cur.city = p.city;
        }
        if (p.sell_price_min > 0) cur.instant = cur.instant === 0 ? p.sell_price_min : Math.min(cur.instant, p.sell_price_min);
        map.set(level, cur);
      }
      // Fall back to instant (sell order) for sources with no buy orders.
      for (const [lvl, q] of map) { if (q.price === 0 && q.instant > 0) { q.price = q.instant; map.set(lvl, q); } }
      setSourcePrices(map);

      const vol = hist.map(s => {
        const recent = s.data.slice(-7);
        const avgVol = recent.length ? recent.reduce((a, p) => a + p.item_count, 0) / recent.length : 0;
        const avgPrice = recent.length ? recent.reduce((a, p) => a + p.avg_price, 0) / recent.length : 0;
        return { city: s.city, volPerDay: Math.round(avgVol), price: Math.round(avgPrice) };
      }).filter(v => v.volPerDay > 0).sort((a, b) => b.volPerDay - a.volPerDay);
      setTargetVolByCity(vol);

      setScanNote(map.size > 0 ? `Scanned ${map.size} source levels across ${CITIES.length} cities.` : 'No source data — try again.');
    } catch {
      setScanNote('AODP fetch failed — try again.');
    } finally {
      setScanning(false);
    }
  };

  const profit = result?.profitPerUnit ?? 0;
  const verdict = !result ? null
    : profit > 5000 ? { label: 'STRONG', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' }
    : profit > 1000 ? { label: 'GOOD',   cls: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' }
    : profit > 0    ? { label: 'THIN',   cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' }
    :                 { label: 'LOSS',   cls: 'text-red-300 bg-red-500/15 border-red-500/30' };

  const tierBtn = (active: boolean) =>
    `h-9 flex-1 rounded-lg text-xs font-bold transition-all ${
      active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
             : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <Wand2 className="text-cyan-300" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Quick Transmute</h1>
          <p className="text-sm text-zinc-500">Pick what you want to sell — it tells you what to buy.</p>
        </div>
      </div>

      {/* Step 1 — resource */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">1 · Resource</div>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_TYPES.map((r) => (
            <button key={r} onClick={() => { setResource(r); setSourcePrices(new Map()); setTargetVolByCity([]); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                resource === r ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — target only */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">2 · What you want to sell</div>
          <button onClick={handleScan} disabled={scanning}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50">
            {scanning ? 'Scanning…' : '🔍 Find what to buy'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ItemIcon itemId={toId} size={36} quality={1} className="rounded shrink-0" />
          <div className="text-sm text-zinc-300 font-semibold">Sell <span className="text-emerald-300">T{to} {resource}</span></div>
        </div>
        <div className="space-y-2">
          <div className="flex gap-1">{TIERS.map(t => <button key={t} onClick={() => setToTier(t)} className={tierBtn(toTier === t)}>T{t}</button>)}</div>
          <div className="flex gap-1">{ENCHANTS.map(e => <button key={e} onClick={() => setToEnch(e)} className={tierBtn(toEnch === e)}>.{e}</button>)}</div>
        </div>
        {scanNote && <div className="text-[10px] text-zinc-500">{scanNote}</div>}
      </section>

      {/* Recommendation — what to buy */}
      {bestSource && (
        <section className="bg-surface rounded-2xl border border-amber-500/25 p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-amber-400/80 font-bold">✦ Buy this</div>
          <div className="flex items-center gap-3">
            <ItemIcon itemId={buildResourceItemId(resource, bestSource.source)} size={40} quality={1} className="rounded shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-zinc-100 font-bold">
                T{bestSource.source} {resource} <span className="text-zinc-500 font-normal">in</span> <span className="text-amber-300">{bestSource.city}</span>
              </div>
              <div className="font-mono text-[11px] text-cyan-300 mt-0.5 flex items-center gap-1">
                {bestSource.path.nodes.join(' → ')} <ArrowRight size={11} className="text-zinc-600" /> sell
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
            <div><span className="text-zinc-600 block">Buy source</span><span className="text-zinc-200 tabular-nums">{formatSilver(bestSource.sourceBuy)}</span></div>
            <div><span className="text-zinc-600 block">+ transmute</span><span className="text-zinc-200 tabular-nums">{formatSilver(bestSource.transmuteCost)}</span></div>
            <div><span className="text-zinc-600 block">= cost / unit</span><span className="text-zinc-100 font-bold tabular-nums">{formatSilver(bestSource.totalCost)}</span></div>
          </div>
        </section>
      )}

      {/* Sell price + volume + fees */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">3 · Your sell price</div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Sell T{to} at (each)</span>
            <input type="number" min={0} value={sellPrice} onChange={e => setSellPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="type your sell price" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Qty</span>
            <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </label>
        </div>

        {/* Target volume per city — where it sells & how much */}
        {targetVolByCity.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-1.5">T{to} sells / day <span className="text-zinc-600 normal-case font-normal">(pick a realistic sell price)</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
              {targetVolByCity.map(v => (
                <button key={v.city} onClick={() => setSellPrice(v.price)} title="Use this city's avg price"
                  className="flex items-center justify-between px-1.5 py-1 text-[11px] text-zinc-400 rounded hover:bg-zinc-800/60">
                  <span>{v.city}</span>
                  <span className="tabular-nums"><span className="text-emerald-300 font-bold">{v.volPerDay}</span> <span className="text-zinc-600">@{formatSilver(v.price)}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPremium(p => !p)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${premium ? 'bg-gold/15 text-gold-light border-gold/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
            {premium ? 'Premium 4%' : 'No prem 8%'}
          </button>
          <div className="flex gap-1">
            {([['buyOrder', 'Instant sell'], ['sellOrder', 'Sell order'], ['direct', 'Direct trade']] as [ExitMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setExit(m)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${exit === m ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Result */}
      {result && verdict ? (
        <section className={`rounded-2xl border p-5 ${profit > 0 ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold mb-1">Profit per unit</div>
              <div className={`text-4xl font-black tabular-nums ${profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {profit > 0 ? '+' : ''}{formatSilver(profit)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{result.roi > 0 ? '+' : ''}{result.roi.toFixed(1)}% ROI · break-even sell {formatSilver(result.breakEven)}</div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black border ${verdict.cls}`}>{verdict.label}</span>
              <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total ({qty}×)</div>
              <div className={`text-xl font-black tabular-nums ${result.totalProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.totalProfit > 0 ? '+' : ''}{formatSilver(result.totalProfit)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
          {bestSource ? 'Type your sell price to see profit.' : 'Pick a target and hit “Find what to buy”.'}
        </section>
      )}

      <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
        It scans every royal city for every source and recommends the cheapest base resource + path to reach your
        target. Volume is the avg daily AODP-recorded sales — for .3/.4 use the buy-order side; their sell orders sit unfilled.
      </p>
    </div>
  );
}
