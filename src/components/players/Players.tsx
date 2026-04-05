import { useState } from 'react';
import { searchPlayersAndGuilds, getPlayer, getPlayerKills, getPlayerDeaths } from '../../services/gameinfo';
import type { PlayerSearchResult, PlayerInfo, KillEvent } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';

export default function Players() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [kills, setKills] = useState<KillEvent[]>([]);
  const [deaths, setDeaths] = useState<KillEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (query.length < 3) return;
    setSearching(true);
    const data = await searchPlayersAndGuilds(query);
    setResults(data?.players || []);
    setSearching(false);
  };

  const selectPlayer = async (id: string) => {
    setLoading(true);
    const [player, playerKills, playerDeaths] = await Promise.all([
      getPlayer(id),
      getPlayerKills(id, 10),
      getPlayerDeaths(id, 10),
    ]);
    setSelectedPlayer(player);
    setKills(playerKills || []);
    setDeaths(playerDeaths || []);
    setLoading(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">Player Search</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search player or guild (min 3 chars)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button
            onClick={handleSearch}
            disabled={query.length < 3 || searching}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {results.length > 0 && !selectedPlayer && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
              {results.length} players found
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {results.map(p => (
              <button
                key={p.Id}
                onClick={() => selectPlayer(p.Id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div>
                  <div className="text-sm text-zinc-200 font-medium">{p.Name}</div>
                  {p.GuildName && (
                    <div className="text-xs text-zinc-500">
                      [{p.AllianceName || ''}] {p.GuildName}
                    </div>
                  )}
                </div>
                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-zinc-500">Loading player data...</div>
        </div>
      )}

      {selectedPlayer && (
        <div className="space-y-4">
          <button
            onClick={() => { setSelectedPlayer(null); setKills([]); setDeaths([]); }}
            className="text-xs text-zinc-500 hover:text-gold"
          >
            ← Back to results
          </button>

          {/* Player info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-2xl font-bold text-gold">{selectedPlayer.Name}</div>
                {selectedPlayer.GuildName && (
                  <div className="text-sm text-zinc-400 mt-1">
                    {selectedPlayer.AllianceTag && <span className="text-zinc-500">[{selectedPlayer.AllianceTag}] </span>}
                    {selectedPlayer.GuildName}
                  </div>
                )}
              </div>
              {selectedPlayer.AverageItemPower != null && (
                <div className="text-right">
                  <div className="text-xs text-zinc-500 uppercase">Avg IP</div>
                  <div className="text-xl font-bold text-zinc-200">{selectedPlayer.AverageItemPower.toFixed(0)}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Kill Fame</div>
                <div className="text-lg font-bold text-green-400">{formatSilver(selectedPlayer.KillFame)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Death Fame</div>
                <div className="text-lg font-bold text-red-400">{formatSilver(selectedPlayer.DeathFame)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Fame Ratio</div>
                <div className="text-lg font-bold text-zinc-200">{selectedPlayer.FameRatio?.toFixed(2)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Total Fame</div>
                <div className="text-lg font-bold text-gold">{formatSilver(selectedPlayer.LifetimeStatistics?.Total || 0)}</div>
              </div>
            </div>

            {selectedPlayer.LifetimeStatistics && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase">PvE Fame</div>
                  <div className="text-sm font-bold text-zinc-200">{formatSilver(selectedPlayer.LifetimeStatistics.PvE?.Total || 0)}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase">Gathering</div>
                  <div className="text-sm font-bold text-zinc-200">{formatSilver(selectedPlayer.LifetimeStatistics.Gathering?.All?.Total || 0)}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 uppercase">Crafting</div>
                  <div className="text-sm font-bold text-zinc-200">{formatSilver(selectedPlayer.LifetimeStatistics.Crafting?.Total || 0)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Recent kills */}
          {kills.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="text-xs uppercase tracking-wider text-green-400 font-semibold">Recent Kills ({kills.length})</h3>
              </div>
              <div className="divide-y divide-zinc-800">
                {kills.map(k => (
                  <div key={k.EventId} className="px-4 py-2 flex justify-between items-center text-sm">
                    <div>
                      <span className="text-zinc-400">Killed </span>
                      <span className="text-zinc-200 font-medium">{k.Victim.Name}</span>
                      {k.Victim.GuildName && <span className="text-zinc-600"> [{k.Victim.GuildName}]</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-400">+{formatSilver(k.TotalVictimKillFame)}</span>
                      <span className="text-zinc-600">{new Date(k.TimeStamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent deaths */}
          {deaths.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="text-xs uppercase tracking-wider text-red-400 font-semibold">Recent Deaths ({deaths.length})</h3>
              </div>
              <div className="divide-y divide-zinc-800">
                {deaths.map(d => (
                  <div key={d.EventId} className="px-4 py-2 flex justify-between items-center text-sm">
                    <div>
                      <span className="text-zinc-400">Died to </span>
                      <span className="text-zinc-200 font-medium">{d.Killer.Name}</span>
                      {d.Killer.GuildName && <span className="text-zinc-600"> [{d.Killer.GuildName}]</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-red-400">-{formatSilver(d.TotalVictimKillFame)}</span>
                      <span className="text-zinc-600">{new Date(d.TimeStamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!results.length && !selectedPlayer && !searching && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#128101;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Player Search</h2>
          <p className="text-sm text-zinc-500">Search for any Albion Online player to see their stats, guild, kills and deaths.</p>
        </div>
      )}
    </div>
  );
}
