import { Link } from 'react-router-dom';
import ItemIcon from '../common/ItemIcon';

type Level = 'low' | 'medium' | 'high';

interface Strategy {
  itemId: string;
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
    description: 'Focus, royal-city bonuses, journals, and material loops.',
    strategies: [
      {
        itemId: 'T6_PLANKS_LEVEL1@1',
        name: 'Refining',
        route: '/refining',
        tagline: 'Raw resources into planks, bars, cloth, leather, and stone.',
        when: 'Best with focus or a matching refining city.',
        risk: 'low',
        effort: 'low',
        highlight: true,
      },
      {
        itemId: 'T6_2H_HALBERD',
        name: 'ZvZ Meta Crafting',
        route: '/suggested',
        tagline: 'Find gear with demand from large fights and Black Market churn.',
        when: 'Use when you want items that move quickly.',
        risk: 'low',
        effort: 'medium',
      },
      {
        itemId: 'T6_MAIN_SWORD',
        name: 'Craft Calculator',
        route: '/calculator',
        tagline: 'Pick an item, city, focus state, taxes, and station fee.',
        when: 'Use when you already know what you want to craft.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
  {
    heading: 'Market Movement',
    description: 'City spreads, Black Market routes, and conversion plays.',
    strategies: [
      {
        itemId: 'T6_BAG',
        name: 'Market Flipper',
        route: '/flipper',
        tagline: 'Scan city-to-city spreads without crafting anything.',
        when: 'Good with silver, patience, and transport capacity.',
        risk: 'medium',
        effort: 'medium',
      },
      {
        itemId: 'T6_2H_CROSSBOW',
        name: 'BM Runner',
        route: '/bm-runner',
        tagline: 'Buy gear, haul to Caerleon, and compare Black Market orders.',
        when: 'For higher-risk routes and faster liquidation.',
        risk: 'high',
        effort: 'medium',
      },
      {
        itemId: 'T6_METALBAR',
        name: 'Transmutation',
        route: '/transmute',
        tagline: 'Turn lower-tier materials into higher-tier resources.',
        when: 'Useful when focus has no better home.',
        risk: 'low',
        effort: 'low',
      },
      {
        itemId: 'T6_CAPE',
        name: 'Cape Converter',
        route: '/capes',
        tagline: 'Plain capes into faction capes with point costs included.',
        when: 'Use when faction points are sitting idle.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
  {
    heading: 'Passive & Daily',
    description: 'Routine income around islands, farms, food, and animals.',
    strategies: [
      {
        itemId: 'T5_MEAT',
        name: 'Butcher',
        route: '/butcher',
        tagline: 'Animal inputs, meat outputs, and market-side taxes.',
        when: 'A good daily loop alongside refining.',
        risk: 'low',
        effort: 'low',
      },
      {
        itemId: 'T5_FARM_CARROT_SEED',
        name: 'Island Planner',
        route: '/island',
        tagline: 'Crop and island returns with price depth in mind.',
        when: 'For premium islands and repeatable farming routes.',
        risk: 'low',
        effort: 'low',
      },
    ],
  },
];

const SECONDARY_LINKS: Array<{ to: string; label: string; itemId: string }> = [
  { to: '/planner', label: 'Craft Planner', itemId: 'T6_JOURNAL_WARRIOR_EMPTY' },
  { to: '/portfolio', label: 'Portfolio', itemId: 'T6_BAG' },
  { to: '/craft-history', label: 'Craft History', itemId: 'T6_OFF_BOOK' },
  { to: '/compare', label: 'Compare Tiers', itemId: 'T6_ROCK' },
  { to: '/prices', label: 'Market Prices', itemId: 'T6_SILVERBAG_NONTRADABLE' },
  { to: '/history', label: 'Price History', itemId: 'T6_MAP' },
  { to: '/focus', label: 'RR Reference', itemId: 'T6_POTION_ENERGY' },
  { to: '/mounts', label: 'Mount Breeding', itemId: 'T5_MOUNT_OX' },
  { to: '/farmbreed', label: 'Farm & Breed', itemId: 'T5_FARM_HORSE_BABY' },
  { to: '/cooking', label: 'Cooking', itemId: 'T6_MEAL_SOUP' },
  { to: '/fame', label: 'Crafting Fame', itemId: 'T6_JOURNAL_WARRIOR_FULL' },
  { to: '/journals', label: 'Journals', itemId: 'T6_JOURNAL_MAGE_EMPTY' },
];

const RISK_STYLES: Record<Level, { text: string; bg: string; border: string }> = {
  low: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  medium: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  high: { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25' },
};

function Chip({ label, value }: { label: string; value: Level }) {
  const s = RISK_STYLES[value];
  return (
    <span className={`chip ${s.text} ${s.bg} ${s.border}`}>
      {label} / {value}
    </span>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <Link
      to={strategy.route}
      className={`tool-card group flex min-h-[260px] flex-col p-5 transition-all hover:-translate-y-0.5 ${
        strategy.highlight ? 'border-gold/55 shadow-[0_18px_44px_rgba(214,166,74,0.12)]' : ''
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="icon-frame h-16 w-16 rounded-lg">
          <ItemIcon itemId={strategy.itemId} size={56} />
        </div>
        <Chip label="risk" value={strategy.risk} />
      </div>

      <div className="relative z-10 mt-5 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black tracking-tight text-zinc-50">{strategy.name}</h3>
          {strategy.highlight && (
            <span className="chip border-gold/40 bg-gold/15 text-gold-light">Prime</span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{strategy.tagline}</p>
        <div className="mt-4 border-t border-[color:var(--color-border)] pt-3 text-[12px] leading-relaxed text-[#bba485]">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-gold/70">Best used</span>
          {strategy.when}
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between">
        <Chip label="effort" value={strategy.effort} />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-gold/70 transition-colors group-hover:text-gold-light">
          Open
        </span>
      </div>
    </Link>
  );
}

function HeroIcons() {
  const ids = ['T6_PLANKS_LEVEL1@1', 'T6_MAIN_SWORD', 'T6_BAG', 'T6_CAPE'];
  return (
    <div className="hidden lg:grid grid-cols-2 gap-3">
      {ids.map((id, index) => (
        <div key={id} className={`icon-frame h-24 w-24 rounded-lg ${index % 2 === 1 ? 'translate-y-6' : ''}`}>
          <ItemIcon itemId={id} size={82} />
        </div>
      ))}
    </div>
  );
}

export default function MoneyHub() {
  return (
    <div className="relative mx-auto max-w-[1320px] space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      <header className="medieval-hero rounded-lg px-6 py-9 sm:px-10 sm:py-12">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <div className="ornament-line mb-5 text-[10px] font-black uppercase tracking-[0.28em] text-gold-light">
              Royal Market Hall
            </div>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-zinc-50 sm:text-6xl">
              AlbionCrafts
              <span className="block text-gold-light">silver ledger</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#d7c7ad]">
              Craft, refine, haul, and compare markets from one carved table. The math stays sharp;
              the interface now feels closer to Albion's own market halls.
            </p>
            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['AODP', 'Live prices'],
                ['RRR', 'Return rate'],
                ['BM', 'Black Market'],
                ['Focus', 'Spec value'],
              ].map(([label, value]) => (
                <div key={label} className="stat-rune rounded-lg px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gold/70">{label}</div>
                  <div className="mt-0.5 text-sm font-bold text-zinc-100">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <HeroIcons />
        </div>
      </header>

      {GROUPS.map(group => (
        <section key={group.heading} className="space-y-4">
          <div className="section-heading">
            <h2>{group.heading}</h2>
            <span className="hint hidden sm:inline">{group.description}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.strategies.map(strategy => (
              <StrategyCard key={strategy.route} strategy={strategy} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <div className="section-heading">
          <h2>Other tools</h2>
          <span className="hint hidden sm:inline">Small ledgers for side jobs and references</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {SECONDARY_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="tool-card group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-300 transition-all hover:-translate-y-0.5 hover:text-gold-light"
            >
              <span className="icon-frame h-8 w-8 shrink-0 rounded">
                <ItemIcon itemId={link.itemId} size={28} />
              </span>
              <span className="relative z-10 truncate">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
