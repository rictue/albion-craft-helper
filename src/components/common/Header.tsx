import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getServer, setServer } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import ServerTime from './ServerTime';
import type { AlbionServer } from '../../services/api';

const SERVER_LABELS: Record<AlbionServer, string> = {
  europe: 'Europe',
  west: 'Americas',
  east: 'Asia',
};

interface DropdownItem {
  to: string;
  label: string;
}

interface DropdownGroup {
  title: string;
  items: DropdownItem[];
}

function NavDropdown({ label, groups }: { label: string; groups: DropdownGroup[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const allItems = groups.flatMap(g => g.items);
  const isActive = allItems.some(i => i.to === location.pathname);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-semibold transition-all flex items-center gap-1.5 ${
          isActive || open
            ? 'text-gold bg-gold/10'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-[color:var(--color-bg-overlay)]'
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 bg-[color:var(--color-bg-raised)]/95 backdrop-blur-xl border border-[color:var(--color-border-light)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-3 z-50 animate-fade-in flex gap-3">
          {groups.map(group => (
            <div key={group.title} className="min-w-[170px]">
              <div className="px-3 pt-0.5 pb-2 text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold border-b border-[color:var(--color-border)] mb-1.5">
                {group.title}
              </div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-[11px] uppercase tracking-[0.1em] font-semibold transition-colors ${
                      isActive
                        ? 'text-gold bg-gold/10'
                        : 'text-zinc-300 hover:bg-[color:var(--color-bg-overlay)] hover:text-gold'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const sections = [
    {
      title: 'Market',
      links: [
        { to: '/flipper', label: 'Market Flipper' },
        { to: '/bm-runner', label: 'BM Runner' },
        { to: '/portfolio', label: 'Portfolio' },
        { to: '/suggested', label: 'Suggested' },
        { to: '/blackmarket', label: 'Black Market' },
        { to: '/prices', label: 'Prices' },
        { to: '/history', label: 'Price History' },
        { to: '/gold', label: 'Gold Prices' },
        { to: '/transmute', label: 'Transmutation' },
        { to: '/capes', label: 'Cape Converter' },
      ],
    },
    {
      title: 'Economy',
      links: [
        { to: '/calculator', label: 'Craft Calculator' },
        { to: '/refining', label: 'Refining' },
        { to: '/compare', label: 'Compare Tiers' },
        { to: '/cooking', label: 'Cooking' },
        { to: '/butcher', label: 'Butcher' },
        { to: '/mounts', label: 'Mount Breeding' },
        { to: '/farmbreed', label: 'Farm & Breed' },
        { to: '/island', label: 'Island' },
        { to: '/planner', label: 'Planner' },
        { to: '/craft-history', label: 'Craft History' },
        { to: '/fame', label: 'Crafting Fame' },
        { to: '/journals', label: 'Journals' },
        { to: '/focus', label: 'Focus Efficiency' },
      ],
    },
    {
      title: 'Community',
      links: [
        { to: '/players', label: 'Players' },
        { to: '/guilds', label: 'Guilds' },
        { to: '/killboard', label: 'Killboard' },
        { to: '/top-fame', label: 'Top Fame' },
      ],
    },
    {
      title: 'Account',
      links: [
        { to: '/profile', label: 'Profile' },
        { to: '/database', label: 'Database' },
      ],
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-72 bg-zinc-950 border-l border-zinc-800 z-50 animate-fade-in overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <span className="text-sm font-bold text-gold uppercase tracking-wider">Menu</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-gold text-xl">&#10005;</button>
        </div>
        <nav className="p-4 space-y-4">
          {sections.map(section => (
            <div key={section.title}>
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2 px-3">
                {section.title}
              </div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-gold/15 text-gold' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

export default function Header() {
  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading: authLoading, signInWithDiscord, signOut } = useAuth();

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-semibold transition-all ${
      isActive
        ? 'text-gold bg-gold/10'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-[color:var(--color-bg-overlay)]'
    }`;

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar: server time + server selector + auth */}
      <div className="bg-[color:var(--color-bg)]/95 backdrop-blur-md border-b border-[color:var(--color-border)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-8 flex items-center justify-between">
          <ServerTime />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {(Object.keys(SERVER_LABELS) as AlbionServer[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleServer(s)}
                  className={`text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    server === s
                      ? 'text-gold bg-gold/10'
                      : 'text-zinc-600 hover:text-zinc-400 hover:bg-[color:var(--color-bg-raised)]'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${server === s ? 'bg-green-400' : 'bg-zinc-700'}`}></span>
                  {SERVER_LABELS[s]}
                </button>
              ))}
            </div>
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2 pl-3 border-l border-[color:var(--color-border)]">
                  {user.user_metadata?.avatar_url && (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-5 h-5 rounded-full ring-1 ring-gold/30" />
                  )}
                  <NavLink to="/profile" className="text-[11px] text-zinc-300 hover:text-gold transition-colors">
                    {user.user_metadata?.full_name || 'Profile'}
                  </NavLink>
                  <button onClick={signOut} className="text-[10px] text-zinc-600 hover:text-red-400">Logout</button>
                </div>
              ) : (
                <button
                  onClick={signInWithDiscord}
                  className="pl-3 border-l border-[color:var(--color-border)] flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-[#5865F2] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  Login
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main nav bar */}
      <div className="bg-[color:var(--color-bg-raised)]/90 backdrop-blur-xl border-b border-[color:var(--color-border)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-gold/30 via-gold/15 to-transparent border border-gold/40 flex items-center justify-center shadow-[0_2px_12px_rgba(224,176,80,0.15)]">
              <span className="text-gold font-black text-sm tracking-tighter">AC</span>
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100 tracking-tight leading-none">
                Albion<span className="text-gold">Crafts</span>
              </div>
              <div className="text-[9px] text-zinc-500 tracking-[0.2em] uppercase mt-0.5">Market Tools</div>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0">
            <NavDropdown label="Market" groups={[
              {
                title: 'Trading',
                items: [
                  { to: '/flipper', label: 'Market Flipper' },
                  { to: '/bm-runner', label: 'BM Runner' },
                  { to: '/suggested', label: 'Suggested Crafts' },
                  { to: '/blackmarket', label: 'Black Market' },
                  { to: '/transmute', label: 'Transmutation' },
                  { to: '/capes', label: 'Cape Converter' },
                  { to: '/portfolio', label: 'Portfolio' },
                ],
              },
              {
                title: 'Prices',
                items: [
                  { to: '/prices', label: 'Prices' },
                  { to: '/history', label: 'Price History' },
                  { to: '/gold', label: 'Gold Prices' },
                ],
              },
            ]} />
            <NavDropdown label="Economy" groups={[
              {
                title: 'Crafting',
                items: [
                  { to: '/calculator', label: 'Craft Calculator' },
                  { to: '/refining', label: 'Refining' },
                  { to: '/compare', label: 'Compare Tiers' },
                  { to: '/cooking', label: 'Cooking' },
                  { to: '/butcher', label: 'Butcher' },
                  { to: '/mounts', label: 'Mount Breeding' },
                  { to: '/farmbreed', label: 'Farm & Breed' },
                ],
              },
              {
                title: 'Tools',
                items: [
                  { to: '/planner', label: 'Craft Planner' },
                  { to: '/craft-history', label: 'Craft History' },
                  { to: '/island', label: 'Island Planner' },
                  { to: '/fame', label: 'Crafting Fame' },
                  { to: '/journals', label: 'Journals' },
                  { to: '/focus', label: 'Focus Efficiency' },
                ],
              },
            ]} />
            <NavDropdown label="Community" groups={[
              {
                title: 'Search',
                items: [
                  { to: '/players', label: 'Players' },
                  { to: '/guilds', label: 'Guilds' },
                ],
              },
              {
                title: 'Activity',
                items: [
                  { to: '/killboard', label: 'Killboard' },
                  { to: '/top-fame', label: 'Top Kill Fame' },
                ],
              },
            ]} />
            <NavLink to="/database" className={linkClass}>Database</NavLink>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-zinc-400 hover:text-gold p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
