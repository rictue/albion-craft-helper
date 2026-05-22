/**
 * Trade Journal
 *
 * A personal log of buy/sell trades the user made in-game. Lets you
 * answer "what did I buy this at?" and "how much profit did I lock in
 * on that flip?" without spreadsheet bookkeeping.
 *
 * Storage: localStorage only. No server, no Supabase — your trade
 * history is yours alone. Export to JSON to back up.
 *
 * Math model:
 *  - Each trade is independent (no nested orders / partial fills).
 *  - Per-item position uses moving-average cost basis.
 *    On a BUY: avg_cost = (prev_qty * avg_cost + bought_qty * price) / new_qty
 *    On a SELL: realized = (sell_price - current_avg_cost) * sold_qty
 *               (avg_cost unchanged; qty drops)
 *  - If you sell more than you hold (e.g. you forgot to log a buy),
 *    realized P&L uses whatever avg_cost is in effect at that moment.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader, EmptyState, WarningBox, StatCard } from '../ui';
import { IconLedger } from '../shell/navIcons';
import { ALL_ITEMS } from '../../data/items';
import { CITIES } from '../../data/cities';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver } from '../../utils/formatters';
import type { Tier, Enchantment, ItemDefinition } from '../../types';
import ItemIcon from '../common/ItemIcon';

type TradeType = 'buy' | 'sell';

interface Trade {
  id: string;
  type: TradeType;
  baseId: string;
  name: string;
  tier: Tier;
  enchant: Enchantment;
  qty: number;
  pricePerUnit: number;
  city: string;
  ts: number;
  notes?: string;
}

interface PositionRollup {
  key: string; // baseId|tier|enchant
  baseId: string;
  name: string;
  tier: Tier;
  enchant: Enchantment;
  /** Net silver count of items currently held (buys − sells). Can go
   *  negative if the user logs sells without the matching buys. */
  netQty: number;
  /** Moving-average cost basis per unit at the current moment. Only
   *  updated by buys; sells consume against it without affecting it. */
  avgBuyCost: number;
  /** Total silver spent on buys so far. */
  totalBuySpent: number;
  /** Total quantity bought (gross, not net). */
  totalBuyQty: number;
  /** Total silver received on sells so far. */
  totalSellRevenue: number;
  /** Total quantity sold (gross). */
  totalSellQty: number;
  /** Sum of realized P&L locked in on every sell. */
  realizedPL: number;
}

const LS_KEY = 'albion-trades-v1';

function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Trade[];
    }
  } catch {
    // Corrupt JSON — start over.
  }
  return [];
}

function saveTrades(trades: Trade[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(trades));
  } catch {
    // localStorage full / unavailable — keep in-memory only.
  }
}

/** Compute per-(item × tier × enchant) rollups from the full trade log.
 *  Walks trades chronologically so moving-average cost is correct. */
function computeRollups(trades: Trade[]): PositionRollup[] {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  const map = new Map<string, PositionRollup>();

  for (const t of sorted) {
    const key = `${t.baseId}|${t.tier}|${t.enchant}`;
    const prev = map.get(key) ?? {
      key,
      baseId: t.baseId,
      name: t.name,
      tier: t.tier,
      enchant: t.enchant,
      netQty: 0,
      avgBuyCost: 0,
      totalBuySpent: 0,
      totalBuyQty: 0,
      totalSellRevenue: 0,
      totalSellQty: 0,
      realizedPL: 0,
    };

    if (t.type === 'buy') {
      const newQty = prev.netQty + t.qty;
      // Moving-average — only rebalance if we still have positive holdings;
      // if we were negative (overshort), folding the new buy in at its own
      // price is the most sensible behavior.
      if (newQty > 0) {
        const prevValue = Math.max(0, prev.netQty) * prev.avgBuyCost;
        prev.avgBuyCost = (prevValue + t.qty * t.pricePerUnit) / Math.max(1, Math.max(0, prev.netQty) + t.qty);
      }
      prev.netQty = newQty;
      prev.totalBuySpent += t.qty * t.pricePerUnit;
      prev.totalBuyQty += t.qty;
    } else {
      const realized = (t.pricePerUnit - prev.avgBuyCost) * t.qty;
      prev.realizedPL += realized;
      prev.netQty -= t.qty;
      prev.totalSellRevenue += t.qty * t.pricePerUnit;
      prev.totalSellQty += t.qty;
    }

    map.set(key, prev);
  }

  return [...map.values()];
}

const TIERS: Tier[] = [4, 5, 6, 7, 8];
const ENCHANTS: Enchantment[] = [0, 1, 2, 3, 4];

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());

  // Add-trade form state
  const [formType, setFormType] = useState<TradeType>('buy');
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemDefinition | null>(null);
  const [formTier, setFormTier] = useState<Tier>(4);
  const [formEnchant, setFormEnchant] = useState<Enchantment>(0);
  const [formQty, setFormQty] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCity, setFormCity] = useState<string>(CITIES[0]?.id ?? 'Martlock');
  const [formNotes, setFormNotes] = useState<string>('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filters for the log + rollup tables
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'all' | TradeType>('all');
  const [view, setView] = useState<'log' | 'positions'>('log');

  // Persist changes
  useEffect(() => { saveTrades(trades); }, [trades]);

  // Close item search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return ALL_ITEMS.filter(i => i.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  const canSubmit = !!selectedItem && Number(formQty) > 0 && Number(formPrice) > 0;

  const submitTrade = () => {
    if (!selectedItem || !canSubmit) return;
    const trade: Trade = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: formType,
      baseId: selectedItem.baseId,
      name: selectedItem.name,
      tier: formTier,
      enchant: formEnchant,
      qty: Math.max(1, Math.floor(Number(formQty))),
      pricePerUnit: Math.max(0, Math.floor(Number(formPrice))),
      city: formCity,
      ts: Date.now(),
      notes: formNotes.trim() || undefined,
    };
    setTrades(prev => [trade, ...prev]);
    // Reset just the variable parts — keep item / tier / enchant / city
    // selected so logging a streak of similar trades stays fast.
    setFormQty('');
    setFormPrice('');
    setFormNotes('');
  };

  const deleteTrade = (id: string) => {
    if (!window.confirm('Bu trade kaydı silinsin mi? P&L geçmişine yansır.')) return;
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `albion-trades-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        window.alert('Geçersiz dosya — beklenen format: trade array.');
        return;
      }
      const valid = parsed.filter((t: unknown): t is Trade =>
        !!t && typeof t === 'object'
        && 'id' in t && 'type' in t && 'baseId' in t && 'qty' in t && 'pricePerUnit' in t && 'ts' in t,
      );
      if (valid.length === 0) {
        window.alert('Dosyada geçerli trade kaydı bulunamadı.');
        return;
      }
      if (!window.confirm(`${valid.length} trade kaydı import edilecek. Mevcut kayıtlarla birleştirilsin mi?`)) return;
      // Merge by id — incoming wins for duplicates
      const byId = new Map<string, Trade>();
      for (const t of trades) byId.set(t.id, t);
      for (const t of valid) byId.set(t.id, t);
      setTrades([...byId.values()]);
    } catch (err) {
      window.alert(`Import hatası: ${err instanceof Error ? err.message : 'bilinmeyen'}`);
    }
  };

  const clearAll = () => {
    if (!window.confirm('TÜM trade geçmişini sıfırla? Bu geri alınamaz.')) return;
    setTrades([]);
  };

  const rollups = useMemo(() => computeRollups(trades), [trades]);

  // Filter for log view
  const filteredTrades = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return trades
      .filter(t => filterType === 'all' || t.type === filterType)
      .filter(t => !q
        || t.name.toLowerCase().includes(q)
        || t.city.toLowerCase().includes(q)
        || (t.notes ?? '').toLowerCase().includes(q));
  }, [trades, filterText, filterType]);

  // Aggregate dashboard stats
  const dashStats = useMemo(() => {
    const totalBuySpent = rollups.reduce((sum, r) => sum + r.totalBuySpent, 0);
    const totalSellRevenue = rollups.reduce((sum, r) => sum + r.totalSellRevenue, 0);
    const totalRealizedPL = rollups.reduce((sum, r) => sum + r.realizedPL, 0);
    const openPositions = rollups.filter(r => r.netQty > 0).length;
    const tiedUpSilver = rollups
      .filter(r => r.netQty > 0)
      .reduce((sum, r) => sum + r.netQty * r.avgBuyCost, 0);
    return { totalBuySpent, totalSellRevenue, totalRealizedPL, openPositions, tiedUpSilver };
  }, [rollups]);

  const itemId = selectedItem ? resolveItemId(selectedItem.baseId, formTier, formEnchant) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Personal · Local-only"
        title="Trade Journal"
        description="Aldığın ve sattığın her item'ı buraya yaz — ne kadar harcadığını ve kaç kâr ettiğini sana özetler. Veri sadece bu cihazda saklanır (localStorage). Export ile yedek alabilirsin."
        icon={IconLedger}
      />

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Toplam alım" value={formatSilver(dashStats.totalBuySpent)} hint={`${rollups.reduce((s, r) => s + r.totalBuyQty, 0)} item alındı`} />
        <StatCard label="Toplam satım" value={formatSilver(dashStats.totalSellRevenue)} hint={`${rollups.reduce((s, r) => s + r.totalSellQty, 0)} item satıldı`} />
        <StatCard
          label="Realized P&L"
          value={
            <span className={dashStats.totalRealizedPL >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
              {dashStats.totalRealizedPL >= 0 ? '+' : ''}{formatSilver(dashStats.totalRealizedPL)}
            </span>
          }
          tone={dashStats.totalRealizedPL >= 0 ? 'profit' : 'loss'}
          hint="Sadece satışı tamamlanan kâr"
        />
        <StatCard label="Açık pozisyon" value={dashStats.openPositions} hint="Hâlâ elinde olan item çeşidi" />
        <StatCard label="Bağlanan silver" value={formatSilver(dashStats.tiedUpSilver)} hint="Açık pozisyon × ortalama alım" />
      </div>

      {/* Add trade form */}
      <section className="medieval-panel p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="medieval-title-sm">Yeni kayıt ekle</h3>
          <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-950 p-0.5">
            {(['buy', 'sell'] as TradeType[]).map(t => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={`px-4 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                  formType === t
                    ? t === 'buy' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {t === 'buy' ? 'Alış' : 'Satış'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Item search */}
          <div className="relative md:col-span-2" ref={wrapperRef}>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Item</label>
            <input
              type="search"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Item ara — Cultist Robe, Bloodletter, T6.2 Logs..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40"
            />
            {open && matches.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg max-h-64 overflow-y-auto shadow-xl">
                {matches.map(item => (
                  <button
                    key={item.baseId}
                    onClick={() => {
                      setSelectedItem(item);
                      setQuery(item.name);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 text-left transition-colors"
                  >
                    <ItemIcon itemId={`T4_${item.baseId}`} size={32} quality={1} className="rounded shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">{item.subcategory}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && itemId && (
              <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800">
                <ItemIcon itemId={itemId} size={28} quality={1} className="rounded shrink-0" />
                <span className="text-xs text-zinc-300 font-medium">{selectedItem.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono ml-auto">{itemId}</span>
              </div>
            )}
          </div>

          {/* Tier + Enchant */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Tier</label>
            <div className="flex gap-1">
              {TIERS.map(t => (
                <button
                  key={t}
                  onClick={() => setFormTier(t)}
                  className={`flex-1 px-2 py-1.5 rounded border text-xs font-bold ${
                    formTier === t ? 'bg-gold/25 border-gold/60 text-gold-light' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Enchant</label>
            <div className="flex gap-1">
              {ENCHANTS.map(e => (
                <button
                  key={e}
                  onClick={() => setFormEnchant(e)}
                  className={`flex-1 px-2 py-1.5 rounded border text-xs font-bold ${
                    formEnchant === e ? 'bg-gold/25 border-gold/60 text-gold-light' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  .{e}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Price + City */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Adet</label>
            <input
              type="number"
              min={1}
              value={formQty}
              onChange={e => setFormQty(e.target.value)}
              placeholder="100"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Birim fiyat</label>
            <input
              type="number"
              min={0}
              value={formPrice}
              onChange={e => setFormPrice(e.target.value)}
              placeholder="2800"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Şehir</label>
            <select
              value={formCity}
              onChange={e => setFormCity(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Not (opsiyonel)</label>
            <input
              type="text"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Buy order @ Bridgewatch market..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-500 tabular-nums">
            {canSubmit && (
              <>
                Toplam: <span className="text-gold font-bold">{formatSilver(Number(formQty) * Number(formPrice))}</span>
              </>
            )}
          </div>
          <button
            onClick={submitTrade}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
              !canSubmit
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : formType === 'buy'
                  ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40'
            }`}
          >
            {formType === 'buy' ? '+ Alış kaydı' : '+ Satış kaydı'}
          </button>
        </div>
      </section>

      {/* View tabs + filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-950 p-0.5">
          {(['log', 'positions'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                view === v ? 'bg-gold/25 text-gold-light' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {v === 'log' ? 'İşlem geçmişi' : 'Pozisyon özeti'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Filtrele (item / şehir / not)..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 w-56"
          />
          {view === 'log' && (
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | TradeType)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
            >
              <option value="all">Hepsi</option>
              <option value="buy">Sadece alış</option>
              <option value="sell">Sadece satış</option>
            </select>
          )}
          <button
            onClick={exportJson}
            disabled={trades.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-50"
            title="Tüm trade'leri JSON olarak indir"
          >
            Export
          </button>
          <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer">
            Import
            <input
              type="file"
              accept="application/json"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* LOG VIEW */}
      {view === 'log' && (
        <section className="medieval-panel overflow-hidden">
          {filteredTrades.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title={trades.length === 0 ? 'Henüz kayıt yok' : 'Filtreyle eşleşen kayıt yok'}
                description={trades.length === 0
                  ? 'Yukarıdan ilk alış veya satışını ekle. Birden fazla aynı item için ekledikçe ortalama maliyet ve realized P&L sağ sütunda otomatik çıkar.'
                  : 'Filtreyi temizle ya da kapsamı genişlet.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="text-left  px-3 py-2 font-bold">Tarih</th>
                    <th className="text-left  px-3 py-2 font-bold">Tip</th>
                    <th className="text-left  px-3 py-2 font-bold">Item</th>
                    <th className="text-left  px-3 py-2 font-bold">T·E</th>
                    <th className="text-left  px-3 py-2 font-bold">Şehir</th>
                    <th className="text-right px-3 py-2 font-bold">Adet</th>
                    <th className="text-right px-3 py-2 font-bold">Birim</th>
                    <th className="text-right px-3 py-2 font-bold">Toplam</th>
                    <th className="text-left  px-3 py-2 font-bold">Not</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map(t => {
                    const itemId = resolveItemId(t.baseId, t.tier, t.enchant);
                    const total = t.qty * t.pricePerUnit;
                    return (
                      <tr key={t.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                        <td className="px-3 py-2 text-[11px] text-zinc-400 tabular-nums whitespace-nowrap">
                          {new Date(t.ts).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            t.type === 'buy' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {t.type === 'buy' ? 'Alış' : 'Satış'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemIcon itemId={itemId} size={28} quality={1} className="rounded shrink-0" />
                            <span className="text-zinc-200 truncate">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                          T{t.tier}{t.enchant > 0 ? `.${t.enchant}` : ''}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400 whitespace-nowrap">{t.city}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{t.qty.toLocaleString('de-DE')}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{formatSilver(t.pricePerUnit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-gold">{formatSilver(total)}</td>
                        <td className="px-3 py-2 text-[11px] text-zinc-500 max-w-[200px] truncate" title={t.notes}>{t.notes ?? '—'}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => deleteTrade(t.id)}
                            className="text-zinc-600 hover:text-rose-400 text-xs px-1"
                            title="Bu kaydı sil"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* POSITIONS VIEW */}
      {view === 'positions' && (
        <section className="medieval-panel overflow-hidden">
          {rollups.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Henüz pozisyon yok"
                description="Bir alış veya satış kaydı eklediğinde burada item bazında özet çıkar — ortalama alım, realized P&L, hâlâ kaç adet elinde."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="text-left  px-3 py-2 font-bold">Item</th>
                    <th className="text-left  px-3 py-2 font-bold">T·E</th>
                    <th className="text-right px-3 py-2 font-bold">Net adet</th>
                    <th className="text-right px-3 py-2 font-bold">Ort. alım</th>
                    <th className="text-right px-3 py-2 font-bold">Ort. satış</th>
                    <th className="text-right px-3 py-2 font-bold">Toplam alım</th>
                    <th className="text-right px-3 py-2 font-bold">Toplam satış</th>
                    <th className="text-right px-3 py-2 font-bold">Realized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {rollups
                    .filter(r => !filterText.trim() || r.name.toLowerCase().includes(filterText.trim().toLowerCase()))
                    .sort((a, b) => b.realizedPL - a.realizedPL)
                    .map(r => {
                      const itemId = resolveItemId(r.baseId, r.tier, r.enchant);
                      const avgSell = r.totalSellQty > 0 ? r.totalSellRevenue / r.totalSellQty : 0;
                      const plPositive = r.realizedPL > 0;
                      const plNeg = r.realizedPL < 0;
                      return (
                        <tr key={r.key} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ItemIcon itemId={itemId} size={28} quality={1} className="rounded shrink-0" />
                              <span className="text-zinc-200 truncate">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                            T{r.tier}{r.enchant > 0 ? `.${r.enchant}` : ''}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                            r.netQty > 0 ? 'text-emerald-300' : r.netQty < 0 ? 'text-rose-400' : 'text-zinc-500'
                          }`}>
                            {r.netQty.toLocaleString('de-DE')}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                            {r.avgBuyCost > 0 ? formatSilver(Math.round(r.avgBuyCost)) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                            {avgSell > 0 ? formatSilver(Math.round(avgSell)) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{formatSilver(r.totalBuySpent)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{formatSilver(r.totalSellRevenue)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                            plPositive ? 'text-emerald-300' : plNeg ? 'text-rose-400' : 'text-zinc-500'
                          }`}>
                            {plPositive ? '+' : ''}{formatSilver(Math.round(r.realizedPL))}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Privacy + clear footer */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-600">
        <span>Veri sadece bu cihazın localStorage'unda saklanıyor — sunucuya hiçbir şey gitmez.</span>
        {trades.length > 0 && (
          <button onClick={clearAll} className="px-2 py-1 rounded text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
            Hepsini sil
          </button>
        )}
      </div>

      <WarningBox tone="info" title="Hesaplama mantığı">
        Ortalama maliyet (moving average) kullanıyor: her alış ortalamayı günceller, her satış ortalamadan düşer (ortalamayı değiştirmez). Realized P&L
        = satış fiyatı × satılan adet − ortalama maliyet × satılan adet. Bu yüzden bir item'ı 10k'ya alıp 12k'ya sattığında P&L'in +2k × adet olur,
        sonra aynı item'ı 8k'ya alırsan ortalama düşer.
      </WarningBox>
    </div>
  );
}
