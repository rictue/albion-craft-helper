import { useState, useEffect, useCallback } from 'react';
import { getRecentEvents } from '../../services/gameinfo';
import type { KillEvent } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

export default function Killboard() {
  const [events, setEvents] = useState<KillEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRecentEvents(51, 0);
    setEvents(data || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getMainHand = (equipment: KillEvent['Killer']['Equipment']) => {
    return equipment?.MainHand || null;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Recent Kills</h2>
          <div className="text-[10px] text-zinc-600">Last refresh: {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && events.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">Loading killboard...</div>
      )}

      {events.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {events.map(ev => {
              const killerWeapon = getMainHand(ev.Killer.Equipment);
              const victimWeapon = getMainHand(ev.Victim.Equipment);
              return (
                <div key={ev.EventId} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  {/* Killer */}
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

                  {/* Victim */}
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

                  {/* Fame + time */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gold">{formatSilver(ev.TotalVictimKillFame)}</div>
                    <div className="text-[10px] text-zinc-600">{new Date(ev.TimeStamp).toLocaleTimeString()}</div>
                    {ev.numberOfParticipants > 1 && (
                      <div className="text-[10px] text-zinc-500">{ev.numberOfParticipants} players</div>
                    )}
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
