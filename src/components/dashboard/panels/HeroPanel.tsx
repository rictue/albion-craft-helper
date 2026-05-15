import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServer, setServer } from '../../../services/api';
import type { AlbionServer } from '../../../services/api';
import { IconSearch } from '../../shell/navIcons';

const QUICK_LINKS: { keywords: string[]; to: string; label: string }[] = [
  { keywords: ['craft', 'calculator', 'item', 'profit'], to: '/calculator',    label: 'Crafting Calculator' },
  { keywords: ['refine', 'refining', 'plank', 'bar'],     to: '/refining',      label: 'Refining Calculator' },
  { keywords: ['cook', 'cooking', 'meal', 'food'],        to: '/cooking',       label: 'Cooking Calculator' },
  { keywords: ['laborer', 'house', 'journal'],            to: '/laborers',      label: 'Laborer Calculator' },
  { keywords: ['transmute', 'transmutation'],             to: '/transmute',     label: 'Transmutation' },
  { keywords: ['gold', 'premium'],                        to: '/gold',          label: 'Gold Prices' },
  { keywords: ['portfolio', 'silver position'],           to: '/portfolio',     label: 'Portfolio' },
  { keywords: ['profit history', 'log', 'session'],       to: '/craft-history', label: 'Profit History' },
  { keywords: ['player'],                                 to: '/players',       label: 'Player Search' },
  { keywords: ['guild'],                                  to: '/guilds',        label: 'Guild Search' },
  { keywords: ['killboard', 'kill'],                      to: '/killboard',     label: 'Killboard' },
  { keywords: ['fame'],                                   to: '/top-fame',      label: 'Top Kill Fame' },
  { keywords: ['meta', 'popular'],                        to: '/meta',          label: 'Meta Items' },
  { keywords: ['setting', 'default', 'config'],           to: '/settings',      label: 'Settings' },
];

const SERVERS: { value: AlbionServer; label: string; flag: string }[] = [
  { value: 'europe', label: 'Europe',   flag: '🇪🇺' },
  { value: 'west',   label: 'Americas', flag: '🇺🇸' },
  { value: 'east',   label: 'Asia',     flag: '🌏' },
];

export default function HeroPanel() {
  const [query, setQuery] = useState('');
  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const navigate = useNavigate();

  const matches = query.trim().length > 0
    ? QUICK_LINKS.filter(l => {
        const q = query.toLowerCase();
        return l.label.toLowerCase().includes(q) || l.keywords.some(k => k.includes(q));
      }).slice(0, 6)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches.length > 0) navigate(matches[0].to);
  };

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload();
  };

  return (
    <section className="medieval-hero rounded-lg overflow-hidden px-5 sm:px-8 py-7 sm:py-9">
      <div className="relative z-10">
        <div className="ornament-line mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-gold-light">
          Albioncrafts Companion
        </div>
        <h1 className="medieval-title text-3xl sm:text-5xl leading-[1.04] max-w-2xl">
          Tools, calculators & market planning<br />
          <span className="text-gold-light">for Albion Online</span>
        </h1>
        <p className="mt-3 text-[13px] sm:text-sm text-[#d7c7ad] max-w-xl leading-relaxed">
          Build your daily silver routine. Refine, craft, cook, plan laborer journals — all backed by live AODP prices and your own manual overrides.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 max-w-2xl relative">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/70">{IconSearch}</span>
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search items, tools, guides…"
                className="w-full pl-10 pr-3 py-2.5 rounded-md bg-[color:var(--color-bg-raised)]/90 border border-[color:var(--color-border-light)] text-[14px] text-zinc-100 placeholder:text-zinc-500 focus:border-gold focus:outline-none"
              />
              {matches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 medieval-panel p-2 z-20 max-h-60 overflow-y-auto">
                  {matches.map(m => (
                    <Link
                      key={m.to}
                      to={m.to}
                      onClick={() => setQuery('')}
                      className="block px-3 py-1.5 rounded text-[13px] text-zinc-200 hover:bg-gold/10 hover:text-gold-light transition-colors"
                    >
                      {m.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-0.5 px-1 py-1 rounded-md bg-[color:var(--color-bg-raised)]/90 border border-[color:var(--color-border-light)]">
              {SERVERS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleServer(s.value)}
                  className={`px-2.5 py-1.5 rounded text-[11px] uppercase tracking-[0.12em] font-bold transition-colors ${
                    server === s.value
                      ? 'text-gold-light bg-gold/15'
                      : 'text-zinc-500 hover:text-gold'
                  }`}
                >
                  <span className="mr-1">{s.flag}</span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
          {[
            ['AODP',  'Live prices'],
            ['LPB',   'Real return rate'],
            ['Focus', 'Spec value'],
            ['Local', 'Custom data'],
          ].map(([label, value]) => (
            <div key={label} className="stat-rune rounded px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-gold/70">{label}</div>
              <div className="mt-0.5 text-[12px] font-bold text-zinc-100">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
