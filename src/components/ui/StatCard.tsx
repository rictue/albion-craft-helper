import type { ReactNode } from 'react';

type Tone = 'default' | 'profit' | 'loss' | 'gold';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  trend?: { value: string; up?: boolean };
}

const toneClass: Record<Tone, string> = {
  default: '',
  profit: 'is-profit',
  loss: 'is-loss',
  gold: 'is-gold',
};

const trendClass = (up?: boolean) =>
  up === undefined ? 'profit-pill is-flat' : up ? 'profit-pill is-up' : 'profit-pill is-down';

export default function StatCard({ label, value, hint, icon, tone = 'default', trend }: Props) {
  return (
    <div className={`stat-card ${toneClass[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold/70">
          {label}
        </div>
        {icon && <div className="text-gold/70">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-black tabular-nums text-zinc-50 leading-none">{value}</div>
        {trend && <span className={trendClass(trend.up)}>{trend.value}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-[#a89175] leading-snug">{hint}</div>}
    </div>
  );
}
