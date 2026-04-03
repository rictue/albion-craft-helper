import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getServer, setServer } from '../../services/api';
import type { AlbionServer } from '../../services/api';

const SERVER_LABELS: Record<AlbionServer, string> = {
  europe: 'EU',
  west: 'US',
  east: 'Asia',
};

interface DropdownItem {
  to: string;
  label: string;
}

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isActive = items.some(i => i.to === location.pathname);

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
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
          isActive
            ? 'bg-gold/15 text-gold'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
        }`}
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50 animate-fade-in">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm transition-colors ${
                  isActive ? 'text-gold bg-gold/10' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const links = [
    { to: '/', label: 'Calculator' },
    { to: '/suggested', label: 'Suggested Crafts' },
    { to: '/blackmarket', label: 'Black Market' },
    { to: '/refining', label: 'Refining' },
    { to: '/island', label: 'Island Planner' },
    { to: '/planner', label: 'Craft Planner' },
    { to: '/database', label: 'Database' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-64 bg-zinc-900 border-l border-zinc-700 z-50 animate-fade-in p-4">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-bold text-gold">Menu</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-lg">&#10005;</button>
        </div>
        <nav className="space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-gold/15 text-gold' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}

export default function Header() {
  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleServer = (s: AlbionServer) => {
    setServer(s);
    setLocalServer(s);
    window.location.reload();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gold/15 text-gold'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
    }`;

  return (
    <header className="border-b border-border bg-bg-raised/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavLink to="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-base font-bold text-gold tracking-wide">
              ALBIONCRAFTS
            </h1>
          </NavLink>
          <div className="flex gap-0.5 bg-zinc-800 rounded-md p-0.5">
            {(Object.keys(SERVER_LABELS) as AlbionServer[]).map(s => (
              <button
                key={s}
                onClick={() => handleServer(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  server === s
                    ? 'bg-gold text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {SERVER_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavLink to="/" className={linkClass}>Calculator</NavLink>
          <NavDropdown label="Market" items={[
            { to: '/suggested', label: 'Suggested Crafts' },
            { to: '/blackmarket', label: 'Black Market' },
          ]} />
          <NavDropdown label="Tools" items={[
            { to: '/refining', label: 'Refining' },
            { to: '/island', label: 'Island Planner' },
            { to: '/planner', label: 'Craft Planner' },
          ]} />
          <NavLink to="/database" className={linkClass}>Database</NavLink>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
