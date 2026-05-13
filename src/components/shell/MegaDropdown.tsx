import { Link } from 'react-router-dom';
import type { Badge, MegaItem, MegaSection } from './navData';

interface Props {
  sections: MegaSection[];
  minWidth?: number;
  onItemClick?: () => void;
}

const BADGE_STYLES: Record<Badge, string> = {
  NEW:     'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
  HOT:     'text-rose-300 bg-rose-500/15 border-rose-500/35',
  POPULAR: 'text-gold-light bg-gold/20 border-gold/45',
  SOON:    'text-zinc-400 bg-zinc-700/40 border-zinc-600/50',
  BETA:    'text-sky-300 bg-sky-500/15 border-sky-500/35',
};

function ItemBadge({ badge }: { badge: Badge }) {
  return (
    <span className={`text-[8.5px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ${BADGE_STYLES[badge]}`}>
      {badge}
    </span>
  );
}

function MegaItemRow({ item, onClick }: { item: MegaItem; onClick?: () => void }) {
  const inner = (
    <>
      <div className={`icon-frame h-9 w-9 rounded-md shrink-0 ${item.disabled ? 'opacity-50' : 'text-gold-light'}`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-bold leading-tight ${item.disabled ? 'text-zinc-500' : 'text-zinc-100'}`}>
            {item.label}
          </span>
          {item.badge && <ItemBadge badge={item.badge} />}
        </div>
        <div className={`mt-0.5 text-[11px] leading-snug ${item.disabled ? 'text-zinc-600' : 'text-[#a89175]'}`}>
          {item.blurb}
        </div>
      </div>
    </>
  );

  const baseCls = 'flex items-start gap-2.5 p-2 rounded-md transition-colors border border-transparent';
  if (item.disabled || !item.to) {
    return <div className={`${baseCls} cursor-not-allowed`}>{inner}</div>;
  }
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`${baseCls} hover:bg-[rgba(214,166,74,0.07)] hover:border-[color:var(--color-border)]`}
    >
      {inner}
    </Link>
  );
}

export default function MegaDropdown({ sections, minWidth = 720, onItemClick }: Props) {
  return (
    <div
      className="medieval-panel backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.55)] p-4 animate-fade-in"
      style={{ minWidth }}
    >
      <div
        className="grid gap-x-3 gap-y-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(sections.length, 4)}, minmax(0, 1fr))` }}
      >
        {sections.map(section => (
          <div key={section.title}>
            <div className="medieval-title-sm pb-2 mb-1.5 border-b border-[color:var(--color-border)]">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <MegaItemRow key={item.label} item={item} onClick={onItemClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
