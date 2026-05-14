/**
 * Compact "what does this craft actually net under different fee setups"
 * card. Shows the four conventional Albion marketplace scenarios side by
 * side so the user can see whether they're picking the right tax/order
 * combination.
 *
 *   Prem instant       — Premium account, instant sell (buy order)
 *   Prem sell order    — Premium account, posting a sell order
 *   No prem instant    — Non-premium, instant sell
 *   No prem sell order — Non-premium, posting a sell order
 *
 * Profit = sellPrice × saleMult − (costBeforeFees × entryMult + fixedFees).
 */

import { formatSilver } from '../../utils/formatters';
import { FEE_SCENARIOS, profitForScenario } from '../../utils/marketFees';

interface Props {
  /** Net silver received per unit at full sell price (no tax applied yet). */
  sellPrice: number;
  /** Per-unit cost subject to entry-side setup fee (raw materials, etc.). */
  costBeforeFees: number;
  /** Per-unit cost that isn't subject to any fee (station fee, journals). */
  fixedFees?: number;
  /** Label shown on the panel (e.g. "Per plank", "Per item", "Per meal"). */
  unitLabel?: string;
  /** Optional title — default is "Fee reality check". */
  title?: string;
}

export default function FeeRealityCheck({
  sellPrice,
  costBeforeFees,
  fixedFees = 0,
  unitLabel = 'Per unit',
  title = 'Fee reality check',
}: Props) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)]/60 p-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-gold/70">
          {title}
        </div>
        <div className="text-[9.5px] uppercase tracking-[0.16em] font-bold text-zinc-600">
          {unitLabel}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {FEE_SCENARIOS.map(scenario => {
          const profit = profitForScenario({ sellPrice, costBeforeFees, fixedFees }, scenario);
          const isLoss = profit < 0;
          return (
            <div
              key={scenario.label}
              className="flex items-center justify-between gap-2 rounded border border-white/8 bg-[color:var(--color-bg)]/60 px-2 py-1"
            >
              <span className="truncate text-[11px] text-zinc-400">{scenario.label}</span>
              <span
                className={`font-black tabular-nums text-[12px] ${
                  isLoss ? 'text-[color:var(--color-loss)]' : 'text-[color:var(--color-profit)]'
                }`}
              >
                {profit > 0 ? '+' : ''}
                {formatSilver(profit)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
