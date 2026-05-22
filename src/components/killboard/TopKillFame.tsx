import { useState, useEffect } from 'react';
import { getTopKillFame } from '../../services/gameinfo';
import type { PlayerSearchResult } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';

type Range = 'day' | 'week' | 'month';

export default function TopKillFame() {
  usePageMeta({
    title: 'Top Kill Fame',
    description: 'Albion Online kill fame leaderboard — the top PvP players ranked by total kill fame over the last day, week, or month. Pulled live from the official gameinfo API.',
  });

  const [range, setRange] = useState<Range>('week');
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Reset loading/players when the range changes — adjust state during render
  // instead of setState-in-effect (React's "reset on prop change" pattern).
  const [prevRange, setPrevRange] = useState(range);
  if (prevRange !== range) {
    setPrevRange(range);
    setLoading(true);
    setError(false);
    setPlayers([]);
  }

  useEffect(() => {
    let cancelled = false;
    setError(false);
    (async () => {
      const data = await getTopKillFame(range, 50);
      if (cancelled) return;
      if (!data) {
        setError(true);
        setLoading(false);
        return;
      }
      setPlayers(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range]);

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

      {!loading && error && (
        <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-8 text-center">
          <div className="text-red-400 text-sm font-bold mb-1">Gameinfo API unreachable</div>
          <div className="text-zinc-500 text-xs">
            The leaderboard endpoint isn't responding. Switch the timeframe or wait a minute and try again.
          </div>
        </div>
      )}

      {!loading && !error && players.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500 text-sm">
          No leaderboard entries for this timeframe yet.
        </div>
      )}

      {!loading && !error && players.length > 0 && (
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

      <ToolExplainer title="About the Top Kill Fame leaderboard">
        <p>
          Every PvP kill in Albion Online awards kill fame to the killer
          based on the victim's gear value. The leaderboard ranks players
          by total fame earned in the last day, week, or month — a clean
          shorthand for who's been most active in PvP. Click the timeframe
          toggle to switch between the three windows.
        </p>
        <p>
          The list is fetched directly from Albion's gameinfo API
          (<code>/events/killfame</code>). It includes alliance and guild
          tags where available so you can quickly see which guild is
          dominating the season. Rank colors at the top: gold for #1,
          silver for #2, bronze for #3.
        </p>
        <p>
          A few quirks: fame only counts kills against players whose IP
          exceeds the gameinfo cutoff (currently 700 IP), so very
          low-gear ganks don't pad the leaderboard. The week and month
          windows lag a few minutes behind real-time but the day window
          is essentially live.
        </p>
      </ToolExplainer>
    </div>
  );
}
