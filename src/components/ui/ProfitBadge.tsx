import { formatSilver, formatPercent } from '../../utils/formatters';

interface Props {
  amount: number;
  /** Optional secondary value rendered as percent margin. */
  percent?: number;
  /** When true, show a leading + on positive values. */
  signed?: boolean;
  size?: 'sm' | 'md';
}

export default function ProfitBadge({ amount, percent, signed = true, size = 'sm' }: Props) {
  const up = amount > 0;
  const down = amount < 0;
  const cls = up ? 'is-up' : down ? 'is-down' : 'is-flat';
  const sign = signed && amount > 0 ? '+' : '';
  const px = size === 'md' ? 'px-2 py-1 text-sm' : '';
  return (
    <span className={`profit-pill ${cls} ${px}`}>
      <span>{sign}{formatSilver(amount)}</span>
      {percent !== undefined && (
        <span className="opacity-70 text-[10px]">({formatPercent(percent)})</span>
      )}
    </span>
  );
}
