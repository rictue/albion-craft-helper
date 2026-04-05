// Albion Online Gameinfo API client
// For players, guilds, killboard, events

const GAMEINFO_URLS: Record<string, string> = {
  europe: 'https://gameinfo-ams.albiononline.com/api/gameinfo',
  west: 'https://gameinfo.albiononline.com/api/gameinfo',
  east: 'https://gameinfo-sgp.albiononline.com/api/gameinfo',
};

// Gameinfo API does not set CORS headers; route via public proxies (tried in order).
const CORS_PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

function getBase(): string {
  const server = (localStorage.getItem('albion-server') || 'europe') as keyof typeof GAMEINFO_URLS;
  return GAMEINFO_URLS[server] || GAMEINFO_URLS.europe;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const target = `${getBase()}${path}`;
  for (const buildUrl of CORS_PROXIES) {
    try {
      const res = await fetch(buildUrl(target), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text) continue;
      try {
        return JSON.parse(text) as T;
      } catch {
        continue;
      }
    } catch (err) {
      console.warn('Proxy failed, trying next:', err);
      continue;
    }
  }
  console.error('All CORS proxies failed for:', target);
  return null;
}

// ============= TYPES =============

export interface PlayerSearchResult {
  Id: string;
  Name: string;
  GuildId: string | null;
  GuildName: string | null;
  AllianceId: string | null;
  AllianceName: string | null;
  KillFame?: number;
  DeathFame?: number;
  FameRatio?: number;
  totalKills?: number;
}

export interface GuildSearchResult {
  Id: string;
  Name: string;
  AllianceId: string | null;
  AllianceName: string | null;
  KillFame?: number;
  DeathFame?: number;
}

export interface SearchResponse {
  players: PlayerSearchResult[];
  guilds: GuildSearchResult[];
}

export interface PlayerInfo {
  Id: string;
  Name: string;
  GuildId: string | null;
  GuildName: string | null;
  AllianceId: string | null;
  AllianceName: string | null;
  AllianceTag: string | null;
  KillFame: number;
  DeathFame: number;
  FameRatio: number;
  LifetimeStatistics: {
    PvE: {
      Total: number;
      Royal: number;
      Outlands: number;
      Avalon: number;
      Hellgate: number;
      CorruptedDungeon: number;
      Mists: number;
    };
    Gathering: {
      Fiber: { Total: number };
      Hide: { Total: number };
      Ore: { Total: number };
      Rock: { Total: number };
      Wood: { Total: number };
      All: { Total: number };
    };
    Crafting: { Total: number };
    CrystalLeague: number;
    FishingFame: number;
    FarmingFame: number;
    Total: number;
  };
  Equipment?: Record<string, unknown>;
  AverageItemPower?: number;
}

export interface GuildInfo {
  guild: {
    Id: string;
    Name: string;
    FounderId: string;
    FounderName: string;
    Founded: string;
    AllianceId: string | null;
    AllianceName: string | null;
    AllianceTag: string | null;
    killFame: number;
    DeathFame: number;
    MemberCount: number;
  };
  basic: {
    id: string;
    name: string;
    alliance: string;
  };
  overall: {
    kills: number;
    deaths: number;
    fame: number;
    ratio: string;
  };
  topPlayers: PlayerSearchResult[];
}

export interface KillEvent {
  EventId: number;
  TimeStamp: string;
  Version: number;
  Killer: {
    Id: string;
    Name: string;
    GuildId: string | null;
    GuildName: string | null;
    AllianceName: string | null;
    AverageItemPower: number;
    DamageDone: number;
    Equipment: Record<string, { Type: string; Count: number; Quality: number } | null>;
  };
  Victim: {
    Id: string;
    Name: string;
    GuildId: string | null;
    GuildName: string | null;
    AllianceName: string | null;
    AverageItemPower: number;
    Equipment: Record<string, { Type: string; Count: number; Quality: number } | null>;
  };
  TotalVictimKillFame: number;
  Location: string | null;
  numberOfParticipants: number;
  GroupMemberCount: number;
}

// ============= API CALLS =============

export async function searchPlayersAndGuilds(query: string): Promise<SearchResponse | null> {
  if (query.length < 3) return null;
  return await fetchJson<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
}

export async function getPlayer(id: string): Promise<PlayerInfo | null> {
  return await fetchJson<PlayerInfo>(`/players/${id}`);
}

export async function getPlayerKills(id: string, limit: number = 10): Promise<KillEvent[] | null> {
  return await fetchJson<KillEvent[]>(`/players/${id}/kills?limit=${limit}`);
}

export async function getPlayerDeaths(id: string, limit: number = 10): Promise<KillEvent[] | null> {
  return await fetchJson<KillEvent[]>(`/players/${id}/deaths?limit=${limit}`);
}

export async function getGuild(id: string): Promise<GuildInfo | null> {
  return await fetchJson<GuildInfo>(`/guilds/${id}`);
}

export async function getGuildMembers(id: string): Promise<PlayerSearchResult[] | null> {
  return await fetchJson<PlayerSearchResult[]>(`/guilds/${id}/members`);
}

export async function getRecentEvents(limit: number = 51, offset: number = 0): Promise<KillEvent[] | null> {
  return await fetchJson<KillEvent[]>(`/events?limit=${limit}&offset=${offset}`);
}

export async function getTopKillFame(range: 'day' | 'week' | 'month' = 'week', limit: number = 10): Promise<PlayerSearchResult[] | null> {
  return await fetchJson<PlayerSearchResult[]>(`/events/playerfame?range=${range}&limit=${limit}&offset=0`);
}
