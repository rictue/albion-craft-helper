import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
// Note: dropdowns close via the explicit onItemClick callback wired into
// every mega dropdown link, plus onMouseLeave on the panel wrapper. We don't
// need a location-change effect — that would only matter for browser
// back/forward, which closes via outside-click anyway.
import { HEADER, ACCOUNT_DROPDOWN } from './navData';
import type { HeaderEntry } from './navData';
import MegaDropdown from './MegaDropdown';
import MobileDrawer from './MobileDrawer';
import { getServer, setServer } from '../../services/api';
import type { AlbionServer } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import { ROYAL_CITIES } from '../../data/constants';
import {
  IconMenu,
  IconSearch,
  IconDiscord,
  IconChevron,
} from './navIcons';

const SERVER_LABELS: Record<AlbionServer, string> = {
  europe: 'Europe',
  west:   'Americas',
  east:   'Asia',
};

function HeaderItem({
  entry,
  open,
  onOpen,
  onClose,
}: {
  entry: HeaderEntry;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const location = useLocation();

  if (entry.kind === 'link') {
    return (
      <NavLink
        to={entry.to}
        end={entry.to === '/'}
        className={({ isActive }) =>
          `header-link ${isActive ? 'is-active' : ''}`
        }
      >
        {entry.label}
      </NavLink>
    );
  }

  const anyChildActive = entry.sections.some(s => s.items.some(i => i.to && i.to === location.pathname));

  return (
    <div className="relative">
      <button
        onClick={open ? onClose : onOpen}
        onMouseEnter={onOpen}
        className={`header-link inline-flex items-center gap-1 ${anyChildActive || open ? 'is-active' : ''}`}
      >
        {entry.label}
        <span className={`opacity-70 transition-transform ${open ? 'rotate-90' : ''}`}>
          {IconChevron}
        </span>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 pt-2 z-50"
          onMouseLeave={onClose}
        >
          <MegaDropdown
            sections={entry.sections}
            minWidth={entry.minWidth}
            onItemClick={onClose}
          />
        </div>
      )}
    </div>
  );
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute top-full right-0 pt-2 z-50"
      onMouseLeave={onClose}
    >
      <MegaDropdown
        sections={ACCOUNT_DROPDOWN}
        minWidth={500}
        onItemClick={onClose}
      />
    </div>
  );
}

export default function TopNav() {
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const { user, loading, signInWithDiscord, signOut } = useAuth();
  const craftingCity = useAppStore(s => s.settings.craftingCity);
  const updateSettings = useAppStore(s => s.updateSettings);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close active mega on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setActiveMega(null);
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // location is only referenced inside HeaderItem (via useLocation) — no
  // top-level use needed here.

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 guild-topbar" ref={containerRef}>
      {/* Top utility strip */}
      <div className="border-b border-[color:var(--color-border)]/60 hidden md:block">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-7 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] font-bold">
          <div className="flex items-center gap-3 text-zinc-500">
            <span>Albion Online Companion</span>
            <span className="text-zinc-700">·</span>
            <span className="text-gold/55">Unofficial — not affiliated with Sandbox Interactive</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600">Server</span>
            <div className="flex items-center gap-0.5">
              {(Object.keys(SERVER_LABELS) as AlbionServer[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleServer(s)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    server === s
                      ? 'text-gold-light bg-gold/15'
                      : 'text-zinc-600 hover:text-gold'
                  }`}
                >
                  {SERVER_LABELS[s]}
                </button>
              ))}
            </div>
            <span className="text-zinc-700 mx-1">·</span>
            <span className="text-zinc-600">Market</span>
            <select
              value={craftingCity}
              onChange={e => updateSettings({ craftingCity: e.target.value })}
              className="bg-transparent text-gold-light/90 font-bold tracking-wider focus:outline-none cursor-pointer text-[10px] uppercase"
            >
              {ROYAL_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Black Market">Black Market</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary header */}
      <div className="max-w-[1800px] mx-auto px-3 lg:px-6 h-[3.5rem] flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="crest h-9 w-9 flex items-center justify-center shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
            <span className="text-gold-light font-black text-[11px] tracking-tighter">AC</span>
          </div>
          <div className="hidden sm:block">
            <div className="medieval-title text-[15px] leading-none">
              Albion<span className="text-gold-light">Crafts</span>
            </div>
            <div className="text-[8.5px] tracking-[0.24em] uppercase text-gold/55 mt-0.5">
              Companion
            </div>
          </div>
        </Link>

        {/* Desktop nav — the full flat row needs ~1280px+ for all 13 tabs;
            below xl we hand off to the hamburger drawer (which lists them
            all) instead of letting the row collide with the search/account
            cluster. No overflow-hidden here — the mega dropdowns must escape
            the nav box. */}
        <nav className="hidden xl:flex items-center gap-0.5 flex-1 min-w-0">
          {HEADER.map(entry => (
            <HeaderItem
              key={entry.label}
              entry={entry}
              open={entry.kind === 'mega' && activeMega === entry.label}
              onOpen={() => entry.kind === 'mega' && setActiveMega(entry.label)}
              onClose={() => setActiveMega(null)}
            />
          ))}
        </nav>

        {/* Right: search + auth — shrink-0 so it always keeps its size and
            can never be overlapped by the nav row. */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)] text-[11px] text-zinc-500 hover:text-gold transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open search"
          >
            <span className="text-gold/60">{IconSearch}</span>
            <span className="hidden 2xl:inline">Search tools…</span>
            <span className="hidden 2xl:inline-block ml-2 px-1.5 py-0.5 text-[9px] tracking-wider font-bold bg-[color:var(--color-bg-overlay)] rounded">⌘K</span>
          </button>

          <div className="relative" onMouseLeave={() => setAccountOpen(false)}>
            {!loading && user ? (
              <button
                onMouseEnter={() => setAccountOpen(true)}
                onClick={() => setAccountOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[color:var(--color-bg-overlay)] transition-colors"
              >
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full ring-1 ring-gold/40" />
                )}
                <span className="hidden md:inline text-[12px] text-zinc-200 font-semibold">
                  {user.user_metadata?.full_name?.split(' ')[0] || 'Profile'}
                </span>
                <span className={`text-zinc-500 transition-transform ${accountOpen ? 'rotate-180' : ''}`}>
                  {IconChevron}
                </span>
              </button>
            ) : !loading ? (
              <button
                onClick={signInWithDiscord}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[11px] font-bold uppercase tracking-wider text-[#cdd2ff] transition-colors"
              >
                <span>{IconDiscord}</span>
                Login
              </button>
            ) : null}

            {user && accountOpen && (
              <AccountMenu onClose={() => setAccountOpen(false)} />
            )}
          </div>

          {user && (
            <button
              onClick={signOut}
              className="hidden md:block text-[10px] text-zinc-600 hover:text-red-400 px-1"
            >
              Logout
            </button>
          )}

          {/* Menu trigger — shown until xl, where the full flat nav fits */}
          <button
            onClick={() => setMobileOpen(true)}
            className="xl:hidden p-2 rounded-md text-zinc-300 hover:text-gold hover:bg-[color:var(--color-bg-overlay)]"
            aria-label="Open menu"
          >
            {IconMenu}
          </button>
        </div>
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
