import type { DecisionLevel } from '../../utils/decision';

const STYLES: Record<DecisionLevel, string> = {
  Strong:   'border-emerald-400/70 bg-emerald-500/20 text-emerald-300',
  Playable: 'border-gold/70 bg-gold/20 text-gold-light',
  Thin:     'border-sky-300/50 bg-sky-500/15 text-sky-200',
  Loss:     'border-rose-400/70 bg-rose-500/20 text-rose-300',
};

interface Props {
  decision: DecisionLevel;
  size?: 'sm' | 'md';
}

export default function DecisionBadge({ decision, size = 'sm' }: Props) {
  const sizing = size === 'md'
    ? 'min-w-24 px-3.5 py-1.5 text-[13px]'
    : 'min-w-20 px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-bold uppercase tracking-[0.12em] ${sizing} ${STYLES[decision]}`}
    >
      {decision}
    </span>
  );
}
