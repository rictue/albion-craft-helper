import { useMemo, useState } from 'react';
import type { CraftingResult } from '../../utils/profitCalculator';
import type { MarketPrice } from '../../types';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import { useAppStore } from '../../store/appStore';
import ItemIcon from '../common/ItemIcon';

interface Props {
  result: CraftingResult;
  prices: MarketPrice[];
}

export default function RecipeDisplay({ result, prices }: Props) {
  const { customPrices, setCustomPrice, removeCustomPrice } = useAppStore();
  // Which row is currently in 'edit price' mode
  const [editingId, setEditingId] = useState<string | null>(null);
  // Draft value being typed before the user commits it
  const [draft, setDraft] = useState<string>('');

  // Find cheapest city for each material
  const cheapestCities = useMemo(() => {
    const map = new Map<string, { city: string; price: number }>();

    for (const mat of result.materials) {
      let best: { city: string; price: number } | null = null;
      for (const city of CITIES) {
        if (city.id === 'Black Market') continue;
        for (const p of prices) {
          if (p.item_id !== mat.materialId || p.city !== city.id) continue;
          if (p.sell_price_min > 0 && (!best || p.sell_price_min < best.price)) {
            best = { city: city.name, price: p.sell_price_min };
          }
        }
      }
      if (best) map.set(mat.materialId, best);
    }

    if (result.artifactCost) {
      let best: { city: string; price: number } | null = null;
      for (const city of CITIES) {
        if (city.id === 'Black Market') continue;
        for (const p of prices) {
          if (p.item_id !== result.artifactCost!.id || p.city !== city.id) continue;
          if (p.sell_price_min > 0 && (!best || p.sell_price_min < best.price)) {
            best = { city: city.name, price: p.sell_price_min };
          }
        }
      }
      if (best) map.set(result.artifactCost.id, best);
    }

    return map;
  }, [result.materials, result.artifactCost, prices]);

  // Match the 'itemId:' prefix scheme used by priceMap's custom-price override
  const customKey = (itemId: string) => `${itemId}:custom`;
  const getOverride = (itemId: string) =>
    customPrices[customKey(itemId)] ?? null;

  const startEdit = (itemId: string, currentUnitPrice: number) => {
    setEditingId(itemId);
    const existing = getOverride(itemId);
    setDraft(existing != null ? String(existing) : (currentUnitPrice > 0 ? String(currentUnitPrice) : ''));
  };
  const commitEdit = (itemId: string) => {
    const n = parseFloat(draft);
    if (Number.isFinite(n) && n > 0) {
      setCustomPrice(customKey(itemId), n);
    } else {
      // Empty / zero → remove the override so the API price comes back
      // (setting 0 would have been interpreted as 'force cost to 0').
      removeCustomPrice(customKey(itemId));
    }
    setEditingId(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Crafting Cost</h3>
        <span className="text-xs text-zinc-500">
          Return Rate: {(result.returnRate * 100).toFixed(1)}%
        </span>
      </div>

      <div className="space-y-2">
        {result.materials.map((mat) => {
          const cheapest = cheapestCities.get(mat.materialId);
          const override = getOverride(mat.materialId);
          const hasOverride = override != null && override > 0;
          const isEditing = editingId === mat.materialId;
          return (
            <div
              key={mat.materialId}
              className={`flex items-center justify-between bg-surface-light rounded-lg px-3 py-2 ${hasOverride ? 'ring-1 ring-gold/40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <ItemIcon itemId={mat.materialId} size={32} />
                <div>
                  <div className="text-sm text-zinc-200">{mat.name}</div>
                  <div className="text-xs text-zinc-500">x{mat.count}</div>
                </div>
              </div>
              <div className="text-right">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(mat.materialId);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => commitEdit(mat.materialId)}
                      className="w-24 bg-zinc-900 border border-gold/40 rounded px-2 py-1 text-xs text-gold text-right focus:outline-none focus:ring-1 focus:ring-gold/60"
                      placeholder="price/unit"
                    />
                    <span className="text-[10px] text-zinc-500">ea</span>
                  </div>
                ) : mat.unitPrice > 0 ? (
                  <button
                    onClick={() => startEdit(mat.materialId, mat.unitPrice)}
                    className="text-right hover:bg-zinc-800/60 rounded px-2 py-0.5 -mr-2 group"
                    title="Click to set a custom price for this material"
                  >
                    <div className={`text-sm ${hasOverride ? 'text-gold' : 'text-zinc-200'}`}>
                      {formatSilver(mat.totalPrice)}
                    </div>
                    <div className={`text-xs ${hasOverride ? 'text-gold/80' : 'text-zinc-500'}`}>
                      {formatSilver(mat.unitPrice)} ea
                      {hasOverride && <span className="ml-1 text-[9px]">✎ custom</span>}
                      {!hasOverride && <span className="ml-1 text-[9px] opacity-0 group-hover:opacity-60">✎</span>}
                    </div>
                    {!hasOverride && cheapest && cheapest.price < mat.unitPrice && (
                      <div className="text-[11px] text-green-400">
                        {cheapest.city}: {formatSilver(cheapest.price)}
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(mat.materialId, 0)}
                    className="text-right hover:bg-zinc-800/60 rounded px-2 py-0.5 -mr-2"
                    title="Click to set a custom price for this material"
                  >
                    <div className="text-sm text-yellow-500">No data</div>
                    <div className="text-[10px] text-zinc-500">✎ click to set</div>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {result.artifactCost && (() => {
          const artId = result.artifactCost.id;
          const override = getOverride(artId);
          const hasOverride = override != null && override > 0;
          const isEditing = editingId === artId;
          const unitPrice = result.artifactCost.price; // artifacts store total in .price, count = 1 per craft
          return (
            <div className={`flex items-center justify-between bg-surface-light rounded-lg px-3 py-2 ${hasOverride ? 'ring-1 ring-gold/40' : ''}`}>
              <div className="flex items-center gap-3">
                <ItemIcon itemId={artId} size={32} />
                <div>
                  <div className="text-sm text-purple-300">Artifact</div>
                </div>
              </div>
              <div className="text-right">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={0} step={1} autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(artId);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => commitEdit(artId)}
                      className="w-24 bg-zinc-900 border border-gold/40 rounded px-2 py-1 text-xs text-gold text-right focus:outline-none"
                    />
                  </div>
                ) : unitPrice > 0 ? (
                  <button onClick={() => startEdit(artId, unitPrice)} className="hover:bg-zinc-800/60 rounded px-2 py-0.5 -mr-2">
                    <div className={`text-sm ${hasOverride ? 'text-gold' : 'text-purple-300'}`}>{formatSilver(unitPrice)}</div>
                    {hasOverride && <div className="text-[9px] text-gold/80">✎ custom</div>}
                    {!hasOverride && cheapestCities.get(artId) && cheapestCities.get(artId)!.price < unitPrice && (
                      <div className="text-[11px] text-green-400">
                        {cheapestCities.get(artId)!.city}: {formatSilver(cheapestCities.get(artId)!.price)}
                      </div>
                    )}
                  </button>
                ) : (
                  <button onClick={() => startEdit(artId, 0)} className="text-sm text-yellow-500 hover:bg-zinc-800/60 rounded px-2">No data — ✎ set</button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mt-3 pt-3 border-t border-surface-lighter flex justify-between">
        <span className="text-sm text-zinc-400">Total Material Cost</span>
        <span className="text-sm text-zinc-200 font-medium">{formatSilver(result.totalMaterialCost)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-sm text-zinc-400">After Return ({(result.returnRate * 100).toFixed(1)}%)</span>
        <span className="text-sm text-gold font-medium">{formatSilver(result.effectiveMaterialCost)}</span>
      </div>

      {/* Hint about custom prices */}
      <div className="mt-2 text-[10px] text-zinc-600 italic">
        ✎ Click any price to enter your own (e.g. your buy order fill). Custom prices persist and are highlighted in gold.
      </div>
    </div>
  );
}
