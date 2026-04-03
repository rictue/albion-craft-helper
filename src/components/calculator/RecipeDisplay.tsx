import { useMemo } from 'react';
import type { CraftingResult } from '../../utils/profitCalculator';
import type { MarketPrice } from '../../types';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';

interface Props {
  result: CraftingResult;
  prices: MarketPrice[];
}

export default function RecipeDisplay({ result, prices }: Props) {
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

    // Also for artifact
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
          return (
            <div
              key={mat.materialId}
              className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <ItemIcon itemId={mat.materialId} size={32} />
                <div>
                  <div className="text-sm text-zinc-200">{mat.name}</div>
                  <div className="text-xs text-zinc-500">x{mat.count}</div>
                </div>
              </div>
              <div className="text-right">
                {mat.unitPrice > 0 ? (
                  <>
                    <div className="text-sm text-zinc-200">{formatSilver(mat.totalPrice)}</div>
                    <div className="text-xs text-zinc-500">{formatSilver(mat.unitPrice)} ea</div>
                    {cheapest && cheapest.price < mat.unitPrice && (
                      <div className="text-[11px] text-green-400">
                        {cheapest.city}: {formatSilver(cheapest.price)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-yellow-500">No data</div>
                )}
              </div>
            </div>
          );
        })}

        {result.artifactCost && (
          <div className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2">
            <div className="flex items-center gap-3">
              <ItemIcon itemId={result.artifactCost.id} size={32} />
              <div>
                <div className="text-sm text-purple-300">Artifact</div>
              </div>
            </div>
            <div className="text-right">
              {result.artifactCost.price > 0 ? (
                <>
                  <div className="text-sm text-purple-300">{formatSilver(result.artifactCost.price)}</div>
                  {(() => {
                    const cheapest = cheapestCities.get(result.artifactCost!.id);
                    return cheapest && cheapest.price < result.artifactCost!.price ? (
                      <div className="text-[11px] text-green-400">
                        {cheapest.city}: {formatSilver(cheapest.price)}
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <div className="text-sm text-yellow-500">No data</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-surface-lighter flex justify-between">
        <span className="text-sm text-zinc-400">Total Material Cost</span>
        <span className="text-sm text-zinc-200 font-medium">{formatSilver(result.totalMaterialCost)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-sm text-zinc-400">After Return ({(result.returnRate * 100).toFixed(1)}%)</span>
        <span className="text-sm text-gold font-medium">{formatSilver(result.effectiveMaterialCost)}</span>
      </div>
    </div>
  );
}
