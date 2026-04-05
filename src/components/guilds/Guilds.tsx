import { useState } from 'react';
import { searchPlayersAndGuilds, getGuild, getGuildMembers } from '../../services/gameinfo';
import type { GuildSearchResult, GuildInfo, PlayerSearchResult } from '../../services/gameinfo';
import { formatSilver } from '../../utils/formatters';

export default function Guilds() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GuildSearchResult[]>([]);
  const [selected, setSelected] = useState<GuildInfo | null>(null);
  const [members, setMembers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (query.length < 3) return;
    const data = await searchPlayersAndGuilds(query);
    setResults(data?.guilds || []);
  };

  const selectGuild = async (id: string) => {
    setLoading(true);
    const [guild, guildMembers] = await Promise.all([getGuild(id), getGuildMembers(id)]);
    setSelected(guild);
    setMembers(guildMembers || []);
    setLoading(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">Guild Search</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search guild (min 3 chars)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button onClick={handleSearch} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30">
            Search
          </button>
        </div>
      </div>

      {results.length > 0 && !selected && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">{results.length} guilds found</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {results.map(g => (
              <button key={g.Id} onClick={() => selectGuild(g.Id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left">
                <div>
                  <div className="text-sm text-zinc-200 font-medium">{g.Name}</div>
                  {g.AllianceName && <div className="text-xs text-zinc-500">[{g.AllianceName}]</div>}
                </div>
                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">Loading...</div>}

      {selected && (
        <div className="space-y-4">
          <button onClick={() => { setSelected(null); setMembers([]); }} className="text-xs text-zinc-500 hover:text-gold">← Back</button>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="mb-4">
              <div className="text-2xl font-bold text-gold">{selected.guild.Name}</div>
              {selected.guild.AllianceName && (
                <div className="text-sm text-zinc-400">
                  [{selected.guild.AllianceTag}] {selected.guild.AllianceName}
                </div>
              )}
              <div className="text-xs text-zinc-600 mt-1">
                Founded by {selected.guild.FounderName} • {new Date(selected.guild.Founded).toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Members</div>
                <div className="text-lg font-bold text-zinc-200">{selected.guild.MemberCount}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Kill Fame</div>
                <div className="text-lg font-bold text-green-400">{formatSilver(selected.guild.killFame)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Death Fame</div>
                <div className="text-lg font-bold text-red-400">{formatSilver(selected.guild.DeathFame)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">K/D Ratio</div>
                <div className="text-lg font-bold text-gold">{selected.overall?.ratio || '-'}</div>
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Members ({members.length})</h3>
              </div>
              <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
                {members.sort((a, b) => (b.KillFame || 0) - (a.KillFame || 0)).map(m => (
                  <div key={m.Id} className="px-4 py-2 flex justify-between items-center text-sm">
                    <span className="text-zinc-300">{m.Name}</span>
                    <span className="text-green-400 text-xs">{formatSilver(m.KillFame || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!results.length && !selected && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#127942;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Guild Search</h2>
          <p className="text-sm text-zinc-500">Search any guild to see stats, members, and kill fame.</p>
        </div>
      )}
    </div>
  );
}
