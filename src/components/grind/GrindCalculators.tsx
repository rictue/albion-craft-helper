import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MarketPrice } from '../../types';
import { fetchPrices } from '../../services/api';
import { formatPercent, formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

type Tab = 'enchanting' | 'laborers' | 'alchemy' | 'fish';

const CITIES = ['Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford', 'Caerleon', 'Brecilien', 'Black Market'];
const BUY_CITIES = CITIES.filter(city => city !== 'Black Market');
const SELL_CITIES = CITIES;
const SELL_TAX_PREMIUM = 0.065;
const SELL_TAX_FREE = 0.105;
const BUY_ORDER_FEE = 0.025;

const CATEGORY_COUNTS = [
  { id: 'helmet', label: 'Helmet', catalysts: 96 },
  { id: 'armor', label: 'Armor', catalysts: 192 },
  { id: 'boots', label: 'Boots', catalysts: 96 },
  { id: 'onehand', label: 'One-handed weapon', catalysts: 288 },
  { id: 'twohand', label: 'Two-handed weapon', catalysts: 384 },
  { id: 'offhand', label: 'Off-hand', catalysts: 96 },
  { id: 'bag', label: 'Bag', catalysts: 96 },
  { id: 'cape', label: 'Cape', catalysts: 96 },
];

const LABORER_PRESETS = [
  { id: 'T6_JOURNAL_WARRIOR', label: 'Warrior Journal' },
  { id: 'T6_JOURNAL_MAGE', label: 'Mage Journal' },
  { id: 'T6_JOURNAL_HUNTER', label: 'Hunter Journal' },
  { id: 'T6_JOURNAL_TOOLMAKER', label: 'Toolmaker Journal' },
];

const COVERAGE = [
  { name: 'Farming Profit', route: '/farming', note: 'Already in AlbionCrafts' },
  { name: 'Animal Profit', route: '/farmbreed', note: 'Covered by Farm & Breed' },
  { name: 'Market Flipping', route: '/flipper', note: 'Already in AlbionCrafts' },
  { name: 'Cooking Profit', route: '/cooking', note: 'Already in AlbionCrafts' },
  { name: 'Refining Profit', route: '/refining', note: 'Already stronger than AOG soon page' },
  { name: 'Craft Planner', route: '/planner', note: 'Already in AlbionCrafts' },
];

interface ScanResult {
  investment: number;
  revenue: number;
  profit: number;
  margin: number;
  details: Array<{ label: string; value: string; tone?: string }>;
  missing: string[];
}

function suffixEnchant(baseId: string, enchant: number): string {
  const clean = baseId.replace(/@\d+$/, '');
  return enchant > 0 ? `${clean}@${enchant}` : clean;
}

function catalystForTarget(tier: number, targetEnchant: number): string {
  const kind = targetEnchant === 1 ? 'RUNE' : targetEnchant === 2 ? 'SOUL' : 'RELIC';
  return `T${tier}_${kind}`;
}

function minSell(prices: MarketPrice[], itemId: string, city: string): number {
  const values = prices
    .filter(p => p.item_id === itemId && p.city === city && p.sell_price_min > 0)
    .map(p => p.sell_price_min);
  return values.length ? Math.min(...values) : 0;
}

function maxBuy(prices: MarketPrice[], itemId: string, city: string): number {
  const values = prices
    .filter(p => p.item_id === itemId && p.city === city && p.buy_price_max > 0)
    .map(p => p.buy_price_max);
  return values.length ? Math.max(...values) : 0;
}

function buyPrice(prices: MarketPrice[], itemId: string, city: string, includeBuyOrderFee: boolean): number {
  const price = minSell(prices, itemId, city);
  return includeBuyOrderFee ? price * (1 + BUY_ORDER_FEE) : price;
}

function sellPrice(prices: MarketPrice[], itemId: string, city: string, premium: boolean): number {
  const raw = city === 'Black Market' ? maxBuy(prices, itemId, city) : minSell(prices, itemId, city);
  const tax = premium ? SELL_TAX_PREMIUM : SELL_TAX_FREE;
  return raw * (1 - tax);
}

function margin(profit: number, investment: number): number {
  return investment > 0 ? (profit / investment) * 100 : 0;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-gold/35';

function CitySelect({ value, onChange, cities = CITIES }: { value: string; onChange: (value: string) => void; cities?: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputClass}>
      {cities.map(city => <option key={city} value={city}>{city}</option>)}
    </select>
  );
}

function ResultPanel({ result }: { result: ScanResult | null }) {
  if (!result) {
    return (
      <div className="medieval-panel p-5 text-sm text-zinc-500">
        Fetch prices to calculate this module.
      </div>
    );
  }

  const isProfit = result.profit >= 0;
  return (
    <div className={`medieval-panel p-5 ${isProfit ? 'border-emerald-700/45' : 'border-red-800/45'}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="stat-rune rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Investment</div>
          <div className="mt-1 text-xl font-black text-zinc-100">{formatSilver(result.investment)}</div>
        </div>
        <div className="stat-rune rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Revenue</div>
          <div className="mt-1 text-xl font-black text-zinc-100">{formatSilver(result.revenue)}</div>
        </div>
        <div className="stat-rune rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Profit</div>
          <div className={`mt-1 text-xl font-black ${isProfit ? 'text-profit' : 'text-loss'}`}>
            {isProfit ? '+' : ''}{formatSilver(result.profit)}
          </div>
          <div className={`text-xs font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>{formatPercent(result.margin)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {result.details.map(item => (
          <div key={item.label} className="flex items-center justify-between rounded border border-[color:var(--color-border)] bg-black/15 px-3 py-2 text-xs">
            <span className="text-zinc-500">{item.label}</span>
            <span className={`font-bold tabular-nums ${item.tone ?? 'text-zinc-200'}`}>{item.value}</span>
          </div>
        ))}
      </div>

      {result.missing.length > 0 && (
        <div className="mt-4 rounded border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Missing market data: {result.missing.join(', ')}
        </div>
      )}
    </div>
  );
}

function EnchantingCalculator() {
  const [tier, setTier] = useState(6);
  const [baseId, setBaseId] = useState('T6_MAIN_SWORD');
  const [currentEnchant, setCurrentEnchant] = useState(2);
  const [targetEnchant, setTargetEnchant] = useState(3);
  const [category, setCategory] = useState(CATEGORY_COUNTS[3].id);
  const [quantity, setQuantity] = useState(1);
  const [buyCity, setBuyCity] = useState('Martlock');
  const [sellCity, setSellCity] = useState('Black Market');
  const [premium, setPremium] = useState(true);
  const [includeBuyFee, setIncludeBuyFee] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCategory = CATEGORY_COUNTS.find(c => c.id === category) ?? CATEGORY_COUNTS[3];
  const currentItem = suffixEnchant(baseId, currentEnchant);
  const targetItem = suffixEnchant(baseId, targetEnchant);
  const catalystId = catalystForTarget(tier, targetEnchant);

  const scan = useCallback(async () => {
    setLoading(true);
    const ids = [currentItem, targetItem, catalystId];
    const prices = await fetchPrices(ids, CITIES, true, true);

    const current = buyPrice(prices, currentItem, buyCity, includeBuyFee);
    const catalyst = buyPrice(prices, catalystId, buyCity, includeBuyFee);
    const target = sellPrice(prices, targetItem, sellCity, premium);
    const catalystCost = catalyst * selectedCategory.catalysts;
    const investment = (current + catalystCost) * quantity;
    const revenue = target * quantity;
    const profit = revenue - investment;
    const missing = [
      current <= 0 ? currentItem : '',
      catalyst <= 0 ? catalystId : '',
      target <= 0 ? targetItem : '',
    ].filter(Boolean);

    setResult({
      investment,
      revenue,
      profit,
      margin: margin(profit, investment),
      missing,
      details: [
        { label: 'Current item', value: `${formatSilver(current)} x ${quantity}` },
        { label: 'Target item', value: `${formatSilver(target)} x ${quantity}` },
        { label: 'Catalyst', value: `${selectedCategory.catalysts} x ${formatSilver(catalyst)}` },
        { label: 'Step', value: `.${currentEnchant} -> .${targetEnchant}` },
      ],
    });
    setLoading(false);
  }, [buyCity, catalystId, currentEnchant, currentItem, includeBuyFee, premium, quantity, selectedCategory.catalysts, sellCity, targetEnchant, targetItem]);

  return (
    <CalculatorShell
      title="Item Enchanting"
      subtitle="Compare current item + runes/souls/relics against the enchanted sell price."
      icon="T6_RELIC"
      onScan={scan}
      loading={loading}
      result={result}
    >
      <Field label="Base item ID">
        <input value={baseId} onChange={e => setBaseId(e.target.value.trim())} className={inputClass} />
      </Field>
      <Field label="Tier">
        <select value={tier} onChange={e => setTier(Number(e.target.value))} className={inputClass}>
          {[4, 5, 6, 7, 8].map(t => <option key={t} value={t}>T{t}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
          {CATEGORY_COUNTS.map(c => <option key={c.id} value={c.id}>{c.label} ({c.catalysts})</option>)}
        </select>
      </Field>
      <Field label="Current / target">
        <div className="grid grid-cols-2 gap-2">
          <select value={currentEnchant} onChange={e => setCurrentEnchant(Number(e.target.value))} className={inputClass}>
            {[0, 1, 2].map(e => <option key={e} value={e}>.{e}</option>)}
          </select>
          <select value={targetEnchant} onChange={e => setTargetEnchant(Number(e.target.value))} className={inputClass}>
            {[1, 2, 3].map(e => <option key={e} value={e}>.{e}</option>)}
          </select>
        </div>
      </Field>
      <Field label="Quantity">
        <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Buy materials from"><CitySelect value={buyCity} onChange={setBuyCity} cities={BUY_CITIES} /></Field>
      <Field label="Sell item to"><CitySelect value={sellCity} onChange={setSellCity} cities={SELL_CITIES} /></Field>
      <Toggle label="Premium" checked={premium} onChange={setPremium} />
      <Toggle label="Include buy order fee" checked={includeBuyFee} onChange={setIncludeBuyFee} />
    </CalculatorShell>
  );
}

function LaborersCalculator() {
  const [journalBase, setJournalBase] = useState('T6_JOURNAL_WARRIOR');
  const [quantity, setQuantity] = useState(15);
  const [buyCity, setBuyCity] = useState('Fort Sterling');
  const [sellCity, setSellCity] = useState('Fort Sterling');
  const [materialValue, setMaterialValue] = useState(8500);
  const [happiness, setHappiness] = useState(150);
  const [premium, setPremium] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fullId = `${journalBase}_FULL`;
  const emptyId = `${journalBase}_EMPTY`;

  const scan = useCallback(async () => {
    setLoading(true);
    const prices = await fetchPrices([fullId, emptyId], CITIES, true, true);
    const full = buyPrice(prices, fullId, buyCity, false);
    const empty = sellPrice(prices, emptyId, sellCity, premium);
    const returns = materialValue * (happiness / 100);
    const investment = full * quantity;
    const revenue = (empty + returns) * quantity;
    const profit = revenue - investment;

    setResult({
      investment,
      revenue,
      profit,
      margin: margin(profit, investment),
      missing: [full <= 0 ? fullId : '', empty <= 0 ? emptyId : ''].filter(Boolean),
      details: [
        { label: 'Full journal buy', value: formatSilver(full) },
        { label: 'Empty journal sell', value: formatSilver(empty) },
        { label: 'Material return', value: `${formatSilver(returns)} / journal` },
        { label: 'Happiness', value: formatPercent(happiness) },
      ],
    });
    setLoading(false);
  }, [buyCity, emptyId, fullId, happiness, materialValue, premium, quantity, sellCity]);

  return (
    <CalculatorShell
      title="Laborers"
      subtitle="Full journal cost vs empty journal sellback plus expected material return."
      icon="T6_JOURNAL_WARRIOR_FULL"
      onScan={scan}
      loading={loading}
      result={result}
    >
      <Field label="Journal preset">
        <select value={journalBase} onChange={e => setJournalBase(e.target.value)} className={inputClass}>
          {LABORER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      <Field label="Journal item base">
        <input value={journalBase} onChange={e => setJournalBase(e.target.value.trim())} className={inputClass} />
      </Field>
      <Field label="Journals">
        <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Buy full journals"><CitySelect value={buyCity} onChange={setBuyCity} cities={BUY_CITIES} /></Field>
      <Field label="Sell empties/materials"><CitySelect value={sellCity} onChange={setSellCity} cities={BUY_CITIES} /></Field>
      <Field label="Material value / journal">
        <input type="number" min={0} value={materialValue} onChange={e => setMaterialValue(Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
      </Field>
      <Field label="Happiness %">
        <input type="number" min={100} max={150} value={happiness} onChange={e => setHappiness(Math.max(100, Math.min(150, Number(e.target.value) || 100)))} className={inputClass} />
      </Field>
      <Toggle label="Premium sell tax" checked={premium} onChange={setPremium} />
    </CalculatorShell>
  );
}

interface IngredientLine {
  itemId: string;
  count: number;
}

function AlchemyCalculator() {
  const [outputId, setOutputId] = useState('T8_POTION_POISON');
  const [outputQty, setOutputQty] = useState(5);
  const [crafts, setCrafts] = useState(20);
  const [ingredients, setIngredients] = useState<IngredientLine[]>([
    { itemId: 'T8_YARROW', count: 72 },
    { itemId: 'T7_MULLEIN', count: 36 },
    { itemId: 'T6_TEASEL', count: 36 },
  ]);
  const [buyCity, setBuyCity] = useState('Fort Sterling');
  const [sellCity, setSellCity] = useState('Fort Sterling');
  const [usageFee, setUsageFee] = useState(0);
  const [rrr, setRrr] = useState(15.3);
  const [premium, setPremium] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const updateIngredient = (index: number, patch: Partial<IngredientLine>) => {
    setIngredients(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const scan = useCallback(async () => {
    setLoading(true);
    const ids = [outputId, ...ingredients.map(i => i.itemId).filter(Boolean)];
    const prices = await fetchPrices(ids, CITIES, true, true);
    const returnFactor = 1 - Math.max(0, Math.min(0.95, rrr / 100));
    let ingredientCost = 0;
    const missing: string[] = [];

    for (const ingredient of ingredients) {
      if (!ingredient.itemId || ingredient.count <= 0) continue;
      const price = buyPrice(prices, ingredient.itemId, buyCity, false);
      if (price <= 0) missing.push(ingredient.itemId);
      ingredientCost += price * ingredient.count * returnFactor;
    }

    const sell = sellPrice(prices, outputId, sellCity, premium);
    if (sell <= 0) missing.push(outputId);
    const investment = (ingredientCost + usageFee) * crafts;
    const revenue = sell * outputQty * crafts;
    const profit = revenue - investment;

    setResult({
      investment,
      revenue,
      profit,
      margin: margin(profit, investment),
      missing,
      details: [
        { label: 'Output sell', value: `${formatSilver(sell)} x ${outputQty}` },
        { label: 'Ingredient cost', value: `${formatSilver(ingredientCost)} / craft` },
        { label: 'Resource return', value: formatPercent(rrr) },
        { label: 'Crafts', value: crafts.toLocaleString('en-US') },
      ],
    });
    setLoading(false);
  }, [buyCity, crafts, ingredients, outputId, outputQty, premium, rrr, sellCity, usageFee]);

  return (
    <CalculatorShell
      title="Alchemy"
      subtitle="Potion output vs herb/input costs with custom resource return rate."
      icon="T8_POTION_POISON"
      onScan={scan}
      loading={loading}
      result={result}
    >
      <Field label="Potion item ID">
        <input value={outputId} onChange={e => setOutputId(e.target.value.trim())} className={inputClass} />
      </Field>
      <Field label="Output / craft">
        <input type="number" min={1} value={outputQty} onChange={e => setOutputQty(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Crafts">
        <input type="number" min={1} value={crafts} onChange={e => setCrafts(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Buy ingredients"><CitySelect value={buyCity} onChange={setBuyCity} cities={BUY_CITIES} /></Field>
      <Field label="Sell potion"><CitySelect value={sellCity} onChange={setSellCity} cities={BUY_CITIES} /></Field>
      <Field label="RRR %">
        <input type="number" min={0} max={95} step={0.1} value={rrr} onChange={e => setRrr(Math.max(0, Math.min(95, Number(e.target.value) || 0)))} className={inputClass} />
      </Field>
      <Field label="Usage fee / craft">
        <input type="number" min={0} value={usageFee} onChange={e => setUsageFee(Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
      </Field>
      <Toggle label="Premium sell tax" checked={premium} onChange={setPremium} />
      <div className="sm:col-span-2 lg:col-span-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Ingredients</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
              <input value={ingredient.itemId} onChange={e => updateIngredient(index, { itemId: e.target.value.trim() })} className={inputClass} />
              <input type="number" min={0} value={ingredient.count} onChange={e => updateIngredient(index, { count: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} />
            </div>
          ))}
        </div>
      </div>
    </CalculatorShell>
  );
}

function FishCalculator() {
  const [fishId, setFishId] = useState('T3_FISH_FRESHWATER_ALL_COMMON');
  const [chopsId, setChopsId] = useState('T1_FISHCHOPS');
  const [fishCount, setFishCount] = useState(100);
  const [chopsPerFish, setChopsPerFish] = useState(2);
  const [buyCity, setBuyCity] = useState('Fort Sterling');
  const [sellCity, setSellCity] = useState('Fort Sterling');
  const [premium, setPremium] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    const prices = await fetchPrices([fishId, chopsId], CITIES, true, true);
    const fish = buyPrice(prices, fishId, buyCity, false);
    const chops = sellPrice(prices, chopsId, sellCity, premium);
    const investment = fish * fishCount;
    const revenue = chops * chopsPerFish * fishCount;
    const profit = revenue - investment;

    setResult({
      investment,
      revenue,
      profit,
      margin: margin(profit, investment),
      missing: [fish <= 0 ? fishId : '', chops <= 0 ? chopsId : ''].filter(Boolean),
      details: [
        { label: 'Fish buy', value: formatSilver(fish) },
        { label: 'Chopped fish sell', value: formatSilver(chops) },
        { label: 'Chops per fish', value: chopsPerFish.toLocaleString('en-US') },
        { label: 'Fish count', value: fishCount.toLocaleString('en-US') },
      ],
    });
    setLoading(false);
  }, [buyCity, chopsId, chopsPerFish, fishCount, fishId, premium, sellCity]);

  return (
    <CalculatorShell
      title="Chopped Fish"
      subtitle="Compare raw fish purchase cost with chopped fish output value."
      icon="T1_FISHCHOPS"
      onScan={scan}
      loading={loading}
      result={result}
    >
      <Field label="Fish item ID">
        <input value={fishId} onChange={e => setFishId(e.target.value.trim())} className={inputClass} />
      </Field>
      <Field label="Chopped fish ID">
        <input value={chopsId} onChange={e => setChopsId(e.target.value.trim())} className={inputClass} />
      </Field>
      <Field label="Fish count">
        <input type="number" min={1} value={fishCount} onChange={e => setFishCount(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Chops / fish">
        <input type="number" min={1} value={chopsPerFish} onChange={e => setChopsPerFish(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
      </Field>
      <Field label="Buy fish"><CitySelect value={buyCity} onChange={setBuyCity} cities={BUY_CITIES} /></Field>
      <Field label="Sell chopped fish"><CitySelect value={sellCity} onChange={setSellCity} cities={BUY_CITIES} /></Field>
      <Toggle label="Premium sell tax" checked={premium} onChange={setPremium} />
    </CalculatorShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-gold" />
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
    </label>
  );
}

function CalculatorShell({
  title,
  subtitle,
  icon,
  children,
  onScan,
  loading,
  result,
}: {
  title: string;
  subtitle: string;
  icon: string;
  children: ReactNode;
  onScan: () => void;
  loading: boolean;
  result: ScanResult | null;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <div className="medieval-panel p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="icon-frame h-14 w-14 rounded-lg">
            <ItemIcon itemId={icon} size={48} />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-50">{title}</h2>
            <p className="text-sm text-[#bba485]">{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
        <button
          onClick={onScan}
          disabled={loading}
          className="mt-5 w-full rounded-lg border border-gold/45 bg-gold/15 px-4 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-gold-light transition hover:bg-gold/25 disabled:opacity-50"
        >
          {loading ? 'Fetching prices...' : 'Fetch prices'}
        </button>
      </div>
      <ResultPanel result={result} />
    </section>
  );
}

export default function GrindCalculators() {
  const [tab, setTab] = useState<Tab>('enchanting');

  const active = useMemo(() => {
    if (tab === 'enchanting') return <EnchantingCalculator />;
    if (tab === 'laborers') return <LaborersCalculator />;
    if (tab === 'alchemy') return <AlchemyCalculator />;
    return <FishCalculator />;
  }, [tab]);

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="medieval-hero rounded-lg px-6 py-8">
        <div className="relative z-10">
          <div className="ornament-line mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-gold-light">
            Albion Online Grind style coverage
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-50 sm:text-5xl">Grind Calculators</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#d7c7ad]">
            A calculator hub inspired by Albion Online Grind's public calculator lineup, rebuilt for AlbionCrafts with
            our medieval UI, live Albion Data prices, and editable assumptions.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {COVERAGE.map(item => (
          <Link key={item.route} to={item.route} className="tool-card rounded-lg p-4 transition hover:-translate-y-0.5">
            <div className="text-sm font-black text-zinc-100">{item.name}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-[#bba485]">{item.note}</div>
          </Link>
        ))}
      </div>

      <div className="medieval-panel flex flex-wrap gap-2 p-2">
        {[
          ['enchanting', 'Item Enchanting'],
          ['laborers', 'Laborers'],
          ['alchemy', 'Alchemy'],
          ['fish', 'Chopped Fish'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
              tab === id
                ? 'border-gold/45 bg-gold/15 text-gold-light'
                : 'border-transparent text-zinc-500 hover:border-[color:var(--color-border)] hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {active}

      <div className="rounded-lg border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-xs leading-relaxed text-zinc-500">
        These modules are original AlbionCrafts implementations. They use AOG's public calculator categories as a feature checklist, not copied source code.
        For exact edge cases, keep item IDs and output counts editable because Albion's recipes and market IDs can vary by item family.
      </div>
    </div>
  );
}
