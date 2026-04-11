import { useState, useCallback, useMemo } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

// Butcher recipes: 1 raw grown animal → N meat at butcher station
const ANIMALS = [
  { tier: 3, name: 'Chicken', rawId: 'T3_FARM_CHICKEN_GROWN', meatId: 'T3_MEAT' },
  { tier: 4, name: 'Goose',   rawId: 'T4_FARM_GOOSE_GROWN',   meatId: 'T4_MEAT' },
  { tier: 5, name: 'Goat',    rawId: 'T5_FARM_GOAT_GROWN',    meatId: 'T5_MEAT' },
  { tier: 6, name: 'Pig',     rawId: 'T6_FARM_PIG_GROWN',     meatId: 'T6_MEAT' },
  { tier: 7, name: 'Sheep',   rawId: 'T7_FARM_SHEEP_GROWN',   meatId: 'T7_MEAT' },
  { tier: 8, name: 'Cow',     rawId: 'T8_FARM_COW_GROWN',     meatId: 'T8_MEAT' },
];

// Each city has a butcher bonus for ONE specific meat type (+15 LPB crafting bonus)
// (Cow/T8 traditionally falls under Martlock/royal group with no dedicated city)
const CITY_MEAT_BONUS: Record<string, string> = {
  'Lymhurst':      'Chicken',  // T3
  'Fort Sterling': 'Goose',    // T4
  'Bridgewatch':   'Goat',     // T5
  'Martlock':      'Pig',      // T6
  'Thetford':      'Sheep',    // T7
};

// Each animal butchered → 18 base meat. Return rate adds extras.
const MEAT_PER_CRAFT = 18;

// RR by scenario
const BASE_LPB = 18;
const CITY_LPB = 15;     // butcher/cook city bonus = +15 LPB
const FOCUS_LPB = 47;    // focus crafting bonus = +47 LPB

function rrFromLpb(lpb: number) { return lpb / (100 + lpb); }

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
  butcherCity: string;
  cityBonusActive: boolean;
  effectiveRR: number;
  effectiveOutput: number;
  revenue: number;
  profit: number;
  margin: number;
}

export default function Butcher() {
  const [useFocus, setUseFocus] = useState(false);
  const [butcherCity, setButcherCity] = useState<'Lymhurst' | 'Fort Sterling' | 'Bridgewatch' | 'Martlock' | 'Thetford' | 'Auto'>('Auto');
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
      byCity.get(p.item_id)!.push({ city: p.city, price: p.sell_price_min });
    }

    const out: ButcherResult[] = [];
    for (const a of ANIMALS) {
      const raw = cheapest.get(a.rawId);
      const meatList = byCity.get(a.meatId) || [];
      if (!raw || meatList.length === 0) continue;

      // Outlier-filtered best sell price for meat
      const sortedByPrice = [...meatList].sort((x, y) => x.price - y.price);
      const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;
      const filtered = meatList.filter(m => m.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((x, y) => y.price - x.price);
      const bestMeat = filtered[0];

      // Determine which city to butcher in (auto picks the best-bonus city for this animal)
      let cityUsed: string;
      if (butcherCity === 'Auto') {
        // Find the city that gives bonus to THIS animal
        const bonusCity = Object.entries(CITY_MEAT_BONUS).find(([, name]) => name === a.name)?.[0];
        cityUsed = bonusCity || 'Martlock';
      } else {
        cityUsed = butcherCity;
      }

      const cityBonusActive = CITY_MEAT_BONUS[cityUsed] === a.name;

      // Compute RR based on spec-independent formula
      let lpb = BASE_LPB;
      if (cityBonusActive) lpb += CITY_LPB;
      if (useFocus) lpb += FOCUS_LPB;
      const rr = rrFromLpb(lpb);

      // Output with reinvest loop
      const outputMult = 1 / (1 - rr);
      const effectiveOutput = MEAT_PER_CRAFT * outputMult;
      const grossRevenue = effectiveOutput * bestMeat.price;

      // Tax / Discord mode
      let netRevenue = grossRevenue;
      if (sellMode === 'market') netRevenue = grossRevenue * (1 - TAX);
      else netRevenue = grossRevenue * 0.95;

      const cost = raw.price;
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
        butcherCity: cityUsed,
        cityBonusActive,
        effectiveRR: rr,
        effectiveOutput,
        revenue: netRevenue,
        profit,
        margin,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setResults(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [useFocus, butcherCity, sellMode]);

  // Summary of bonus cities for display
  const bonusMap = useMemo(() => {
    return Object.entries(CITY_MEAT_BONUS).map(([city, animal]) => {
      const animalData = ANIMALS.find(a => a.name === animal);
      return { city, animal, tier: animalData?.tier ?? 0 };
    });
  }, []);

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
            <div><strong className="text-red-400">What it does:</strong> Buy a grown animal, butcher at station, get meat (18 base × reinvest), sell on market.</div>
            <div><strong className="text-red-400">City bonus:</strong> Each city has a +15 LPB butcher bonus for ONE specific animal's meat.</div>
          </div>
        </div>
      </div>

      {/* City bonus table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">City butcher bonuses</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {bonusMap.map(b => (
            <div key={b.city} className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-center">
              <div className="text-[10px] text-zinc-500 uppercase">{b.city}</div>
              <div className="text-xs font-bold text-red-400 mt-0.5">T{b.tier} {b.animal}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-zinc-600 mt-2">
          Cow (T8) has no dedicated bonus city — use any station.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Butcher City</label>
            <select value={butcherCity} onChange={(e) => setButcherCity(e.target.value as typeof butcherCity)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/40">
              <option value="Auto">Auto (best bonus city per animal)</option>
              <option value="Lymhurst">Lymhurst (Chicken bonus)</option>
              <option value="Fort Sterling">Fort Sterling (Goose bonus)</option>
              <option value="Bridgewatch">Bridgewatch (Goat bonus)</option>
              <option value="Martlock">Martlock (Pig bonus)</option>
              <option value="Thetford">Thetford (Sheep bonus)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 mt-5">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-red-500" />
            <span className="text-sm text-zinc-200">Use Focus</span>
          </label>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Sell Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setSellMode('market')} className={`h-10 rounded text-[11px] font-semibold ${sellMode === 'market' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Market (−6.5%)
              </button>
              <button onClick={() => setSellMode('discord')} className={`h-10 rounded text-[11px] font-semibold ${sellMode === 'discord' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Discord (−5%)
              </button>
            </div>
          </div>
          <button onClick={scan} disabled={loading} className="mt-5 px-6 py-2.5 rounded-lg text-sm font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Scan Animals'}
          </button>
        </div>

        {scannedAt && <div className="mt-3 text-[10px] text-zinc-600">Scanned at {scannedAt}</div>}
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500">1 → {r.effectiveOutput.toFixed(1)} meat</span>
                        <span className="text-[10px] text-cyan-400">{formatPercent(r.effectiveRR * 100)} RR</span>
                      </div>
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
                    <span className="text-zinc-400 flex-1">Buy @ {r.rawCity}</span>
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.rawPrice)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ItemIcon itemId={r.meatId} size={20} />
                    <span className="text-zinc-400 flex-1">Sell {Math.floor(r.effectiveOutput)} @ {r.meatCity}</span>
                    <span className="text-green-400 tabular-nums">+{formatSilver(r.revenue)}</span>
                  </div>
                </div>

                <div className="px-4 py-2 text-[10px] text-zinc-600 flex items-center justify-between">
                  <span>Butcher @ {r.butcherCity}</span>
                  {r.cityBonusActive ? (
                    <span className="text-green-400 font-semibold">★ bonus active</span>
                  ) : (
                    <span className="text-zinc-700">no bonus</span>
                  )}
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
            Click scan — shows which animal is most profitable to butcher right now, using per-animal city bonuses.
          </p>
        </div>
      )}

      {!loading && scannedAt && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No butcher profit found — animals and meat market might be thin.
        </div>
      )}
    </div>
  );
}
