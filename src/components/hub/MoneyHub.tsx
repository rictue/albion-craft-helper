import { Link } from 'react-router-dom';

/**
 * Simple strategy hub — one screen that answers 'what should I do to make
 * silver right now?' by listing the top profit paths with brief when-to-use
 * descriptions. Everything else in the nav is still available, but this is
 * the fast path for someone who is overwhelmed by choices.
 */

interface Strategy {
  icon: string;
  name: string;
  route: string;
  tagline: string;
  when: string;
  color: string; // tailwind classes for the accent
  risk: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

const STRATEGIES: Strategy[] = [
  {
    icon: '🪵',
    name: 'Refining',
    route: '/refining',
    tagline: 'Buy raw, refine, sell refined. Most consistent profit.',
    when: 'You have focus, or a city-bonus refining city is available (Fort Sterling for wood, etc.)',
    color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-300',
    risk: 'low',
    effort: 'low',
  },
  {
    icon: '⚔',
    name: 'ZvZ Meta Crafting',
    route: '/suggested',
    tagline: 'Craft gear that gets burned in 25+ player fights — guaranteed demand.',
    when: 'You want to craft items that sell FAST. Focus + city bonus recommended.',
    color: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-300',
    risk: 'low',
    effort: 'medium',
  },
  {
    icon: '💱',
    name: 'Market Flipping',
    route: '/flipper',
    tagline: 'Buy low in one city, sell high in another. No crafting.',
    when: "You don't have focus/specs. Just silver and a transport mount.",
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-300',
    risk: 'medium',
    effort: 'medium',
  },
  {
    icon: '🎯',
    name: 'BM Running',
    route: '/bm-runner',
    tagline: 'Buy gear, transport to Caerleon BM, instant-sell to buy orders.',
    when: 'You have a transport mount and can accept red-zone gank risk.',
    color: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-300',
    risk: 'high',
    effort: 'medium',
  },
  {
    icon: '✨',
    name: 'Transmutation',
    route: '/transmute',
    tagline: 'Convert lower-tier refined resources into higher-tier with focus.',
    when: 'You have focus burning a hole in your pocket and want pure silver/focus conversion.',
    color: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300',
    risk: 'low',
    effort: 'low',
  },
  {
    icon: '🧥',
    name: 'Cape Converting',
    route: '/capes',
    tagline: 'Buy plain capes, convert with faction points, sell faction capes.',
    when: 'You have faction reputation built up from missions.',
    color: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-300',
    risk: 'low',
    effort: 'low',
  },
  {
    icon: '🧮',
    name: 'Craft Calculator',
    route: '/calculator',
    tagline: 'Manual profit calculator for a specific item. Full control.',
    when: 'You know exactly what to craft and want precise numbers.',
    color: 'from-gold/20 to-gold/5 border-gold/30 text-gold',
    risk: 'low',
    effort: 'low',
  },
  {
    icon: '🔪',
    name: 'Butcher',
    route: '/butcher',
    tagline: 'Buy grown animals, butcher into meat, sell meat stacks.',
    when: 'Low effort daily activity; runs alongside refining for passive profit.',
    color: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300',
    risk: 'low',
    effort: 'low',
  },
];

function riskBadge(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (level === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}

export default function MoneyHub() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-zinc-100">What do you want to do?</h1>
        <p className="text-sm text-zinc-500 max-w-xl mx-auto">
          Pick a silver-making strategy. Each one opens the right tool. All other pages are still in the top menu if you need them.
        </p>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STRATEGIES.map((s) => (
          <Link
            key={s.route}
            to={s.route}
            className={`group relative rounded-xl border bg-gradient-to-br ${s.color} p-4 hover:scale-[1.02] transition-transform`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-3xl">{s.icon}</div>
              <div className="flex gap-1">
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${riskBadge(s.risk)}`}>
                  risk {s.risk}
                </span>
              </div>
            </div>
            <div className="text-base font-bold mb-1">{s.name}</div>
            <div className="text-xs text-zinc-300 mb-3 leading-relaxed">
              {s.tagline}
            </div>
            <div className="text-[10px] text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400">When:</strong> {s.when}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                effort: {s.effort}
              </span>
              <span className="text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                Open →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary links */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Also useful</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Link to="/planner" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">📋 Craft Planner</Link>
          <Link to="/portfolio" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">💼 Portfolio Tracker</Link>
          <Link to="/craft-history" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">📓 Craft History</Link>
          <Link to="/compare" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">⚖ Compare Tiers</Link>
          <Link to="/prices" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">💰 Market Prices</Link>
          <Link to="/history" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">📈 Price History</Link>
          <Link to="/focus" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">⭐ Focus Efficiency</Link>
          <Link to="/mounts" className="text-zinc-400 hover:text-gold px-2 py-1 rounded hover:bg-zinc-800">🐎 Mount Breeding</Link>
        </div>
      </div>
    </div>
  );
}
