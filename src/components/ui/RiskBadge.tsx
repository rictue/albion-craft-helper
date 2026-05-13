export type RiskLevel = 'low' | 'medium' | 'high';

interface Props {
  level: RiskLevel;
  /** What's being scored — risk, effort, etc. */
  label?: string;
}

const STYLES: Record<RiskLevel, string> = {
  low:    'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  high:   'text-rose-300 bg-rose-500/10 border-rose-500/30',
};

export default function RiskBadge({ level, label }: Props) {
  return (
    <span className={`chip ${STYLES[level]}`}>
      {label && <span className="opacity-70 mr-0.5">{label}</span>}
      {level}
    </span>
  );
}
