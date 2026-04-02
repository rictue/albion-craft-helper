import type { CraftingResult } from '../../utils/profitCalculator';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

interface Props {
  result: CraftingResult;
}

export default function RecipeDisplay({ result }: Props) {
  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider">Crafting Cost</h3>
        <span className="text-xs text-slate-500">
          Return Rate: {(result.returnRate * 100).toFixed(1)}%
        </span>
      </div>

      <div className="space-y-2">
        {result.materials.map((mat) => (
          <div
            key={mat.materialId}
            className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <ItemIcon itemId={mat.materialId} size={32} />
              <div>
                <div className="text-sm text-slate-200">{mat.name}</div>
                <div className="text-xs text-slate-500">x{mat.count}</div>
              </div>
            </div>
            <div className="text-right">
              {mat.unitPrice > 0 ? (
                <>
                  <div className="text-sm text-slate-200">{formatSilver(mat.totalPrice)}</div>
                  <div className="text-xs text-slate-500">{formatSilver(mat.unitPrice)} ea</div>
                </>
              ) : (
                <div className="text-sm text-yellow-500">No data</div>
              )}
            </div>
          </div>
        ))}

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
                <div className="text-sm text-purple-300">{formatSilver(result.artifactCost.price)}</div>
              ) : (
                <div className="text-sm text-yellow-500">No data</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-surface-lighter flex justify-between">
        <span className="text-sm text-slate-400">Total Material Cost</span>
        <span className="text-sm text-slate-200 font-medium">{formatSilver(result.totalMaterialCost)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-sm text-slate-400">After Return ({(result.returnRate * 100).toFixed(1)}%)</span>
        <span className="text-sm text-gold font-medium">{formatSilver(result.effectiveMaterialCost)}</span>
      </div>
    </div>
  );
}
