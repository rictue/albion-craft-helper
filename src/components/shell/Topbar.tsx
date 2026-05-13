import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getServer, setServer } from '../../services/api';
import type { AlbionServer } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import { ROYAL_CITIES } from '../../data/constants';
import ServerTime from '../common/ServerTime';
import { IconMenu, IconDiscord } from './navIcons';

const SERVER_LABELS: Record<AlbionServer, string> = {
  europe: 'Europe',
  west:   'Americas',
  east:   'Asia',
};

interface Props {
  onOpenMobileSidebar: () => void;
}

export default function Topbar({ onOpenMobileSidebar }: Props) {
  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const { user, loading, signInWithDiscord, signOut } = useAuth();
  const craftingCity = useAppStore(s => s.settings.craftingCity);
  const updateSettings = useAppStore(s => s.updateSettings);

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload();
  };

  return (
    <header className="guild-topbar sticky top-0 z-40 h-[3.25rem]">
      <div className="h-full px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: logo + mobile menu */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-md text-zinc-300 hover:text-gold hover:bg-[color:var(--color-bg-overlay)]"
            aria-label="Open navigation"
          >
            {IconMenu}
          </button>
          <Link to="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-95">
            <div className="crest h-9 w-9 flex items-center justify-center shadow-[0_6px_14px_rgba(0,0,0,0.4)] shrink-0">
              <span className="text-gold-light font-black text-[11px] tracking-tighter">AC</span>
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="medieval-title text-base leading-none truncate">
                Albion<span className="text-gold-light">Crafts</span>
              </div>
              <div className="text-[9px] tracking-[0.22em] uppercase text-gold/55 mt-0.5">
                Royal Market Hall
              </div>
            </div>
          </Link>
        </div>

        {/* Center: city + server time (md+) */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center min-w-0">
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.18em]">
            <ServerTime />
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)]">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-gold/65">Market</span>
            <select
              value={craftingCity}
              onChange={e => updateSettings({ craftingCity: e.target.value })}
              className="bg-transparent text-[11px] text-zinc-200 font-semibold tracking-wide focus:outline-none cursor-pointer"
            >
              {ROYAL_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Black Market">Black Market</option>
            </select>
          </div>
        </div>

        {/* Right: server selector + auth */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)]">
            {(Object.keys(SERVER_LABELS) as AlbionServer[]).map(s => (
              <button
                key={s}
                onClick={() => handleServer(s)}
                className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded transition-colors ${
                  server === s
                    ? 'text-gold-light bg-gold/15'
                    : 'text-zinc-500 hover:text-gold'
                }`}
              >
                {SERVER_LABELS[s]}
              </button>
            ))}
          </div>

          {!loading && (user ? (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-[color:var(--color-border)]">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full ring-1 ring-gold/35" />
              )}
              <Link to="/profile" className="text-[11px] text-zinc-200 hover:text-gold hidden sm:inline">
                {user.user_metadata?.full_name || 'Profile'}
              </Link>
              <button onClick={signOut} className="text-[10px] text-zinc-600 hover:text-red-400 px-1">
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithDiscord}
              className="pl-2 sm:pl-3 sm:border-l border-[color:var(--color-border)] flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 hover:text-[#5865F2] transition-colors"
              aria-label="Login with Discord"
            >
              <span className="text-[#5865F2]">{IconDiscord}</span>
              <span className="hidden sm:inline">Login</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
