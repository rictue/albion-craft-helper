import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

const PREMIUM_TAX = 0.065;

// Crop data — each crop has a seed + harvested crop. Seeds sold by NPC at fixed price.
// Watered = 100% seed return, Unwatered = ~80% return, ~3-6 crops per seed (6-12 with premium)
const CROPS = [
  { tier: 2, name: 'Carrot', seedId: 'T2_FARM_CARROT_SEED', cropId: 'T2_CARROT', npcSeed: 500, yieldAvg: 9 },
  { tier: 3, name: 'Bean', seedId: 'T3_FARM_BEAN_SEED', cropId: 'T3_BEAN', npcSeed: 1500, yieldAvg: 9 },
  { tier: 4, name: 'Wheat', seedId: 'T4_FARM_WHEAT_SEED', cropId: 'T4_WHEAT', npcSeed: 3000, yieldAvg: 9 },
  { tier: 5, name: 'Turnip', seedId: 'T5_FARM_TURNIP_SEED', cropId: 'T5_TURNIP', npcSeed: 5000, yieldAvg: 9 },
  { tier: 6, name: 'Cabbage', seedId: 'T6_FARM_CABBAGE_SEED', cropId: 'T6_CABBAGE', npcSeed: 10000, yieldAvg: 9 },
  { tier: 7, name: 'Potato', seedId: 'T7_FARM_POTATO_SEED', cropId: 'T7_POTATO', npcSeed: 20000, yieldAvg: 9 },
  { tier: 8, name: 'Corn', seedId: 'T8_FARM_CORN_SEED', cropId: 'T8_CORN', npcSeed: 40000, yieldAvg: 9 },
];

// Animal breeding data (approximate base rates)
const ANIMALS = [
  { tier: 3, name: 'Chicken', babyId: 'T3_FARM_CHICKEN_BABY', grownId: 'T3_FARM_CHICKEN_GROWN', meatId: 'T3_MEAT', eggId: 'T3_EGG', feedCrop: 'Carrot', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.8 },
  { tier: 4, name: 'Goose', babyId: 'T4_FARM_GOOSE_BABY', grownId: 'T4_FARM_GOOSE_GROWN', meatId: 'T4_MEAT', eggId: 'T4_EGG', feedCrop: 'Bean', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.8 },
  { tier: 5, name: 'Goat', babyId: 'T5_FARM_GOAT_BABY', grownId: 'T5_FARM_GOAT_GROWN', meatId: 'T5_MEAT', eggId: '', feedCrop: 'Wheat', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.85 },
  { tier: 6, name: 'Pig', babyId: 'T6_FARM_PIG_BABY', grownId: 'T6_FARM_PIG_GROWN', meatId: 'T6_MEAT', eggId: '', feedCrop: 'Turnip', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.9 },
  { tier: 7, name: 'Sheep', babyId: 'T7_FARM_SHEEP_BABY', grownId: 'T7_FARM_SHEEP_GROWN', meatId: 'T7_MEAT', eggId: '', feedCrop: 'Cabbage', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.9 },
  { tier: 8, name: 'Cow', babyId: 'T8_FARM_COW_BABY', grownId: 'T8_FARM_COW_GROWN', meatId: 'T8_MEAT', eggId: '', feedCrop: 'Potato', feedAmount: 9, meatPerButcher: 18, baseOffspring: 0.93 },
];

interface CropResult {
  tier: number;
  name: string;
  seedPrice: number;
  seedSource: 'NPC' | 'Market';
  cropPrice: number;
  cropCity: string;
  yieldPerSeed: number;
  netSeedCost: number;
  revenuePerPlot: number;
  profitPerPlot: number;
  profit79Plots: number;
  marginPct: number;
}

interface AnimalResult {
  tier: number;
  name: string;
  babyPrice: number;
  babyCity: string;
  meatPrice: number;
  meatCity: string;
  feedCost: number;
  babyReturn: number;
  netBabyCost: number;
  meatRevenue: number;
  profitPerAnimal: number;
  profit79Pastures: number;
}

export default function FarmBreed() {
  const [plots, setPlots] = useState(79);
  const [watered, setWatered] = useState(true);
  const [premium, setPremium] = useState(true);
  const [focus, setFocus] = useState(false);
  const [cropResults, setCropResults] = useState<CropResult[]>([]);
  const [animalResults, setAnimalResults] = useState<AnimalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setCropResults([]);
    setAnimalResults([]);

    // Gather all IDs
    const ids: string[] = [];
    for (const c of CROPS) { ids.push(c.seedId, c.cropId); }
    for (const a of ANIMALS) {
      ids.push(a.babyId, a.grownId, a.meatId);
      if (a.eggId) ids.push(a.eggId);
    }

    const prices = await fetchPrices(ids);

    // Build cheapest/highest maps
    const cheapest = new Map<string, { price: number; city: string }>();
    const highest = new Map<string, { price: number; city: string }>();
    for (const p of prices) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapest.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });
      const hi = highest.get(p.item_id);
      if (!hi || p.sell_price_min > hi.price) highest.set(p.item_id, { price: p.sell_price_min, city: p.city });
    }

    // Crop profitability
    const yieldPerSeed = watered ? (premium ? 9 : 4.5) : (premium ? 7 : 3.5);
    const seedReturn = watered ? 1.0 : 0.8;

    const crops: CropResult[] = [];
    for (const c of CROPS) {
      const marketSeed = cheapest.get(c.seedId);
      const seedPrice = marketSeed ? Math.min(marketSeed.price, c.npcSeed) : c.npcSeed;
      const seedSource = marketSeed && marketSeed.price < c.npcSeed ? 'Market' : 'NPC';

      const cropP = highest.get(c.cropId);
      if (!cropP) continue;

      const netSeedCost = seedPrice * (1 - seedReturn);
      const revenuePerPlot = yieldPerSeed * 9 * cropP.price * (1 - (premium ? PREMIUM_TAX : 0.105)); // 9 seeds per plot
      const seedCostPerPlot = netSeedCost * 9;
      const profitPerPlot = revenuePerPlot - seedCostPerPlot;
      const marginPct = seedCostPerPlot > 0 ? (profitPerPlot / seedCostPerPlot) * 100 : 0;

      crops.push({
        tier: c.tier,
        name: c.name,
        seedPrice,
        seedSource,
        cropPrice: cropP.price,
        cropCity: cropP.city,
        yieldPerSeed,
        netSeedCost,
        revenuePerPlot,
        profitPerPlot,
        profit79Plots: profitPerPlot * plots,
        marginPct,
      });
    }

    // Animal profitability (simple estimate)
    const animals: AnimalResult[] = [];
    const offspringBoost = focus ? 0.3 : 0;

    for (const a of ANIMALS) {
      const babyP = cheapest.get(a.babyId);
      const meatP = highest.get(a.meatId);
      if (!babyP || !meatP) continue;

      // Estimate feed cost: 9 crops per animal × avg crop price
      const feedCrop = CROPS.find(c => c.name === a.feedCrop);
      const feedCropPrice = feedCrop ? (cheapest.get(feedCrop.cropId)?.price ?? 0) : 0;
      const feedCost = a.feedAmount * feedCropPrice;

      const babyReturnRate = Math.min(1.0, a.baseOffspring + offspringBoost);
      // Each pasture produces 1 animal. Net baby cost = buy price × (1 - return)
      const netBabyCost = babyP.price * (1 - babyReturnRate);
      const meatRevenue = a.meatPerButcher * meatP.price * (1 - (premium ? PREMIUM_TAX : 0.105));
      const profitPerAnimal = meatRevenue - netBabyCost - feedCost;

      animals.push({
        tier: a.tier,
        name: a.name,
        babyPrice: babyP.price,
        babyCity: babyP.city,
        meatPrice: meatP.price,
        meatCity: meatP.city,
        feedCost,
        babyReturn: babyReturnRate,
        netBabyCost,
        meatRevenue,
        profitPerAnimal,
        profit79Pastures: profitPerAnimal * plots,
      });
    }

    crops.sort((a, b) => b.profitPerPlot - a.profitPerPlot);
    animals.sort((a, b) => b.profitPerAnimal - a.profitPerAnimal);

    setCropResults(crops);
    setAnimalResults(animals);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [plots, watered, premium, focus]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-lime-500/10 via-green-500/5 to-transparent rounded-xl border border-lime-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">Farm & Breed Calculator</div>
        <div className="text-xs text-zinc-500">Crop farming + animal breeding profit per plot. 79 plots = 5 islands.</div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Plots</label>
            <input type="number" min={1} value={plots} onChange={(e) => setPlots(parseInt(e.target.value) || 1)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-lime-500/40" />
          </div>
          <label className="flex items-end gap-2 cursor-pointer pb-2">
            <input type="checkbox" checked={watered} onChange={(e) => setWatered(e.target.checked)} className="accent-lime-500 w-4 h-4" />
            <span className="text-sm text-zinc-300">Watered</span>
          </label>
          <label className="flex items-end gap-2 cursor-pointer pb-2">
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-lime-500 w-4 h-4" />
            <span className="text-sm text-zinc-300">Premium</span>
          </label>
          <label className="flex items-end gap-2 cursor-pointer pb-2">
            <input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} className="accent-lime-500 w-4 h-4" />
            <span className="text-sm text-zinc-300">Focus (nurture)</span>
          </label>
          <button onClick={scan} disabled={loading} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30 disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Scan'}
          </button>
        </div>
        {scannedAt && <div className="text-[10px] text-zinc-600 mt-3">Scanned at {scannedAt}</div>}
      </div>

      {/* Crops */}
      {cropResults.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs uppercase tracking-wider text-lime-400 font-semibold">🌱 Crops (per plot, 22h cycle)</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 w-10"></th>
                <th className="text-left px-3 py-2.5">Crop</th>
                <th className="text-right px-3 py-2.5">Seed</th>
                <th className="text-left px-3 py-2.5">Src</th>
                <th className="text-right px-3 py-2.5">Crop Sell</th>
                <th className="text-left px-3 py-2.5">At</th>
                <th className="text-right px-3 py-2.5">Yield</th>
                <th className="text-right px-3 py-2.5">Profit/Plot</th>
                <th className="text-right px-3 py-2.5">Profit × {plots}</th>
                <th className="text-right px-3 py-2.5">Margin</th>
              </tr>
            </thead>
            <tbody>
              {cropResults.map(r => (
                <tr key={r.tier} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2"><ItemIcon itemId={`T${r.tier}_${r.name.toUpperCase()}`} size={24} /></td>
                  <td className="px-3 py-2 text-zinc-200">T{r.tier} {r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.seedPrice)}</td>
                  <td className="px-3 py-2 text-[10px] text-zinc-500">{r.seedSource}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.cropPrice)}</td>
                  <td className="px-3 py-2 text-green-400 text-[10px]">{r.cropCity}</td>
                  <td className="px-3 py-2 text-right text-lime-400">{r.yieldPerSeed.toFixed(1)}×</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.profitPerPlot > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profitPerPlot > 0 ? '+' : ''}{formatSilver(r.profitPerPlot)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit79Plots > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profit79Plots > 0 ? '+' : ''}{formatSilver(r.profit79Plots)}
                  </td>
                  <td className={`px-3 py-2 text-right ${r.marginPct > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(r.marginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Animals */}
      {animalResults.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs uppercase tracking-wider text-amber-400 font-semibold">🐄 Animals (per pasture)</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 w-10"></th>
                <th className="text-left px-3 py-2.5">Animal</th>
                <th className="text-right px-3 py-2.5">Baby Buy</th>
                <th className="text-right px-3 py-2.5">Meat Sell</th>
                <th className="text-right px-3 py-2.5">Offspring</th>
                <th className="text-right px-3 py-2.5">Feed Cost</th>
                <th className="text-right px-3 py-2.5">Profit/Animal</th>
                <th className="text-right px-3 py-2.5">Profit × {plots}</th>
              </tr>
            </thead>
            <tbody>
              {animalResults.map(r => (
                <tr key={r.tier} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2"><ItemIcon itemId={`T${r.tier}_FARM_${r.name.toUpperCase()}_GROWN`} size={24} /></td>
                  <td className="px-3 py-2 text-zinc-200">T{r.tier} {r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.babyPrice)} <span className="text-[9px] text-zinc-600">{r.babyCity.substring(0, 4)}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.meatPrice)} <span className="text-[9px] text-zinc-600">{r.meatCity.substring(0, 4)}</span></td>
                  <td className="px-3 py-2 text-right text-lime-400">{formatPercent(r.babyReturn * 100)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">-{formatSilver(r.feedCost)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.profitPerAnimal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profitPerAnimal > 0 ? '+' : ''}{formatSilver(r.profitPerAnimal)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit79Pastures > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profit79Pastures > 0 ? '+' : ''}{formatSilver(r.profit79Pastures)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Notes</div>
        <div className="text-xs text-zinc-400 space-y-1">
          <div>• <strong className="text-lime-400">Watered</strong>: 100% seed return · <strong className="text-zinc-500">Unwatered</strong>: 80% return</div>
          <div>• <strong className="text-lime-400">Premium</strong>: 2× crop yield (9 avg instead of 4.5)</div>
          <div>• <strong className="text-amber-400">Focus (nurture)</strong>: +30% offspring rate (estimated)</div>
          <div>• Animal profit is a simplified estimate — actual varies with spec and butcher station</div>
          <div>• Crop/seed market data often sparse — NPC prices used as fallback</div>
        </div>
      </div>

      {!loading && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">🌾</div>
          <p className="text-sm text-zinc-500">Click scan to compare crop + animal profit for your {plots} plots.</p>
        </div>
      )}
    </div>
  );
}
