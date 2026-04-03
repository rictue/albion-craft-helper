import type { Tier } from '../../types';

interface Props {
  value: Tier;
  onChange: (tier: Tier) => void;
}

const TIERS: Tier[] = [4, 5, 6, 7, 8];

const TIER_COLORS: Record<number, string> = {
  4: '#a1a1aa',
  5: '#ef4444',
  6: '#f97316',
  7: '#eab308',
  8: '#f0f0f0',
};

export default function TierSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5 block">Tier</label>
      <div className="flex gap-1">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
              value === t
                ? 'bg-zinc-700 ring-2 ring-gold/40 shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-500'
            }`}
            style={{ color: value === t ? TIER_COLORS[t] : undefined }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
