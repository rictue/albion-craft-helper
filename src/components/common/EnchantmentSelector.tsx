import type { Enchantment } from '../../types';

interface Props {
  value: Enchantment;
  onChange: (enchant: Enchantment) => void;
}

const ENCHANTS: Enchantment[] = [0, 1, 2, 3, 4];

const ENCHANT_COLORS: Record<number, string> = {
  0: '#a1a1aa',
  1: '#22c55e',
  2: '#3b82f6',
  3: '#a855f7',
  4: '#eab308',
};

const ENCHANT_NAMES: Record<number, string> = {
  0: 'Normal',
  1: 'Uncommon',
  2: 'Rare',
  3: 'Epic',
  4: 'Legendary',
};

export default function EnchantmentSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5 block">Enchant</label>
      <div className="flex gap-1">
        {ENCHANTS.map((e) => (
          <button
            key={e}
            onClick={() => onChange(e)}
            title={ENCHANT_NAMES[e]}
            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
              value === e
                ? 'bg-zinc-700 ring-2 ring-gold/40 shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-500'
            }`}
            style={{ color: value === e ? ENCHANT_COLORS[e] : undefined }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
