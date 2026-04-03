import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getServer, setServer } from '../../services/api';
import type { AlbionServer } from '../../services/api';

const SERVER_LABELS: Record<AlbionServer, string> = {
  europe: 'EU',
  west: 'US',
  east: 'Asia',
};

export default function Header() {
  const [server, setLocalServer] = useState<AlbionServer>(getServer());

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload(); // reload to fetch new prices
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gold/20 text-gold border border-gold/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-light'
    }`;

  return (
    <header className="border-b border-surface-lighter bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-lg font-bold text-gold tracking-wide">
              ALBION CRAFT HELPER
            </h1>
          </NavLink>
          <div className="flex gap-0.5 bg-surface-light rounded-lg p-0.5">
            {(Object.keys(SERVER_LABELS) as AlbionServer[]).map(s => (
              <button
                key={s}
                onClick={() => handleServer(s)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  server === s
                    ? 'bg-gold text-bg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {SERVER_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          <NavLink to="/" className={linkClass}>Calculator</NavLink>
          <NavLink to="/suggested" className={linkClass}>Suggested</NavLink>
          <NavLink to="/blackmarket" className={linkClass}>BM</NavLink>
          <NavLink to="/refining" className={linkClass}>Refining</NavLink>
          <NavLink to="/island" className={linkClass}>Island</NavLink>
          <NavLink to="/planner" className={linkClass}>Planner</NavLink>
          <NavLink to="/database" className={linkClass}>Database</NavLink>
        </nav>
      </div>
    </header>
  );
}
