import { Link } from 'react-router-dom';

/**
 * Landing page — silver-making strategies grouped by effort/risk profile.
 * Professional card layout: subtle accent per strategy family, consistent
 * typography hierarchy, no rainbow gradient noise. Each card opens the
 * specific tool for that path.
 */

type Risk = 'low' | 'medium' | 'high';

interface Strategy {
  icon: string;
  name: string;
  route: string;
  tagline: string;
  when: string;
  risk: Risk;
  effort: Risk;
}

interface Group {
  heading: string;
  description: string;
  strategies: Strategy[];
}

const GROUPS: Group[] = [
  {
    heading: 'Refining & Crafting',
    description: 'Turn raw resources into refined goods. Highest ceiling with focus + specs.',
    strategies: [
      {
        icon: '🪵',
        name: 'Refining',
        route: '/refining',
        tagline: 'Buy raw, refine, sell planks / bars / cloth / leather / stone.',
        when: 'You have focus or a matching refining city (Fort Sterling = wood, etc).',
        risk: 'low',
        effort: 'low',
      },
      {
        icon: '⚔',
        name: 'ZvZ Meta Crafting',
        route: '/suggested',
        tagline: 'Craft gear that dies in 25-player fights. Guaranteed demand.',
        when: 'You want items that sell FAST. Focus + city bonus recommended.',
        risk: 'low',
        effort: 'medium',
      },
      {
        icon: '🧮',
        name: 'Craft Calculator',
        route: '/calculator',
        tagline: 'Profit calc for any specific item with full control over inputs.',
        when: 'You know exactly what to craft and want precise numbers.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
  {
    heading: 'Market Movement',
    description: 'Buy low, sell high. No crafting, just silver + a mount.',
    strategies: [
      {
        icon: '💱',
        name: 'Market Flipper',
        route: '/flipper',
        tagline: 'Scan all cities for buy-low-sell-high margins per item.',
        when: "You don't have focus / specs but have silver and can transport.",
        risk: 'medium',
        effort: 'medium',
      },
      {
        icon: '🎯',
        name: 'BM Running',
        route: '/bm-runner',
        tagline: 'Buy gear, transport to Caerleon Black Market, sell to buy orders.',
        when: 'You have a transport mount and accept red-zone gank risk.',
        risk: 'high',
        effort: 'medium',
      },
      {
        icon: '✨',
        name: 'Transmutation',
        route: '/transmute',
        tagline: 'Convert lower-tier refined resources up a tier with focus.',
        when: 'Focus is burning a hole in your pocket; pure silver/focus conversion.',
        risk: 'low',
        effort: 'low',
      },
      {
        icon: '🧥',
        name: 'Cape Converter',
        route: '/capes',
        tagline: 'Plain capes → faction capes via faction points.',
        when: 'You have faction rep from missions stockpiled.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
  {
    heading: 'Passive & Daily',
    description: 'Low-effort income that runs alongside everything else.',
    strategies: [
      {
        icon: '🔪',
        name: 'Butcher',
        route: '/butcher',
        tagline: 'Buy grown animals, butcher into meat stacks, sell.',
        when: 'Daily routine; pairs well with refining.',
        risk: 'low',
        effort: 'low',
      },
      {
        icon: '🌾',
        name: 'Island Planner',
        route: '/island',
        tagline: 'Crop yield + market-depth analysis for 79-plot islands.',
        when: 'You farm on premium islands and want to know what actually pays.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
];

const SECONDARY_LINKS: Array<{ to: string; label: string; icon: string }> = [
  { to: '/planner', label: 'Craft Planner', icon: '📋' },
  { to: '/portfolio', label: 'Portfolio Tracker', icon: '💼' },
  { to: '/craft-history', label: 'Craft History', icon: '📓' },
  { to: '/compare', label: 'Compare Tiers', icon: '⚖' },
  { to: '/prices', label: 'Market Prices', icon: '💰' },
  { to: '/history', label: 'Price History', icon: '📈' },
  { to: '/focus', label: 'RR Reference', icon: '⭐' },
  { to: '/mounts', label: 'Mount Breeding', icon: '🐎' },
  { to: '/farmbreed', label: 'Farm & Breed', icon: '🌱' },
  { to: '/cooking', label: 'Cooking', icon: '🍲' },
  { to: '/fame', label: 'Crafting Fame', icon: '⚡' },
  { to: '/journals', label: 'Journals', icon: '📚' },
];

function RiskChip({ label, level }: { label: string; level: Risk }) {
  const color =
    level === 'low' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : level === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  return (
    <span className={`text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border font-semibold ${color}`}>
      {label} · {level}
    </span>
  );
}

function StrategyCard({ s }: { s: Strategy }) {
  return (
    <Link
      to={s.route}
      className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 transition-colors p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl leading-none" aria-hidden>{s.icon}</div>
        <div className="flex gap-1">
          <RiskChip label="risk" level={s.risk} />
        </div>
      </div>
      <div className="text-base font-semibold text-zinc-100 mb-1.5">{s.name}</div>
      <div className="text-xs text-zinc-400 leading-relaxed mb-3 flex-1">
        {s.tagline}
      </div>
      <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3 mb-2">
        <span className="text-zinc-600 uppercase text-[9px] tracking-[0.12em] font-semibold">Use when</span>
        <br />
        {s.when}
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em]">
        <span className="text-zinc-600">effort · {s.effort}</span>
        <span className="text-gold font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </Link>
  );
}

export default function MoneyHub() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold/70 font-semibold">AlbionCrafts</div>
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Silver-making strategies</h1>
        <p className="text-sm text-zinc-500 max-w-2xl">
          Pick the path that matches your focus, silver, and risk tolerance. Each tile opens a dedicated
          calculator for that strategy. Everything is also in the top menu.
        </p>
      </header>

      {/* Strategy groups */}
      {GROUPS.map((g) => (
        <section key={g.heading} className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-[0.12em]">{g.heading}</h2>
            <span className="text-xs text-zinc-500">{g.description}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.strategies.map((s) => <StrategyCard key={s.route} s={s} />)}
          </div>
        </section>
      ))}

      {/* Secondary links */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-[0.12em]">Other tools</h2>
          <span className="text-xs text-zinc-500">Trackers, references, side activities</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {SECONDARY_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-gold/40 hover:text-gold text-zinc-400 text-xs font-medium transition-colors"
            >
              <span className="text-sm" aria-hidden>{l.icon}</span>
              <span className="truncate">{l.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
