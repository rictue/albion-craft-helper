import { useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  StatCard,
  ProfitBadge,
  WarningBox,
  Button,
  Select,
  NumberInput,
  SectionDivider,
  DataTable,
  EmptyState,
} from '../ui';
import type { Column } from '../ui';
import ItemIcon from '../common/ItemIcon';
import {
  RESOURCES,
  RECIPES,
  ALL_TARGETS,
  ALL_LEVELS,
  getRecipesFor,
  getRecipeCost,
  resourceItemId,
  compareLevels,
} from '../../data/transmutations';
import type { ResourceType, Recipe } from '../../data/transmutations';
import {
  calculateTransmute,
  decisionFor,
  decisionMeta,
  resolveMultiplier,
  SALE_MULTIPLIERS,
  DEFAULT_THRESHOLDS,
} from '../../utils/transmutationCalc';
import type { SaleMode, DecisionThresholds, Decision } from '../../utils/transmutationCalc';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { IconFurnace } from '../shell/navIcons';

interface SavedOpportunity {
  id: string;
  ts: number;
  resource: ResourceType;
  from: string;
  to: string;
  buy: number;
  transmute: number;
  sell: number;
  quantity: number;
  saleMultiplier: number;
}

const LS_SAVED      = 'albion-transmute-saved-v1';
const LS_THRESHOLDS = 'albion-transmute-thresholds-v1';

function loadSaved(): SavedOpportunity[] {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    if (raw) return JSON.parse(raw) as SavedOpportunity[];
  } catch {
    // Corrupt LS — fall through to empty list rather than crash the page.
  }
  return [];
}
function persistSaved(rows: SavedOpportunity[]) {
  try { localStorage.setItem(LS_SAVED, JSON.stringify(rows)); } catch { /* quota — ignore */ }
}

function loadThresholds(): DecisionThresholds {
  try {
    const raw = localStorage.getItem(LS_THRESHOLDS);
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    // Corrupt LS — use defaults.
  }
  return DEFAULT_THRESHOLDS;
}
function persistThresholds(t: DecisionThresholds) {
  try { localStorage.setItem(LS_THRESHOLDS, JSON.stringify(t)); } catch { /* ignore */ }
}

function decisionPillClass(d: Decision): string {
  switch (d) {
    case 'strong':   return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40';
    case 'playable': return 'text-gold-light bg-gold/15 border-gold/40';
    case 'thin':     return 'text-amber-300 bg-amber-500/15 border-amber-500/40';
    case 'loss':     return 'text-rose-300 bg-rose-500/15 border-rose-500/40';
  }
}

/** Default source pick for a given target: prefer enchant-up over tier-up. */
function defaultFromFor(to: string): string {
  const sources = getRecipesFor(to);
  if (sources.length === 0) return to;
  const enchantUp = sources.find(r => r.from.startsWith(to.split('.')[0]));
  return (enchantUp ?? sources[0]).from;
}

export default function Transmutation() {
  // === Inputs ===
  const [resource, setResource] = useState<ResourceType>('wood');
  const [to, setTo]             = useState<string>('8.3');
  // `from` is derived from (to, fromOverride). When the user clicks a source
  // button we set fromOverride; if `to` changes and the override no longer
  // matches a valid source for the new target, we fall back to the default.
  const [fromOverride, setFromOverride] = useState<string | null>(null);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  // Same pattern for transmute cost: null = use recipe, number = manual.
  const [transmuteOverride, setTransmuteOverride] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [quantity, setQuantity]   = useState<number>(100);

  const [saleMode, setSaleMode]                 = useState<SaleMode>('market');
  const [customMultiplier, setCustomMultiplier] = useState<number>(0.935);

  const [sellSliderDelta, setSellSliderDelta] = useState<number>(0);
  const [showThresholds, setShowThresholds]   = useState<boolean>(false);
  const [thresholds, setThresholds]           = useState<DecisionThresholds>(() => loadThresholds());
  const [saved, setSaved]                     = useState<SavedOpportunity[]>(() => loadSaved());
  const [justCopied, setJustCopied]           = useState(false);

  // Available source levels for the current target.
  const availableSources = useMemo<Recipe[]>(() => getRecipesFor(to), [to]);

  // Derive `from`: honor override only if it's a valid source for the
  // current target; otherwise fall back to the default.
  const from = useMemo(() => {
    if (fromOverride && availableSources.some(s => s.from === fromOverride)) {
      return fromOverride;
    }
    return defaultFromFor(to);
  }, [to, availableSources, fromOverride]);

  // Derive transmute cost: override wins, else the recipe table value, else 0.
  const transmuteCost = transmuteOverride ?? (getRecipeCost(from, to) ?? 0);
  const isTransmuteOverridden = transmuteOverride !== null;

  // Persist thresholds + saved automatically.
  useEffect(() => { persistThresholds(thresholds); }, [thresholds]);
  useEffect(() => { persistSaved(saved); }, [saved]);

  const multiplier    = resolveMultiplier(saleMode, customMultiplier);
  const effectiveSell = Math.max(0, sellPrice + sellSliderDelta);

  const result = useMemo(() => calculateTransmute({
    inputBuyPrice: buyPrice,
    transmuteCost,
    outputSellPrice: effectiveSell,
    quantity,
    saleMultiplier: multiplier,
  }), [buyPrice, transmuteCost, effectiveSell, quantity, multiplier]);

  const decision     = decisionFor(result.profitPerUnit, thresholds);
  const decMeta      = decisionMeta(decision);
  const resourceInfo = RESOURCES.find(r => r.id === resource)!;

  // === Handlers ===
  const handleResetTransmute = () => setTransmuteOverride(null);

  const handleSave = () => {
    if (buyPrice <= 0 || sellPrice <= 0) return;
    const op: SavedOpportunity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      resource,
      from,
      to,
      buy: buyPrice,
      transmute: transmuteCost,
      sell: effectiveSell,
      quantity,
      saleMultiplier: multiplier,
    };
    setSaved(prev => [op, ...prev].slice(0, 200));
  };

  const handleDelete = (id: string) => {
    setSaved(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAll = () => {
    if (saved.length === 0) return;
    if (window.confirm('Clear all saved opportunities?')) setSaved([]);
  };

  const handleCopyResult = () => {
    const lines = [
      `${resourceInfo.label} T${from} → T${to}`,
      `Buy: ${formatSilver(buyPrice)}/u · Transmute: ${formatSilver(transmuteCost)}/u · Sell: ${formatSilver(effectiveSell)}/u`,
      `Qty: ${quantity} · Sale: ${(multiplier * 100).toFixed(1)}%`,
      `Profit/unit: ${formatSilver(result.profitPerUnit)} · ROI: ${result.roiPercent.toFixed(2)}%`,
      `Total profit: ${formatSilver(result.totalProfit)} (${decMeta.label})`,
      `Break-even sell: ${formatSilver(result.breakEvenSellPrice)}/u`,
    ];
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1500);
    }).catch(() => {
      // Clipboard API unavailable (insecure context) — silently no-op.
    });
  };

  const handleCsvExport = () => {
    const header = ['Resource', 'From', 'To', 'Buy/u', 'Transmute/u', 'Sell/u', 'Qty', 'Multiplier', 'Profit/u', 'Total Profit', 'ROI %', 'Decision'];
    const rows = saved.map(s => {
      const r = calculateTransmute({
        inputBuyPrice: s.buy,
        transmuteCost: s.transmute,
        outputSellPrice: s.sell,
        quantity: s.quantity,
        saleMultiplier: s.saleMultiplier,
      });
      const d = decisionMeta(decisionFor(r.profitPerUnit, thresholds)).label;
      return [
        s.resource,
        s.from,
        s.to,
        s.buy,
        s.transmute,
        s.sell,
        s.quantity,
        s.saleMultiplier,
        Math.round(r.profitPerUnit),
        Math.round(r.totalProfit),
        r.roiPercent.toFixed(2),
        d,
      ];
    });
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `albion-transmute-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Market · Transmutation"
        title="Transmutation Profit Calculator"
        description="Find profitable raw resource transmutation flips before the market corrects. Buy low-enchant, pay transmute cost, sell next-enchant — at a higher net than the spread."
        icon={IconFurnace}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setShowThresholds(s => !s)}>
            {showThresholds ? 'Hide' : 'Edit'} thresholds
          </Button>
        }
      />

      {showThresholds && (
        <div className="medieval-panel p-4 grid grid-cols-3 gap-3">
          <NumberInput
            label="Strong ≥"
            value={thresholds.strong}
            onChange={v => setThresholds(t => ({ ...t, strong: v }))}
            suffix="silver/u"
            min={0}
          />
          <NumberInput
            label="Playable ≥"
            value={thresholds.playable}
            onChange={v => setThresholds(t => ({ ...t, playable: v }))}
            suffix="silver/u"
            min={0}
          />
          <NumberInput
            label="Thin ≥"
            value={thresholds.thin}
            onChange={v => setThresholds(t => ({ ...t, thin: v }))}
            suffix="silver/u"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
        {/* === LEFT: input panel === */}
        <div className="space-y-3">
          {/* Resource picker */}
          <div className="medieval-panel p-4">
            <div className="medieval-title-sm mb-2.5">1. Resource</div>
            <div className="grid grid-cols-5 gap-1.5">
              {RESOURCES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setResource(r.id)}
                  className={`py-2 px-1 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    resource === r.id
                      ? 'bg-gold/15 border-gold/50 text-gold-light'
                      : 'border-[color:var(--color-border)] text-zinc-400 hover:border-gold/30 hover:text-gold'
                  }`}
                  title={r.hint}
                >
                  {r.id.charAt(0).toUpperCase() + r.id.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#8a7b62] mt-2">{resourceInfo.hint}</div>
          </div>

          {/* From / To */}
          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">2. Tier & Enchant</div>
            <Select
              label="To (target)"
              value={to}
              onChange={v => setTo(v)}
              options={[...ALL_TARGETS].sort(compareLevels).map(t => ({ value: t, label: `T${t}` }))}
            />
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-gold/70 mb-1.5">
                From (source)
              </label>
              {availableSources.length > 0 ? (
                <div className="space-y-1.5">
                  {[...availableSources].sort((a, b) => compareLevels(a.from, b.from)).map(r => (
                    <button
                      key={r.from}
                      onClick={() => { setFromOverride(r.from); setTransmuteOverride(null); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-[12px] transition-all ${
                        from === r.from
                          ? 'bg-gold/15 border-gold/45 text-gold-light'
                          : 'border-[color:var(--color-border)] text-zinc-300 hover:border-gold/30 hover:bg-[rgba(214,166,74,0.06)]'
                      }`}
                    >
                      <span className="font-bold">T{r.from} → T{r.to}</span>
                      <span className="tabular-nums text-[#bba485] text-[11px]">{formatSilver(r.cost)}/u</span>
                    </button>
                  ))}
                </div>
              ) : (
                <Select
                  value={from}
                  onChange={v => setFromOverride(v)}
                  options={ALL_LEVELS.filter(l => compareLevels(l, to) < 0).map(l => ({ value: l, label: `T${l}` }))}
                />
              )}
            </div>
          </div>

          {/* Prices */}
          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">3. Prices</div>
            <div className="flex items-center gap-2">
              <ItemIcon itemId={resourceItemId(resource, from)} size={32} className="shrink-0" />
              <NumberInput
                label={`Buy price (T${from})`}
                value={buyPrice}
                onChange={setBuyPrice}
                suffix="silver/u"
                min={0}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="icon-frame h-8 w-8 rounded-md text-gold-light shrink-0">{IconFurnace}</div>
              <div className="flex-1">
                <NumberInput
                  label="Transmute cost"
                  value={transmuteCost}
                  onChange={v => setTransmuteOverride(v)}
                  suffix="silver/u"
                  min={0}
                  hint={isTransmuteOverridden ? 'Manual override active.' : 'Auto-filled from recipe.'}
                />
                {isTransmuteOverridden && (
                  <button
                    onClick={handleResetTransmute}
                    className="text-[10px] text-gold/70 hover:text-gold-light mt-1 uppercase tracking-wider font-bold"
                  >
                    Reset to recipe
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ItemIcon itemId={resourceItemId(resource, to)} size={32} className="shrink-0" />
              <NumberInput
                label={`Sell price (T${to})`}
                value={sellPrice}
                onChange={setSellPrice}
                suffix="silver/u"
                min={0}
                className="flex-1"
              />
            </div>
            <NumberInput
              label="Quantity"
              value={quantity}
              onChange={setQuantity}
              min={1}
              hint="Empty = 1 unit."
            />
          </div>

          {/* Sale mode */}
          <div className="medieval-panel p-4 space-y-2.5">
            <div className="medieval-title-sm">4. Sale Mode</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['market', 'discord', 'custom'] as SaleMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setSaleMode(m)}
                  className={`py-1.5 px-2 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    saleMode === m
                      ? 'bg-gold/15 border-gold/50 text-gold-light'
                      : 'border-[color:var(--color-border)] text-zinc-400 hover:border-gold/30'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#a89175] leading-relaxed">
              {saleMode === 'market'  && `Marketplace sell order → net ${(SALE_MULTIPLIERS.market * 100).toFixed(1)}% (6.5% premium tax).`}
              {saleMode === 'discord' && `Discord/private sale → net ${(SALE_MULTIPLIERS.discord * 100).toFixed(1)}% (-5% discount, no tax).`}
              {saleMode === 'custom'  && 'Custom multiplier: 0-1 fraction of gross sell price kept.'}
            </div>
            {saleMode === 'custom' && (
              <NumberInput
                label="Custom multiplier (0-1)"
                value={customMultiplier}
                onChange={v => setCustomMultiplier(Math.max(0, Math.min(1, v)))}
                min={0}
                max={1}
                step={0.005}
              />
            )}
          </div>

          {/* Save button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={buyPrice <= 0 || sellPrice <= 0}
            className="w-full"
          >
            Save opportunity
          </Button>
        </div>

        {/* === RIGHT: live results === */}
        <div className="space-y-4 min-w-0">
          {/* Decision banner */}
          <div className={`rounded-lg border-2 p-4 ${decisionPillClass(decision)}`}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-black opacity-70">Decision</div>
                <div className="medieval-title text-3xl mt-0.5 leading-none">{decMeta.label}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">Profit / unit</div>
                <div className="text-2xl font-black tabular-nums leading-none mt-0.5">
                  {result.profitPerUnit >= 0 ? '+' : ''}{formatSilver(result.profitPerUnit)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">Total · {quantity} units</div>
                <div className="text-2xl font-black tabular-nums leading-none mt-0.5">
                  {result.totalProfit >= 0 ? '+' : ''}{formatSilver(result.totalProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Cost / unit"     value={formatSilver(result.costPerUnit)}    hint="Buy + transmute" />
            <StatCard label="Net sell / unit" value={formatSilver(result.netSellPerUnit)} hint={`Gross × ${(multiplier * 100).toFixed(1)}%`} />
            <StatCard label="Total revenue"   value={formatSilver(result.totalRevenue)}   hint={`Net for ${quantity} units`} tone="gold" />
            <StatCard label="Total cost"      value={formatSilver(result.totalCost)}      hint="Capital tied up" />
            <StatCard label="ROI"             value={formatPercent(result.roiPercent)}    hint="Profit ÷ cost" tone={result.roiPercent >= 0 ? 'profit' : 'loss'} />
            <StatCard label="Break-even sell" value={formatSilver(result.breakEvenSellPrice)} hint="Min sell to net zero" />
            <StatCard
              label="Profit / unit"
              value={
                <span className={result.profitPerUnit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
                  {result.profitPerUnit >= 0 ? '+' : ''}{formatSilver(result.profitPerUnit)}
                </span>
              }
              hint="After tax / discount"
              tone={result.profitPerUnit >= 0 ? 'profit' : 'loss'}
            />
            <StatCard
              label="Total profit"
              value={
                <span className={result.totalProfit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
                  {result.totalProfit >= 0 ? '+' : ''}{formatSilver(result.totalProfit)}
                </span>
              }
              hint={`Across ${quantity} units`}
              tone={result.profitPerUnit >= 0 ? 'profit' : 'loss'}
            />
          </div>

          {/* What-if slider */}
          <div className="medieval-panel p-4">
            <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
              <div>
                <div className="medieval-title-sm">What-if · Sell price</div>
                <div className="text-[11px] text-[#a89175] mt-0.5">
                  Drag to see how a price change affects profit. Range: ±50% of entered sell.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gold/70 font-bold">Effective</div>
                <div className="text-xl font-black tabular-nums text-zinc-100 leading-none">
                  {formatSilver(effectiveSell)} /u
                </div>
                {sellSliderDelta !== 0 && (
                  <div className="text-[10px] font-bold mt-0.5">
                    <span className={sellSliderDelta > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {sellSliderDelta > 0 ? '+' : ''}{formatSilver(sellSliderDelta)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-Math.round(sellPrice * 0.5)}
              max={Math.round(sellPrice * 0.5)}
              step={Math.max(1, Math.round(sellPrice * 0.01))}
              value={sellSliderDelta}
              onChange={e => setSellSliderDelta(Number(e.target.value))}
              disabled={sellPrice <= 0}
              className="w-full"
            />
            {sellSliderDelta !== 0 && (
              <button
                onClick={() => setSellSliderDelta(0)}
                className="text-[10px] text-gold/70 hover:text-gold-light mt-2 uppercase tracking-wider font-bold"
              >
                Reset slider
              </button>
            )}
          </div>

          {/* Copy action */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopyResult}>
              {justCopied ? 'Copied ✓' : 'Copy result'}
            </Button>
          </div>

          {(buyPrice <= 0 || sellPrice <= 0) && (
            <WarningBox tone="info">
              Enter buy and sell prices to start. The transmute cost auto-fills from the recipe table — you can override.
            </WarningBox>
          )}
        </div>
      </div>

      {/* === Saved opportunities table === */}
      <section className="space-y-3">
        <div className="section-heading">
          <h2>Saved opportunities</h2>
          <div className="flex items-center gap-2">
            <span className="hint">{saved.length} entries</span>
            <Button variant="ghost" size="sm" onClick={handleCsvExport} disabled={saved.length === 0}>
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={saved.length === 0}>
              Clear all
            </Button>
          </div>
        </div>
        <SavedTable rows={saved} thresholds={thresholds} onDelete={handleDelete} />
      </section>

      {/* === Reference: recipe table === */}
      <section className="space-y-3">
        <SectionDivider label="Recipe Reference" hint="Auto-fills cost when From + To is picked above" />
        <div className="medieval-panel p-4 overflow-x-auto">
          <RecipeReference />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function SavedTable({
  rows,
  thresholds,
  onDelete,
}: {
  rows: SavedOpportunity[];
  thresholds: DecisionThresholds;
  onDelete: (id: string) => void;
}) {
  const columns: Column<SavedOpportunity>[] = [
    {
      key: 'resource',
      header: 'Resource',
      cell: r => (
        <div className="flex items-center gap-2">
          <ItemIcon itemId={resourceItemId(r.resource, r.to)} size={28} />
          <div>
            <div className="text-[12px] text-zinc-100 font-semibold capitalize leading-tight">{r.resource}</div>
            <div className="text-[10px] text-gold/60 font-bold tracking-wider uppercase">T{r.from} → T{r.to}</div>
          </div>
        </div>
      ),
    },
    { key: 'buy',  header: 'Buy/u',       numeric: true, cell: r => formatSilver(r.buy) },
    { key: 'tx',   header: 'Transmute/u', numeric: true, cell: r => formatSilver(r.transmute) },
    { key: 'sell', header: 'Sell/u',      numeric: true, cell: r => formatSilver(r.sell) },
    { key: 'qty',  header: 'Qty',         numeric: true, cell: r => r.quantity.toLocaleString() },
    {
      key: 'ppu',
      header: 'Profit/u',
      numeric: true,
      cell: r => {
        const res = calculateTransmute({
          inputBuyPrice: r.buy,
          transmuteCost: r.transmute,
          outputSellPrice: r.sell,
          quantity: r.quantity,
          saleMultiplier: r.saleMultiplier,
        });
        return <ProfitBadge amount={res.profitPerUnit} />;
      },
    },
    {
      key: 'total',
      header: 'Total',
      numeric: true,
      cell: r => {
        const res = calculateTransmute({
          inputBuyPrice: r.buy,
          transmuteCost: r.transmute,
          outputSellPrice: r.sell,
          quantity: r.quantity,
          saleMultiplier: r.saleMultiplier,
        });
        return <ProfitBadge amount={res.totalProfit} percent={res.roiPercent} />;
      },
    },
    {
      key: 'decision',
      header: 'Decision',
      cell: r => {
        const res = calculateTransmute({
          inputBuyPrice: r.buy,
          transmuteCost: r.transmute,
          outputSellPrice: r.sell,
          quantity: r.quantity,
          saleMultiplier: r.saleMultiplier,
        });
        const d = decisionFor(res.profitPerUnit, thresholds);
        const m = decisionMeta(d);
        return <span className={`chip ${decisionPillClass(d)}`}>{m.label}</span>;
      },
    },
    {
      key: 'del',
      header: '',
      cell: r => (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
          className="text-zinc-600 hover:text-rose-400 text-[14px] px-1.5"
          title="Delete row"
          aria-label="Delete row"
        >
          ×
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={r => r.id}
      empty={
        <EmptyState
          title="No saved opportunities yet"
          description="Set inputs above and click 'Save opportunity' to compare flips side-by-side. Saved entries persist in your browser."
        />
      }
    />
  );
}

function RecipeReference() {
  // Group recipes by target so each row shows "to | from-A cost | from-B cost".
  const byTarget = new Map<string, Recipe[]>();
  for (const r of RECIPES) {
    const arr = byTarget.get(r.to) ?? [];
    arr.push(r);
    byTarget.set(r.to, arr);
  }
  const sortedTargets = [...byTarget.keys()].sort(compareLevels);

  return (
    <table className="ledger w-full">
      <thead>
        <tr>
          <th>Target</th>
          <th>From A</th>
          <th className="num">Cost/u</th>
          <th>From B</th>
          <th className="num">Cost/u</th>
        </tr>
      </thead>
      <tbody>
        {sortedTargets.map(target => {
          const list = (byTarget.get(target) ?? []).sort((a, b) => compareLevels(a.from, b.from));
          const a = list[0];
          const b = list[1];
          return (
            <tr key={target}>
              <td className="text-gold-light font-bold">T{target}</td>
              <td>T{a.from}</td>
              <td className="num tabular-nums">{formatSilver(a.cost)}</td>
              <td>{b ? `T${b.from}` : <span className="text-zinc-600">—</span>}</td>
              <td className="num tabular-nums">{b ? formatSilver(b.cost) : <span className="text-zinc-600">—</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
