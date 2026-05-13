import { useId } from 'react';

interface Props {
  label?: string;
  value: number | '';
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  placeholder,
  disabled,
  hint,
  className = '',
}: Props) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.18em] font-bold text-gold/70 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value === '' || Number.isNaN(value) ? '' : value}
          onChange={e => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(0);
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            let next = n;
            if (min !== undefined) next = Math.max(min, next);
            if (max !== undefined) next = Math.min(max, next);
            onChange(next);
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-md bg-[color:var(--color-bg-raised)] border border-[color:var(--color-border)] px-3 py-2 text-sm text-zinc-100 tabular-nums focus:border-gold focus:outline-none transition-colors ${suffix ? 'pr-12' : ''} ${disabled ? 'opacity-50' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider font-bold text-gold/55 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[10px] text-[#8a7b62]">{hint}</div>}
    </div>
  );
}
