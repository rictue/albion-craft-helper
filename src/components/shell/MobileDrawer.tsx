import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HEADER, ACCOUNT_DROPDOWN } from './navData';
import type { MegaSection } from './navData';
import { IconClose, IconChevron, IconSearch } from './navIcons';

interface Props {
  open: boolean;
  onClose: () => void;
}

function AccordionGroup({
  title,
  sections,
  onItemClick,
  defaultOpen,
}: {
  title: string;
  sections: MegaSection[];
  onItemClick?: () => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-[color:var(--color-border)]">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-[11px] uppercase tracking-[0.18em] font-bold text-gold/75"
      >
        {title}
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>{IconChevron}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {sections.map(section => (
            <div key={section.title}>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2 mb-1">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  if (item.disabled || !item.to) {
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 px-2 py-2 rounded-md text-[12px] text-zinc-600"
                      >
                        <span className="opacity-50 shrink-0">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-[8px] font-bold tracking-wider text-zinc-500">{item.badge}</span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={onItemClick}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2 py-2 rounded-md text-[12px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-gold/15 text-gold-light'
                            : 'text-zinc-200 hover:bg-[color:var(--color-bg-overlay)] hover:text-gold'
                        }`
                      }
                    >
                      <span className="opacity-90 shrink-0 text-gold/80">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] font-bold tracking-wider text-emerald-300">{item.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileDrawer({ open, onClose }: Props) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  const directLinks = HEADER.filter(h => h.kind === 'link');

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-[88%] max-w-[360px] guild-sidebar z-50 animate-fade-in flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
          <span className="medieval-title-sm">Menu</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-gold p-1"
            aria-label="Close menu"
          >
            {IconClose}
          </button>
        </div>

        <div className="px-3 py-3 border-b border-[color:var(--color-border)]">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gold/60">{IconSearch}</span>
            <input
              type="search"
              placeholder="Search tools…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-2 rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)] text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Direct links */}
          <div className="px-3 py-3 border-b border-[color:var(--color-border)] space-y-0.5">
            {directLinks.map(l => l.kind === 'link' && (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={onClose}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `guild-nav-row ${isActive ? 'is-active' : ''}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <AccordionGroup title="Account" sections={ACCOUNT_DROPDOWN} onItemClick={onClose} />
        </div>

        <div className="px-4 py-3 border-t border-[color:var(--color-border)] text-[10px] text-zinc-600 leading-relaxed">
          Albioncrafts · Unofficial Albion Online companion
        </div>
      </aside>
    </>
  );
}
