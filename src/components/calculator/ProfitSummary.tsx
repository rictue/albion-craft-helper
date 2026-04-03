import { useState } from 'react';
import type { CraftingResult } from '../../utils/profitCalculator';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import ItemIcon from '../common/ItemIcon';

interface Props {
  result: CraftingResult;
  onAddToPlan: () => void;
}

export default function ProfitSummary({ result, onAddToPlan }: Props) {
  const [added, setAdded] = useState(false);
  const { settings } = useAppStore();
  const isProfit = result.profit > 0;
  const hasData = result.sellPrice > 0;

  const handleAdd = () => {
    onAddToPlan();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Item card */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex items-center gap-3 mb-3">
          <ItemIcon itemId={result.itemId} size={56} quality={1} className="rounded-lg" />
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Sell Price <span className="text-gold normal-case">@ {settings.sellingLocation}</span>
            </div>
            {hasData ? (
              <div className="text-2xl font-bold text-slate-100">{formatSilver(result.sellPrice)}</div>
            ) : (
              <div className="text-lg font-bold text-yellow-500">No data</div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Investment</span>
            <span className="text-slate-300">{formatSilver(result.investment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Revenue</span>
            <span className="text-slate-300">{formatSilver(result.sellPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({(result.taxRate * 100).toFixed(1)}%)</span>
            <span className="text-red-400">-{formatSilver(result.tax)}</span>
          </div>
          {result.usageFee > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Usage Fee</span>
              <span className="text-red-400">-{formatSilver(result.usageFee)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profit card */}
      <div className={`rounded-xl border p-4 ${
        isProfit
          ? 'bg-green-950/30 border-green-800/30'
          : 'bg-red-950/30 border-red-800/30'
      }`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-300">Net Profit</span>
          <span className={`text-2xl font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
            {isProfit ? '+' : ''}{formatSilver(result.profit)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Margin</span>
          <span className={`text-sm font-semibold ${isProfit ? 'text-profit' : 'text-loss'}`}>
            {isProfit ? '+' : ''}{formatPercent(result.profitMargin)}
          </span>
        </div>
      </div>

      {/* Add to planner button */}
      <button
        onClick={handleAdd}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
          added
            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
            : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
        }`}
      >
        {added ? '+ Added!' : '+ Add to Planner'}
      </button>
    </div>
  );
}
