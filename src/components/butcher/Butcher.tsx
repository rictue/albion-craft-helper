import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

// Butcher recipes: 1 raw grown animal → N meat at butcher station
// Note: animal tiers go T3 (chicken) through T8 (cow). "Meat" is tier-matched.
const ANIMALS = [
  { tier: 3, name: 'Chicken', rawId: 'T3_FARM_CHICKEN_GROWN', meatId: 'T3_MEAT' },
  { tier: 4, name: 'Goose',   rawId: 'T4_FARM_GOOSE_GROWN',   meatId: 'T4_MEAT' },
  { tier: 5, name: 'Goat',    rawId: 'T5_FARM_GOAT_GROWN',    meatId: 'T5_MEAT' },
  { tier: 6, name: 'Pig',     rawId: 'T6_FARM_PIG_GROWN',     meatId: 'T6_MEAT' },
  { tier: 7, name: 'Sheep',   rawId: 'T7_FARM_SHEEP_GROWN',   meatId: 'T7_MEAT' },
  { tier: 8, name: 'Cow',     rawId: 'T8_FARM_COW_GROWN',     meatId: 'T8_MEAT' },
];

// Martlock has the butcher/meat specialty (+36.7% effective RR with bonus)
// Each animal butchered → 18 base meat. Return rate adds extras.
const MEAT_PER_CRAFT = 18;

// Base RR for crafting: 15.2%, with city bonus 24.8%, with focus 36.7%, both 43.5%
const BASE_RR = 0.152;
const CITY_RR = 0.248;
const FOCUS_RR = 0.367;
const FOCUS_CITY_RR = 0.435;

const TAX = 0.065; // premium

interface ButcherResult {
  tier: number;
  name: string;
  rawId: string;
  meatId: string;
  rawPrice: number;
  rawCity: string;
  meatPrice: number;
  meatCity: string;
  effectiveOutput: number;
  revenue: number;
  profit: number;
  margin: number;
  profitPerAnimal: number;
}

export default function Butcher() {
  const [useFocus, setUseFocus] = useState(false);
  const [inMartlock, setInMartlock] = useState(true);
  const [sellMode, setSellMode] = useState<'market' | 'discord'>('market');
  const [results, setResults] = useState<ButcherResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const a of ANIMALS) {
      ids.push(a.rawId, a.meatId);
    }

    const data = await fetchPrices(ids);

    // Cheapest raw buy + outlier-filtered best meat sell
    const cheapest = new Map<string, { price: number; city: string }>();
    const byCity = new Map<string, Array<{ city: string; price: number }>>();

    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapest.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });
      if (!byCity.has(p.item_id)) byCity.set(p.item_id, []);
      byCity.get(p.item_id)!.push({ price: p.sell_price_min, city: p.city });
    }

    // Determine RR based on focus + city bonus
    let rr: number;
    if (useFocus && inMartlock) rr = FOCUS_CITY_RR;
    else if (useFocus) rr = FOCUS_RR;
    else if (inMartlock) rr = CITY_RR;
    else rr = BASE_RR;

    // Output multiplier with reinvest loop: 1 / (1 - RR)
    const outputMult = 1 / (1 - rr);

    const out: ButcherResult[] = [];
    for (const a of ANIMALS) {
      const raw = cheapest.get(a.rawId);
      // Best sell with outlier filter
      const meatList = byCity.get(a.meatId) || [];
      if (!raw || meatList.length === 0) continue;

      const sortedByPrice = [...meatList].sort((x, y) => x.price - y.price);
      const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;
      const filtered = meatList.filter(m => m.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((x, y) => y.price - x.price);
      const bestMeat = filtered[0];

      // 1 raw animal → 18 meat × reinvest multiplier
      const effectiveOutput = MEAT_PER_CRAFT * outputMult;
      const grossRevenue = effectiveOutput * bestMeat.price;

      // Tax / fee
      let netRevenue = grossRevenue;
      if (sellMode === 'market') netRevenue = grossRevenue * (1 - TAX);
      else netRevenue = grossRevenue * 0.95; // Discord -5%

      const cost = raw.price; // 1 animal per craft
      const profit = netRevenue - cost;
      const margin = cost > 0 ? (profit / cost) * 100 : 0;

      out.push({
        tier: a.tier,
        name: a.name,
        rawId: a.rawId,
        meatId: a.meatId,
        rawPrice: raw.price,
        rawCity: raw.city,
        meatPrice: bestMeat.price,
        meatCity: bestMeat.city,
        effectiveOutput,
        revenue: netRevenue,
        profit,
        margin,
        profitPerAnimal: profit,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setResults(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [useFocus, inMartlock, sellMode]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent rounded-xl border border-red-500/20 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
          <span className="text-base">🔪</span>
        </div>
        <div className="text-xs text-zinc-400">
          <div className="text-zinc-200 font-semibold mb-1">Butcher Calculator</div>
          <div className="space-y-0.5">
            <div><strong className="text-red-400">What it does:</strong> Buy a grown animal from an island/market, butcher it at the Butcher station, get meat, sell on market.</div>
            <div><strong className="text-red-400">How it works:</strong> 1 animal → <strong>18 meat</strong> (with return rate extras), Martlock has a butcher city bonus.</div>
            <div><strong className="text-red-400">Shows you:</strong> Per-animal profit — where to buy cheapest and sell highest.</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
            <input type="checkbox" checked={inMartlock} onChange={(e) => setInMartlock(e.target.checked)} className="accent-red-500" />
            <span className="text-sm text-zinc-200">Martlock (city bonus)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-red-500" />
            <span className="text-sm text-zinc-200">Use Focus</span>
          </label>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Sell Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setSellMode('market')} className={`h-9 rounded text-[11px] font-semibold ${sellMode === 'market' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Market (−6.5% tax)
              </button>
              <button onClick={() => setSellMode('discord')} className={`h-9 rounded text-[11px] font-semibold ${sellMode === 'discord' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Discord (−5%)
              </button>
            </div>
          </div>
          <button onClick={scan} disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Scan Animals'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
          <span>Effective RR: <strong className="text-cyan-400">{formatPercent(((useFocus && inMartlock) ? FOCUS_CITY_RR : useFocus ? FOCUS_RR : inMartlock ? CITY_RR : BASE_RR) * 100)}</strong></span>
          <span>·</span>
          <span>Meat per animal (with reinvest): <strong className="text-cyan-400">{(MEAT_PER_CRAFT / (1 - ((useFocus && inMartlock) ? FOCUS_CITY_RR : useFocus ? FOCUS_RR : inMartlock ? CITY_RR : BASE_RR))).toFixed(1)}</strong></span>
          {scannedAt && <span className="ml-auto">Scanned at {scannedAt}</span>}
        </div>
      </div>

      {/* Results cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map(r => {
            const profitColor = r.profit > 0 ? 'text-green-400' : 'text-red-400';
            const profitBg = r.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
            return (
              <div key={r.tier} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ItemIcon itemId={r.rawId} size={44} />
                    <div>
                      <div className="text-sm font-bold text-zinc-200">T{r.tier} {r.name}</div>
                      <div className="text-[10px] text-zinc-500">1 animal → {r.effectiveOutput.toFixed(1)} meat</div>
                    </div>
                  </div>
                  <div className={`text-right px-2 py-1 rounded-lg border ${profitBg}`}>
                    <div className={`text-sm font-bold ${profitColor}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </div>
                    <div className={`text-[10px] ${profitColor}`}>{formatPercent(r.margin)}</div>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-1.5 border-b border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <ItemIcon itemId={r.rawId} size={20} />
                    <span className="text-zinc-400 flex-1">Buy raw @ {r.rawCity}</span>
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.rawPrice)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ItemIcon itemId={r.meatId} size={20} />
                    <span className="text-zinc-400 flex-1">Sell {Math.floor(r.effectiveOutput)} meat @ {r.meatCity}</span>
                    <span className="text-green-400 tabular-nums">+{formatSilver(r.revenue)}</span>
                  </div>
                </div>

                <div className="px-4 py-2 text-[10px] text-zinc-600 flex items-center justify-between">
                  <span>Meat unit: {formatSilver(r.meatPrice)}</span>
                  <span>{sellMode === 'market' ? '6.5% tax' : 'Discord −5%'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4">🔪</div>
          <h2 className="text-lg text-zinc-300 mb-2">Butcher Calculator</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Click scan — shows which animal is most profitable to butcher right now.
            Factors in Martlock city bonus, focus, return rate and market prices.
          </p>
        </div>
      )}

      {!loading && scannedAt && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No butcher profit found — animals and meat market might be stale.
        </div>
      )}
    </div>
  );
}
