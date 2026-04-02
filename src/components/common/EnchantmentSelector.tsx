import type { Enchantment } from '../../types';
import { ENCHANTMENT_COLORS, ENCHANTMENT_NAMES } from '../../data/materials';

interface Props {
  value: Enchantment;
  onChange: (enchant: Enchantment) => void;
}

const ENCHANTS: Enchantment[] = [0, 1, 2, 3, 4];

export default function EnchantmentSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Enchant</label>
      <div className="flex gap-1">
        {ENCHANTS.map((e) => (
          <button
            key={e}
            onClick={() => onChange(e)}
            title={ENCHANTMENT_NAMES[e]}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
              value === e
                ? 'bg-surface-lighter ring-2 ring-gold/50'
                : 'bg-surface-light hover:bg-surface-lighter'
            }`}
            style={{ color: value === e ? ENCHANTMENT_COLORS[e] : '#94a3b8' }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
