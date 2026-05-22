import { useState, useEffect, useCallback } from 'react';
import { getRecentEvents } from '../../services/gameinfo';
import type { KillEvent } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';

const EQUIPMENT_SLOTS: Array<{ key: keyof KillEvent['Killer']['Equipment']; label: string }> = [
  { key: 'MainHand', label: 'Main Hand' },
  { key: 'OffHand',  label: 'Off Hand' },
  { key: 'Head',     label: 'Head' },
  { key: 'Armor',    label: 'Armor' },
  { key: 'Shoes',    label: 'Shoes' },
  { key: 'Bag',      label: 'Bag' },
  { key: 'Cape',     label: 'Cape' },
  { key: 'Mount',    label: 'Mount' },
  { key: 'Potion',   label: 'Potion' },
  { key: 'Food',     label: 'Food' },
];

const QUALITY_COLORS: Record<number, string> = {
  1: 'border-zinc-600',
  2: 'border-green-500',
  3: 'border-blue-500',
  4: 'border-purple-500',
  5: 'border-amber-500',
};
const QUALITY_LABELS: Record<number, string> = {
  1: 'Normal', 2: 'Good', 3: 'Outstanding', 4: 'Excellent', 5: 'Masterpiece',
};

function EquipmentGrid({ equipment }: { equipment: KillEvent['Killer']['Equipment'] }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {EQUIPMENT_SLOTS.map(slot => {
        const item = equipment[slot.key as string] as { Type: string; Count: number; Quality: number } | null;
        return (
          <div key={slot.key as string} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-lg bg-zinc-950 border-2 flex items-center justify-center ${item ? QUALITY_COLORS[item.Quality] || 'border-zinc-700' : 'border-zinc-800'}`}>
              {item ? <ItemIcon itemId={item.Type} size={44} quality={item.Quality} /> : <span className="text-zinc-700 text-xs">—</span>}
            </div>
            <div className="text-[9px] text-zinc-600 mt-1 text-center">{slot.label}</div>
            {item && item.Quality > 1 && (
              <div className="text-[9px] text-zinc-500">{QUALITY_LABELS[item.Quality]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Killboard() {
  usePageMeta({
    title: 'Killboard',
    description: 'Recent Albion Online PvP kill feed across the server — last 50 events with full killer + victim equipment breakdowns, IP, and kill fame. Pulled directly from the official gameinfo API.',
  });

  const [events, setEvents] = useState<KillEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  // Fetch on mount and whenever load() bumps refreshKey (manual refresh).
  // setState only happens in the async callback, never synchronously in the
  // effect body, which keeps the react-hooks/set-state-in-effect rule happy.
  useEffect(() => {
    let cancelled = false;
    setError(false);
    (async () => {
      const data = await getRecentEvents(51, 0);
      if (cancelled) return;
      if (!data) {
        // null = every CORS proxy failed. Don't blank the UI; flag the
        // error so the empty state can offer a retry.
        setError(true);
        setLoading(false);
        return;
      }
      setEvents(data);
      setLastRefresh(new Date());
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const getMainHand = (equipment: KillEvent['Killer']['Equipment']) => {
    return (equipment as Record<string, { Type: string; Count: number; Quality: number } | null>)?.MainHand || null;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Recent Kills</h2>
          <div className="text-[10px] text-zinc-600">Click a row to see full equipment · Last refresh: {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && events.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">Loading killboard...</div>
      )}

      {!loading && error && events.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-8 text-center">
          <div className="text-red-400 text-sm font-bold mb-1">Gameinfo API unreachable</div>
          <div className="text-zinc-500 text-xs mb-4">
            The Albion gameinfo proxy chain isn't responding. This usually clears in a minute.
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg text-xs font-bold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500 text-sm">
          No recent kill events returned by the API. Try Refresh in a few seconds.
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {events.map(ev => {
              const killerWeapon = getMainHand(ev.Killer.Equipment);
              const victimWeapon = getMainHand(ev.Victim.Equipment);
              const expanded = expandedId === ev.EventId;
              return (
                <div key={ev.EventId}>
                  <div
                    onClick={() => setExpandedId(expanded ? null : ev.EventId)}
                    className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {killerWeapon && <ItemIcon itemId={killerWeapon.Type} size={36} quality={killerWeapon.Quality} className="shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm text-green-400 font-medium truncate">{ev.Killer.Name}</div>
                        <div className="text-[11px] text-zinc-600 truncate">
                          {ev.Killer.AllianceName && `[${ev.Killer.AllianceName}] `}
                          {ev.Killer.GuildName || 'No guild'} · IP {ev.Killer.AverageItemPower?.toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-600 shrink-0">vs</div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {victimWeapon && <ItemIcon itemId={victimWeapon.Type} size={36} quality={victimWeapon.Quality} className="shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm text-red-400 font-medium truncate">{ev.Victim.Name}</div>
                        <div className="text-[11px] text-zinc-600 truncate">
                          {ev.Victim.AllianceName && `[${ev.Victim.AllianceName}] `}
                          {ev.Victim.GuildName || 'No guild'} · IP {ev.Victim.AverageItemPower?.toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gold">{formatSilver(ev.TotalVictimKillFame)}</div>
                      <div className="text-[10px] text-zinc-600">{new Date(ev.TimeStamp).toLocaleTimeString()}</div>
                      {ev.numberOfParticipants > 1 && (
                        <div className="text-[10px] text-zinc-500">{ev.numberOfParticipants} players</div>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded equipment view */}
                  {expanded && (
                    <div className="px-4 pb-4 bg-zinc-950/50 border-t border-zinc-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                          <div className="text-[10px] uppercase text-green-500 font-semibold mb-2">Killer · {ev.Killer.Name}</div>
                          <EquipmentGrid equipment={ev.Killer.Equipment} />
                          <div className="text-[10px] text-zinc-500 mt-2">
                            IP <span className="text-zinc-300">{ev.Killer.AverageItemPower?.toFixed(0)}</span> · Damage <span className="text-zinc-300">{ev.Killer.DamageDone?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-red-500 font-semibold mb-2">Victim · {ev.Victim.Name}</div>
                          <EquipmentGrid equipment={ev.Victim.Equipment} />
                          <div className="text-[10px] text-zinc-500 mt-2">
                            IP <span className="text-zinc-300">{ev.Victim.AverageItemPower?.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ToolExplainer title="About the Killboard">
        <p>
          The Killboard streams the most recent PvP kill events across the
          Albion Online server you're connected to — Europe by default, with
          Americas and Asia available via the server switcher in the top bar.
          Each row shows the killer, the victim, their main-hand weapons, kill
          fame awarded, and how many other players were involved in the fight.
        </p>
        <p>
          Click any row to expand a side-by-side equipment breakdown: every
          gear slot, item quality (Normal / Good / Outstanding / Excellent /
          Masterpiece), and effective item power. Useful for analysing what
          builds are pulling kills in current PvP — especially when filtered
          by ZvZ-size fights via the Meta Items page.
        </p>
        <p>
          Data comes from Albion's public gameinfo API, routed through a
          rotating CORS proxy chain because the API itself doesn't set
          cross-origin headers. If all three proxies are momentarily down
          you'll see the "API unreachable" card — usually clears in under a
          minute.
        </p>
      </ToolExplainer>
    </div>
  );
}
