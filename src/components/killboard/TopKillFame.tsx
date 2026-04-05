import { useState, useEffect, useCallback } from 'react';
import { getTopKillFame } from '../../services/gameinfo';
import type { PlayerSearchResult } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';

type Range = 'day' | 'week' | 'month';

export default function TopKillFame() {
  const [range, setRange] = useState<Range>('week');
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getTopKillFame(range, 50);
    setPlayers(data || []);
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Top Kill Fame</h2>
          <div className="text-[10px] text-zinc-600">Leaderboard of highest fame earners</div>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                range === r ? 'bg-gold/20 text-gold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          Loading leaderboard...
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {players.map((p, idx) => {
              const rank = idx + 1;
              const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-zinc-300' : rank === 3 ? 'text-amber-600' : 'text-zinc-500';
              return (
                <div key={p.Id} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className={`text-lg font-black w-8 text-center ${rankColor}`}>#{rank}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{p.Name}</div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {p.AllianceName && <span>[{p.AllianceName}] </span>}
                      {p.GuildName || 'No guild'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-green-400">{formatSilver(p.KillFame || 0)}</div>
                    <div className="text-[10px] text-zinc-600">kill fame</div>
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
