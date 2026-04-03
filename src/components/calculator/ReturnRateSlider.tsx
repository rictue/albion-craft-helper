import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { calculateReturnRate, calculateLPB } from '../../utils/returnRate';
import { getSpecBonus, DEFAULT_CRAFT_SPECS } from '../../data/specs';
import { CITIES } from '../../data/cities';
import { formatPercent } from '../../utils/formatters';

interface Props {
  subcategory: string;
  baseId: string;
}

export default function ReturnRateSlider({ subcategory, baseId }: Props) {
  const { settings, updateSettings } = useAppStore();

  const spec = useMemo(
    () => getSpecBonus(DEFAULT_CRAFT_SPECS, subcategory, baseId),
    [subcategory, baseId],
  );

  const autoRate = useMemo(
    () => calculateReturnRate(settings.craftingCity, subcategory, settings.useFocus, spec.bonusLPB),
    [settings.craftingCity, subcategory, settings.useFocus, spec.bonusLPB],
  );

  const lpb = useMemo(
    () => calculateLPB(settings.craftingCity, subcategory, settings.useFocus, spec.bonusLPB),
    [settings.craftingCity, subcategory, settings.useFocus, spec.bonusLPB],
  );

  const isOverride = settings.returnRateOverride !== null;
  const currentRate = isOverride ? settings.returnRateOverride! / 100 : autoRate;

  const cityInfo = CITIES.find(c => c.id === settings.craftingCity);
  const hasBonus = cityInfo?.specializations.includes(subcategory) || false;

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider">Return Rate</h3>
        {isOverride && (
          <button
            onClick={() => updateSettings({ returnRateOverride: null })}
            className="text-xs text-gold hover:text-gold-light transition-colors"
          >
            Reset to Auto
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={70}
          step={0.1}
          value={currentRate * 100}
          onChange={(e) => updateSettings({ returnRateOverride: parseFloat(e.target.value) })}
          className="flex-1"
        />
        <span className="text-lg font-bold text-gold min-w-[60px] text-right">
          {formatPercent(currentRate * 100)}
        </span>
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded bg-surface-light text-slate-400">
          Base: 15.3%
        </span>
        {hasBonus && (
          <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">
            City +15%
          </span>
        )}
        {settings.useFocus && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">
            Focus +59%
          </span>
        )}
        {spec.specLevel > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">
            Spec {spec.specLevel} (+{spec.bonusLPB.toFixed(1)}%)
          </span>
        )}
        {spec.masteryLevel > 0 && spec.specLevel === 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-orange-900/30 text-orange-400">
            Mastery {spec.masteryLevel}
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded bg-surface-lighter text-slate-300">
          LPB: {lpb.toFixed(1)}%
        </span>
        {!isOverride && (
          <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold">
            Auto
          </span>
        )}
      </div>
    </div>
  );
}
