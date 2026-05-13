import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SIDEBAR_SECTIONS } from './sidebarConfig';
import type { NavItem } from './sidebarConfig';
import { IconSearch, IconClose } from './navIcons';

interface Props {
  /** Mobile drawer open state. Desktop sidebar is always visible. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      end={item.to === '/'}
      className={({ isActive }) => `guild-nav-row ${isActive ? 'is-active' : ''}`}
    >
      <span className="opacity-90 shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const sections = q
    ? SIDEBAR_SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.label.toLowerCase().includes(q) ||
          (i.hint?.toLowerCase().includes(q) ?? false)
        ),
      })).filter(s => s.items.length > 0)
    : SIDEBAR_SECTIONS;

  return (
    <div className="relative h-full flex flex-col">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold/55">{IconSearch}</span>
          <input
            type="search"
            placeholder="Find a tool…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)] text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {sections.map(section => (
          <div key={section.title} className="mb-1">
            <div className="guild-nav-section">{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavRow key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-zinc-600">
            No tools match "{query}"
          </div>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-[color:var(--color-border)] text-[10px] text-zinc-600 leading-relaxed">
        <div className="text-gold/65 font-bold tracking-[0.16em] uppercase text-[9px] mb-0.5">
          Albioncrafts
        </div>
        Unofficial companion tool. Not affiliated with Sandbox Interactive or Albion Online.
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }: Props) {
  return (
    <>
      {/* Desktop sidebar — always visible above lg */}
      <aside className="hidden lg:flex relative flex-col guild-sidebar w-[248px] shrink-0 h-[calc(100vh-3.25rem)] sticky top-[3.25rem]">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onMobileClose} />
          <aside className="lg:hidden fixed top-0 left-0 h-full w-[270px] guild-sidebar z-50 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[color:var(--color-border)]">
              <span className="medieval-title-sm">Guild Menu</span>
              <button
                onClick={onMobileClose}
                className="text-zinc-400 hover:text-gold p-1"
                aria-label="Close menu"
              >
                {IconClose}
              </button>
            </div>
            <SidebarContent onNavigate={onMobileClose} />
          </aside>
        </>
      )}
    </>
  );
}
