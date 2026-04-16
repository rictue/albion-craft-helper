import { Link } from 'react-router-dom';

/**
 * Landing page — silver-making strategies grouped by effort/risk profile.
 * Overhauled visual: hero with brand emphasis, grouped strategy sections,
 * uniform card language, restrained accent palette.
 */

type Level = 'low' | 'medium' | 'high';

interface Strategy {
  icon: string;
  name: string;
  route: string;
  tagline: string;
  when: string;
  risk: Level;
  effort: Level;
  highlight?: boolean;
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
        highlight: true,
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
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
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

const RISK_STYLES: Record<Level, { text: string; bg: string; border: string }> = {
  low:    { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  medium: { text: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  high:   { text: 'text-rose-300',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    },
};

function Chip({ label, value, level }: { label: string; value: Level; level?: 'risk' | 'effort' }) {
  const s = RISK_STYLES[value];
  const icon = level === 'effort' ? '◷' : '◉';
  return (
    <span className={`chip ${s.text} ${s.bg} ${s.border}`}>
      <span className="opacity-60">{icon}</span>
      {label} · {value}
    </span>
  );
}

function StrategyCard({ s }: { s: Strategy }) {
  return (
    <Link
      to={s.route}
      className={`group relative flex flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
        s.highlight
          ? 'border-gold/30 bg-gradient-to-br from-gold/[0.07] via-transparent to-transparent hover:border-gold/50'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)] hover:border-[color:var(--color-border-light)]'
      }`}
    >
      {s.highlight && (
        <span className="absolute -top-2 right-4 chip text-gold bg-gold/10 border-gold/30">
          ★ Top path
        </span>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] flex items-center justify-center text-xl">
          {s.icon}
        </div>
        <Chip label="risk" value={s.risk} />
      </div>

      <div className="text-lg font-semibold text-zinc-100 mb-2 tracking-tight">{s.name}</div>
      <div className="text-sm text-zinc-400 leading-relaxed mb-4 flex-1">
        {s.tagline}
      </div>

      <div className="text-[12px] text-zinc-500 leading-relaxed border-t border-[color:var(--color-border)] pt-3 mb-3">
        <span className="text-zinc-600 uppercase text-[9px] tracking-[0.14em] font-semibold block mb-1">Use when</span>
        {s.when}
      </div>

      <div className="flex items-center justify-between">
        <Chip label="effort" value={s.effort} level="effort" />
        <span className="text-xs font-medium text-zinc-500 group-hover:text-gold transition-colors flex items-center gap-1">
          Open
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function MoneyHub() {
  return (
    <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-gradient-to-br from-[color:var(--color-bg-raised)] via-[color:var(--color-bg-raised)] to-[color:var(--color-bg-overlay)] px-6 sm:px-10 py-10 sm:py-14">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-px bg-gold/60" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold font-semibold">AlbionCrafts</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-50 tracking-tight leading-[1.05] mb-4">
            Make silver in Albion Online,<br />
            <span className="text-gold">with the math on your side.</span>
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
            Nine strategies, one tool for each. Real game formulas verified against in-game data — no hand-waving,
            no "trust me bro." Pick a path below or use the menu to jump to any tool.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
            <span className="chip text-zinc-300 bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border-light)]">
              Live AODP prices
            </span>
            <span className="chip text-zinc-300 bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border-light)]">
              Focus + spec modeling
            </span>
            <span className="chip text-zinc-300 bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border-light)]">
              5 servers
            </span>
            <span className="chip text-zinc-300 bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border-light)]">
              Free
            </span>
          </div>
        </div>
      </header>

      {/* Strategy groups */}
      {GROUPS.map((g) => (
        <section key={g.heading} className="space-y-4">
          <div className="section-heading">
            <h2>{g.heading}</h2>
            <span className="hint hidden sm:inline">{g.description}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {g.strategies.map((s) => <StrategyCard key={s.route} s={s} />)}
          </div>
        </section>
      ))}

      {/* Secondary links */}
      <section className="space-y-4">
        <div className="section-heading">
          <h2>Other tools</h2>
          <span className="hint hidden sm:inline">Trackers, references, side activities</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {SECONDARY_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)] hover:border-gold/40 hover:text-gold text-zinc-400 text-xs font-medium transition-all hover:-translate-y-0.5"
            >
              <span className="text-base" aria-hidden>{l.icon}</span>
              <span className="truncate">{l.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
