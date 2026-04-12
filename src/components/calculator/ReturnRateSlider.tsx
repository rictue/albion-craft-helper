import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { calculateReturnRate, calculateLPB } from '../../utils/returnRate';
import { getMastery, setMastery, getItemSpec, setItemSpec } from '../../data/specs';
import { CITIES } from '../../data/cities';
import { formatPercent } from '../../utils/formatters';

interface Props {
  subcategory: string;
  baseId: string;
  itemName: string;
}

export default function ReturnRateSlider({ subcategory, baseId, itemName }: Props) {
  const { settings, updateSettings } = useAppStore();

  const [masteryInput, setMasteryInput] = useState(() => getMastery(subcategory));
  const [specInput, setSpecInput] = useState(() => getItemSpec(baseId));

  // Reset when item changes
  useEffect(() => {
    setMasteryInput(getMastery(subcategory));
    setSpecInput(getItemSpec(baseId));
  }, [subcategory, baseId]);

  // Auto-clear manual RR override when city, focus, or item category changes
  // so the computed rate reflects the new context
  useEffect(() => {
    if (settings.returnRateOverride !== null) {
      updateSettings({ returnRateOverride: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.craftingCity, settings.useFocus, subcategory]);

  // Save to localStorage on change
  const handleMastery = (v: number) => {
    const val = Math.max(0, Math.min(120, v));
    setMasteryInput(val);
    setMastery(subcategory, val);
  };

  const handleSpec = (v: number) => {
    const val = Math.max(0, Math.min(120, v));
    setSpecInput(val);
    setItemSpec(baseId, val);
  };

  // Spec does NOT affect return rate - only focus cost
  const bonusLPB = 0;

  const autoRate = useMemo(
    () => calculateReturnRate(settings.craftingCity, subcategory, settings.useFocus, bonusLPB),
    [settings.craftingCity, subcategory, settings.useFocus, bonusLPB],
  );

  const lpb = useMemo(
    () => calculateLPB(settings.craftingCity, subcategory, settings.useFocus, bonusLPB),
    [settings.craftingCity, subcategory, settings.useFocus, bonusLPB],
  );

  const isOverride = settings.returnRateOverride !== null;
  const currentRate = isOverride ? settings.returnRateOverride! / 100 : autoRate;

  const cityInfo = CITIES.find(c => c.id === settings.craftingCity);
  const hasBonus = cityInfo?.specializations.includes(subcategory) || false;

  // Subcategory display name
  const subName = subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace(/_/g, ' ');

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Return Rate</h3>
        {isOverride && (
          <button
            onClick={() => updateSettings({ returnRateOverride: null })}
            className="text-xs text-gold hover:text-gold-light transition-colors"
          >
            Reset to Auto
          </button>
        )}
      </div>

      {/* Spec inputs */}
      <div className="flex gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">{subName} Mastery:</label>
          <input
            type="number" min={0} max={120} value={masteryInput}
            onChange={(e) => handleMastery(parseInt(e.target.value) || 0)}
            className="w-14 bg-surface-light border border-surface-lighter rounded px-1.5 py-1 text-xs text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-purple-400">{itemName} Spec:</label>
          <input
            type="number" min={0} max={120} value={specInput}
            onChange={(e) => handleSpec(parseInt(e.target.value) || 0)}
            className="w-14 bg-surface-light border border-surface-lighter rounded px-1.5 py-1 text-xs text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>
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
        <span className="text-xs px-2 py-0.5 rounded bg-surface-light text-zinc-400">
          Base: 15.3%
        </span>
        {hasBonus && (
          <span
            className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400"
            title="Royal city specialization bonus — flat +9.6% RR"
          >
            City +9.6%
          </span>
        )}
        {settings.useFocus && (
          <span
            className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400"
            title="Focus crafting: +59 LPB ≈ +28% effective RR"
          >
            Focus (+59 LPB)
          </span>
        )}
        {specInput > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400" title="Spec reduces focus cost, not return rate">
            Spec {specInput} (focus only)
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded bg-surface-lighter text-zinc-300">
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
