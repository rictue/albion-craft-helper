import { useState, useEffect, useCallback } from 'react';
import { getRecentEvents } from '../../services/gameinfo';
import type { KillEvent } from '../../services/gameinfo';
import ItemIcon from '../common/ItemIcon';

// Strip enchant suffix @1/@2/@3 from item IDs
function baseId(id: string): string {
  return id.replace(/@\d+$/, '');
}

// Parse tier from item ID (T4_MAIN_SWORD → 4)
function parseTier(id: string): number {
  const m = id.match(/^T(\d+)_/);
  return m ? parseInt(m[1]) : 0;
}

// Parse enchant from item ID (T4_MAIN_SWORD@2 → 2)
function parseEnchant(id: string): number {
  const m = id.match(/@(\d+)$/);
  return m ? parseInt(m[1]) : 0;
}

// Make item ID human-readable
function formatItemId(id: string): string {
  // Remove tier prefix (T4_, T8_)
  const withoutTier = id.replace(/^T\d+_/, '');
  // Replace _ with space, lowercase then title case
  return withoutTier
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const SLOT_LABELS: Record<string, string> = {
  MainHand: 'Weapon',
  OffHand: 'Off-Hand',
  Head: 'Head',
  Armor: 'Armor',
  Shoes: 'Shoes',
  Cape: 'Cape',
  Mount: 'Mount',
  Bag: 'Bag',
  Potion: 'Potion',
  Food: 'Food',
};
const ALL_SLOTS = Object.keys(SLOT_LABELS);

interface ItemStat {
  itemId: string;
  slot: string;
  count: number;
  enchants: Record<number, number>;
}

const MIN_PARTICIPANT_OPTIONS = [
  { label: 'All', value: 1 },
  { label: '5+', value: 5 },
  { label: '10+', value: 10 },
  { label: '20+', value: 20 },
  { label: '50+ (ZvZ)', value: 50 },
];

export default function MetaItems() {
  const [stats, setStats] = useState<ItemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsAnalyzed, setEventsAnalyzed] = useState(0);
  const [groupEventsFound, setGroupEventsFound] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [minParticipants, setMinParticipants] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string>('MainHand');
  const [minTier, setMinTier] = useState(4);

  const load = useCallback(() => {
    setLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  // Fetch on mount and whenever filters or refreshKey change. setState only
  // happens inside the async callback (after await), never synchronously in
  // the effect body — keeps react-hooks/set-state-in-effect happy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch 5 pages × 51 = up to 255 recent kill events in parallel
      const pages = await Promise.all([
        getRecentEvents(51, 0),
        getRecentEvents(51, 51),
        getRecentEvents(51, 102),
        getRecentEvents(51, 153),
        getRecentEvents(51, 204),
      ]);

      if (cancelled) return;

      const allEvents: KillEvent[] = [];
      for (const page of pages) {
        if (page) allEvents.push(...page);
      }

      // numberOfParticipants is 0 for many solo kills — treat 0 as 1.
      // Only exclude events we KNOW are too small.
      const groupEvents = allEvents.filter(e => {
        const n = e.numberOfParticipants || e.GroupMemberCount || 1;
        return n >= minParticipants;
      });

      // Aggregate item usage from both killer AND victim equipment
      const itemMap = new Map<string, ItemStat>();

      for (const event of groupEvents) {
        for (const player of [event.Killer, event.Victim]) {
          if (!player?.Equipment) continue;
          for (const slot of ALL_SLOTS) {
            const raw = player.Equipment[slot] as { Type: string } | null | undefined;
            if (!raw?.Type) continue;

            const tier = parseTier(raw.Type);
            if (tier < minTier) continue;

            const base = baseId(raw.Type);
            const enchant = parseEnchant(raw.Type);
            const key = `${slot}|${base}`;

            const existing = itemMap.get(key);
            if (existing) {
              existing.count++;
              existing.enchants[enchant] = (existing.enchants[enchant] ?? 0) + 1;
            } else {
              itemMap.set(key, { itemId: base, slot, count: 1, enchants: { [enchant]: 1 } });
            }
          }
        }
      }

      if (cancelled) return;
      const sorted = [...itemMap.values()].sort((a, b) => b.count - a.count);

      setStats(sorted);
      setEventsAnalyzed(allEvents.length);
      setGroupEventsFound(groupEvents.length);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [refreshKey, minParticipants, minTier]);

  const filtered = (selectedSlot === 'All'
    ? stats
    : stats.filter(s => s.slot === selectedSlot)
  ).slice(0, 50);

  const topCount = filtered[0]?.count || 1;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">

      {/* Header card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Meta Items</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Most-used gear in recent PvP kills — aggregated from killer &amp; victim equipment
            </p>
            {!loading && (
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                <span>{eventsAnalyzed} events fetched</span>
                <span className="text-zinc-700">·</span>
                <span className={groupEventsFound > 0 ? 'text-emerald-500' : 'text-red-400'}>
                  {groupEventsFound} kills matched
                  {minParticipants > 1 ? ` (${minParticipants}+ players)` : ''}
                </span>
                {groupEventsFound === 0 && (
                  <span className="text-amber-500">— lower the fight size filter</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="shrink-0 px-4 py-2 bg-gold/10 border border-gold/20 rounded-lg text-gold text-xs font-semibold hover:bg-gold/20 transition disabled:opacity-40"
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-wrap gap-6 items-start">
        {/* Min participants */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Fight Size</div>
          <div className="flex gap-1.5 flex-wrap">
            {MIN_PARTICIPANT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMinParticipants(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  minParticipants === opt.value
                    ? 'bg-gold text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slot filter */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Slot</div>
          <div className="flex gap-1.5 flex-wrap">
            {['All', ...ALL_SLOTS].map(slot => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  selectedSlot === slot
                    ? 'bg-gold text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {slot === 'All' ? 'All Slots' : SLOT_LABELS[slot]}
              </button>
            ))}
          </div>
        </div>

        {/* Min tier */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Min Tier</div>
          <div className="flex gap-1.5">
            {[1, 4, 6, 7, 8].map(t => (
              <button
                key={t}
                onClick={() => setMinTier(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  minTier === t
                    ? 'bg-gold text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                T{t}+
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-16 text-center">
          <div className="text-zinc-500 text-sm animate-pulse">Fetching kill events…</div>
          <div className="text-zinc-700 text-xs mt-2">Scanning 5 pages × 51 events</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-16 text-center">
          <div className="text-zinc-400 text-sm">No items found</div>
          <div className="text-zinc-600 text-xs mt-1.5">
            Try lowering "Fight Size" or "Min Tier" filters
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
            Top {filtered.length} items — sorted by usage count
          </div>
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((item, i) => {
              const sortedEnchants = Object.entries(item.enchants)
                .sort((a, b) => b[1] - a[1]);
              const topEnchant = sortedEnchants[0];
              const barWidth = Math.round((item.count / topCount) * 100);

              return (
                <div
                  key={`${item.slot}|${item.itemId}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/30 transition"
                >
                  {/* Rank */}
                  <div className="w-7 text-center text-xs font-bold text-zinc-600 shrink-0">
                    {i + 1}
                  </div>

                  {/* Icon */}
                  <div className="shrink-0">
                    <ItemIcon itemId={item.itemId} size={40} />
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-200 truncate">
                      {formatItemId(item.itemId)}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5 truncate font-mono">
                      {item.itemId}
                    </div>
                    <div className="mt-1.5 h-1 bg-zinc-800 rounded-full w-full max-w-xs">
                      <div
                        className="h-full bg-gradient-to-r from-gold/50 to-gold rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Slot (only when showing All) */}
                  {selectedSlot === 'All' && (
                    <div className="shrink-0 text-[10px] text-zinc-500 w-16 text-center">
                      {SLOT_LABELS[item.slot] || item.slot}
                    </div>
                  )}

                  {/* Enchants distribution */}
                  <div className="shrink-0 text-right min-w-[80px]">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {sortedEnchants.slice(0, 4).map(([enchant, cnt]) => (
                        <span
                          key={enchant}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            enchant === '0' ? 'bg-zinc-800 text-zinc-500'
                            : enchant === '1' ? 'bg-green-900/40 text-green-400'
                            : enchant === '2' ? 'bg-blue-900/40 text-blue-400'
                            : enchant === '3' ? 'bg-purple-900/40 text-purple-400'
                            : 'bg-amber-900/40 text-amber-400'
                          }`}
                        >
                          +{enchant} ×{cnt}
                        </span>
                      ))}
                    </div>
                    {topEnchant && (
                      <div className="text-[9px] text-zinc-600 mt-0.5">
                        most common: +{topEnchant[0]}
                      </div>
                    )}
                  </div>

                  {/* Usage count */}
                  <div className="shrink-0 text-right w-16">
                    <div className="text-base font-bold text-zinc-100 tabular-nums">{item.count}</div>
                    <div className="text-[9px] text-zinc-600">uses</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
