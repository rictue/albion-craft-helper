import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  to: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  /** Visual emphasis level. */
  prominent?: boolean;
}

export default function ToolCard({ to, title, description, icon, badge, prominent }: Props) {
  return (
    <Link
      to={to}
      className={`tool-card group flex flex-col gap-3 p-4 rounded-lg transition-all hover:-translate-y-0.5 ${
        prominent ? 'border-gold/55 shadow-[0_14px_36px_rgba(214,166,74,0.12)]' : ''
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        {icon && <div className="icon-frame h-11 w-11 rounded-md text-gold-light">{icon}</div>}
        {badge}
      </div>
      <div className="relative z-10">
        <div className="medieval-title text-base leading-tight">{title}</div>
        {description && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#bba485]">{description}</p>
        )}
      </div>
      <div className="relative z-10 mt-auto flex items-center justify-end">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold/65 group-hover:text-gold-light transition-colors">
          Open &rsaquo;
        </span>
      </div>
    </Link>
  );
}
