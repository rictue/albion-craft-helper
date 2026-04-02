import type { Tier } from '../../types';
import { TIER_COLORS } from '../../data/materials';

interface Props {
  value: Tier;
  onChange: (tier: Tier) => void;
}

const TIERS: Tier[] = [4, 5, 6, 7, 8];

export default function TierSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Tier</label>
      <div className="flex gap-1">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
              value === t
                ? 'bg-surface-lighter ring-2 ring-gold/50'
                : 'bg-surface-light hover:bg-surface-lighter'
            }`}
            style={{ color: value === t ? TIER_COLORS[t] : '#94a3b8' }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
