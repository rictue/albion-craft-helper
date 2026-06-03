/**
 * Transmute (Simple) — a second, guided take on the transmutation scanner.
 *
 * Same engine as /transmute (TRANSMUTATION_STEPS, presets, the chain
 * pathfinder, AODP fetch) but a stripped-down, one-question-at-a-time UI:
 * pick a resource, pick FROM → TO, fetch or type the two prices, read one
 * big profit answer. No 125-cell matrix, no scanner table — just the play.
 *
 * Lives at /transmute-simple alongside the original so the user can pick
 * whichever they prefer; neither touches the other.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Wand2 } from 'lucide-react';
import { fetchPrices } from '../../services/api';
import { fetchPriceHistory } from '../../services/priceHistory';
import { RESOURCE_TYPES } from './scanner/calculations';
import type { ResourceType } from './scanner/types';
import { shortestPathsFrom } from './scanner/chainPathfinder';
import { DEFAULT_PRESETS } from './scanner/calculations';
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

function lvl(tier: number, enchant: number) {
  return `${tier}.${enchant}`;
}

export default function TransmuteSimple() {
  usePageMeta({
    title: 'Quick Transmute',
    description: 'Simple guided Albion Online transmutation profit check: pick a resource, pick the tier/enchant you have and the one you want, fetch live AODP prices, and see profit, ROI and break-even at a glance.',
  });

  const [resource, setResource] = useState<ResourceType>('Wood / Logs');
  const [fromTier, setFromTier] = useState(5);
  const [fromEnch, setFromEnch] = useState(2);
  const [toTier, setToTier] = useState(6);
  const [toEnch, setToEnch] = useState(3);

  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [qty, setQty] = useState(100);

  const [premium, setPremium] = useState(true);
  const [exit, setExit] = useState<ExitMode>('buyOrder');

  const [city, setCity] = useState<typeof CITIES[number]>('Lymhurst');
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState('');

  // City scan — cheapest source per city + target sell volume per city.
  const [scanning, setScanning] = useState(false);
  const [sourceByCity, setSourceByCity] = useState<{ city: string; buyOrder: number; instant: number }[]>([]);
  const [targetVolByCity, setTargetVolByCity] = useState<{ city: string; volPerDay: number; price: number }[]>([]);

  const from = lvl(fromTier, fromEnch);
  const to = lvl(toTier, toEnch);

  // Cheapest path FROM → TO (multi-step allowed). undefined = not reachable
  // (target must be a strictly higher tier and/or enchant).
  const path = useMemo(() => {
    const paths = shortestPathsFrom(from, DEFAULT_PRESETS);
    return paths.get(to);
  }, [from, to]);

  const transmuteCost = path?.totalStepCost ?? 0;

  const feeSettings = useMemo<MarketFeeSettings>(() => ({
    saleMode: exit === 'direct' ? 'private' : 'marketplace',
    taxProfile: premium ? 'premium' : 'normal',
    entrySource: 'sellOrder', // instant-buy the source (no setup fee)
    exitSource: exit === 'sellOrder' ? 'sellOrder' : 'buyOrder',
  }), [exit, premium]);

  const result = useMemo(() => {
    const b = typeof buyPrice === 'number' ? buyPrice : 0;
    const s = typeof sellPrice === 'number' ? sellPrice : 0;
    if (!path || b <= 0 || s <= 0) return null;
    const entryMult = getEntryMultiplier(feeSettings);
    const saleMult = getSaleMultiplier(feeSettings);
    const costPerUnit = b * entryMult + transmuteCost;
    const netSellPerUnit = s * saleMult;
    const profitPerUnit = netSellPerUnit - costPerUnit;
    const roi = costPerUnit > 0 ? (profitPerUnit / costPerUnit) * 100 : 0;
    const breakEven = saleMult > 0 ? costPerUnit / saleMult : 0;
    return {
      costPerUnit, netSellPerUnit, profitPerUnit, roi, breakEven,
      totalProfit: profitPerUnit * Math.max(1, qty),
      saleMult, entryMult,
    };
  }, [path, buyPrice, sellPrice, transmuteCost, feeSettings, qty]);

  const fromId = buildResourceItemId(resource, from);
  const toId = buildResourceItemId(resource, to);

  const handleFetch = async () => {
    setFetching(true);
    setFetchNote('');
    try {
      const data = await fetchPrices([fromId, toId], [city], true, true);
      let srcSell = 0, tgtSell = 0, tgtBuy = 0;
      for (const p of data) {
        if (p.city !== city) continue;
        if (p.item_id === fromId && p.sell_price_min > 0) srcSell = srcSell === 0 ? p.sell_price_min : Math.min(srcSell, p.sell_price_min);
        if (p.item_id === toId) {
          if (p.sell_price_min > 0) tgtSell = Math.max(tgtSell, p.sell_price_min);
          if (p.buy_price_max > 0) tgtBuy = Math.max(tgtBuy, p.buy_price_max);
        }
      }
      if (srcSell > 0) setBuyPrice(srcSell);
      // Sell side: instant/direct reference the buy order for high enchant
      // realism; otherwise the sell order. Pick what fits the exit mode.
      const tgt = exit === 'buyOrder' ? (tgtBuy || tgtSell) : (tgtSell || tgtBuy);
      if (tgt > 0) setSellPrice(tgt);
      setFetchNote(
        srcSell > 0 || tgt > 0
          ? `Filled from ${city}: buy ${formatSilver(srcSell)} · sell ${formatSilver(tgt)}`
          : `No AODP data for these in ${city} — type prices manually.`,
      );
    } catch {
      setFetchNote('AODP fetch failed — type prices manually.');
    } finally {
      setFetching(false);
    }
  };

  // Scan every royal city: cheapest place to acquire the SOURCE (buy-order
  // + instant), and the TARGET's daily sell volume per city so you know
  // where it actually moves and how much. You then type the sell price.
  const handleScan = async () => {
    if (!reachable) return;
    setScanning(true);
    try {
      const [srcPrices, tgtHist] = await Promise.all([
        fetchPrices([fromId], [...CITIES], true, true),
        fetchPriceHistory(toId, [...CITIES], 14),
      ]);

      const src = CITIES.map(c => {
        let buyOrder = 0, instant = 0;
        for (const p of srcPrices) {
          if (p.city !== c || p.item_id !== fromId) continue;
          if (p.buy_price_max > 0) buyOrder = Math.max(buyOrder, p.buy_price_max);
          if (p.sell_price_min > 0) instant = instant === 0 ? p.sell_price_min : Math.min(instant, p.sell_price_min);
        }
        return { city: c, buyOrder, instant };
      }).filter(s => s.buyOrder > 0 || s.instant > 0);
      // Cheapest acquisition first (by buy-order level, fall back to instant).
      src.sort((a, b) => (a.buyOrder || a.instant) - (b.buyOrder || b.instant));
      setSourceByCity(src);

      const vol = tgtHist.map(s => {
        const recent = s.data.slice(-7);
        const avgVol = recent.length ? recent.reduce((sum, p) => sum + p.item_count, 0) / recent.length : 0;
        const avgPrice = recent.length ? recent.reduce((sum, p) => sum + p.avg_price, 0) / recent.length : 0;
        return { city: s.city, volPerDay: Math.round(avgVol), price: Math.round(avgPrice) };
      }).filter(v => v.volPerDay > 0).sort((a, b) => b.volPerDay - a.volPerDay);
      setTargetVolByCity(vol);
    } finally {
      setScanning(false);
    }
  };

  const reachable = !!path;
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
          <p className="text-sm text-zinc-500">Pick what you have and what you want — get one clear answer.</p>
        </div>
      </div>

      {/* Step 1 — resource */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">1 · Resource</div>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_TYPES.map((r) => (
            <button
              key={r}
              onClick={() => setResource(r)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                resource === r ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                               : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — from → to */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">2 · From → To</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* FROM */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ItemIcon itemId={fromId} size={32} quality={1} className="rounded shrink-0" />
              <div className="text-xs text-zinc-400 font-semibold">You have <span className="text-cyan-300">T{from}</span></div>
            </div>
            <div className="flex gap-1">{TIERS.map(t => <button key={t} onClick={() => setFromTier(t)} className={tierBtn(fromTier === t)}>T{t}</button>)}</div>
            <div className="flex gap-1">{ENCHANTS.map(e => <button key={e} onClick={() => setFromEnch(e)} className={tierBtn(fromEnch === e)}>.{e}</button>)}</div>
          </div>

          <ArrowRight className="text-zinc-600 shrink-0" size={22} />

          {/* TO */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ItemIcon itemId={toId} size={32} quality={1} className="rounded shrink-0" />
              <div className="text-xs text-zinc-400 font-semibold">You want <span className="text-emerald-300">T{to}</span></div>
            </div>
            <div className="flex gap-1">{TIERS.map(t => <button key={t} onClick={() => setToTier(t)} className={tierBtn(toTier === t)}>T{t}</button>)}</div>
            <div className="flex gap-1">{ENCHANTS.map(e => <button key={e} onClick={() => setToEnch(e)} className={tierBtn(toEnch === e)}>.{e}</button>)}</div>
          </div>
        </div>

        {reachable ? (
          <div className="flex items-center justify-between text-[11px] bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="text-zinc-500">Path <span className="font-mono text-cyan-300">{path!.nodes.join(' → ')}</span></span>
            <span className="text-zinc-400">transmute cost <span className="font-bold text-zinc-200 tabular-nums">{formatSilver(path!.totalStepCost)}</span></span>
          </div>
        ) : (
          <div className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            Target must be a higher tier and/or enchant than what you have. Transmute only goes up.
          </div>
        )}
      </section>

      {/* Step 3 — prices */}
      <section className="bg-surface rounded-2xl border border-surface-lighter p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">3 · Prices</div>
          <div className="flex items-center gap-1.5">
            <select value={city} onChange={e => setCity(e.target.value as typeof CITIES[number])}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleFetch} disabled={fetching || !reachable}
              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50">
              {fetching ? 'Fetching…' : '↻ Fetch'}
            </button>
            <button onClick={handleScan} disabled={scanning || !reachable}
              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50">
              {scanning ? 'Scanning…' : '🔍 Scan cities'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Buy {from} (each)</span>
            <input type="number" min={0} value={buyPrice} onChange={e => setBuyPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="source price" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Sell {to} (each)</span>
            <input type="number" min={0} value={sellPrice} onChange={e => setSellPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="target price" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </label>
        </div>
        {fetchNote && <div className="text-[10px] text-zinc-500">{fetchNote}</div>}

        {/* City scan — cheapest source (click to use) + target volume */}
        {(sourceByCity.length > 0 || targetVolByCity.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold mb-1.5">
                Buy {from} — cheapest city <span className="text-zinc-600 normal-case font-normal">(click to use)</span>
              </div>
              <div className="space-y-0.5">
                {sourceByCity.map((s, i) => {
                  const acq = s.buyOrder || s.instant;
                  return (
                    <button key={s.city} onClick={() => setBuyPrice(acq)}
                      className={`w-full flex items-center justify-between px-1.5 py-1 rounded text-[11px] transition-colors ${i === 0 ? 'bg-amber-500/10 text-amber-200 border border-amber-500/25' : 'text-zinc-400 hover:bg-zinc-800/60 border border-transparent'}`}>
                      <span className="flex items-center gap-1.5">{i === 0 && <span className="text-amber-400 text-[9px]">★</span>}{s.city}</span>
                      <span className="tabular-nums">
                        buy {formatSilver(s.buyOrder)}
                        <span className="text-zinc-600"> · inst {formatSilver(s.instant)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-1.5">
                T{to} sells / day <span className="text-zinc-600 normal-case font-normal">(liquidity)</span>
              </div>
              {targetVolByCity.length > 0 ? (
                <div className="space-y-0.5">
                  {targetVolByCity.map((v) => (
                    <div key={v.city} className="flex items-center justify-between px-1.5 py-1 text-[11px] text-zinc-400">
                      <span>{v.city}</span>
                      <span className="tabular-nums"><span className="text-emerald-300 font-bold">{v.volPerDay}</span>/day <span className="text-zinc-600">@ {formatSilver(v.price)}</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-zinc-600 px-1.5 py-1">No recent sales — illiquid, hard to offload.</div>
              )}
            </div>
          </div>
        )}

        {/* compact fee + qty row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
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
          <label className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Qty</span>
            <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-zinc-200 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </label>
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
          <div className="mt-4 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-2 text-[11px]">
            <div><span className="text-zinc-600 block">Buy + transmute</span><span className="text-zinc-300 tabular-nums">{formatSilver(result.costPerUnit)}</span></div>
            <div><span className="text-zinc-600 block">Net sell (after fees)</span><span className="text-zinc-300 tabular-nums">{formatSilver(result.netSellPerUnit)}</span></div>
            <div><span className="text-zinc-600 block">Sale ×</span><span className="text-zinc-300 tabular-nums">{result.saleMult.toFixed(3)}</span></div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
          {reachable ? 'Enter or fetch both prices to see profit.' : 'Pick a higher target to start.'}
        </section>
      )}

      <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
        Same engine as the full Transmutation Scanner — this is just the quick, guided view. Prices from AODP
        (community-uploaded); for .3/.4 targets the buy-order side is the realistic sale (sell orders sit unfilled).
      </p>
    </div>
  );
}
