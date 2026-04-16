import { useState } from 'react';
import { getItemIconUrl } from '../../utils/itemIdParser';

interface Props {
  itemId: string;
  size?: number;
  quality?: number;
  className?: string;
}

// Albion render API only supports 64, 128, 256
function getApiSize(displaySize: number): number {
  if (displaySize <= 64) return 64;
  if (displaySize <= 128) return 128;
  return 256;
}

// Render API is inconsistent: some items render fine with their full id,
// some need variants. Try each fallback in order until one succeeds.
//
//  1. swap 2H_ <-> MAIN_  (API has these keyed inconsistently)
//  2. strip the @N enchant suffix (artifact weapons sometimes only exist
//     as the base-enchant render)
//  3. do both at once
function getFallbackIds(itemId: string): string[] {
  const fallbacks: string[] = [];

  const swapVariant = (id: string): string | null => {
    if (id.match(/^T\d+_2H_/)) return id.replace(/^(T\d+_)2H_/, '$1MAIN_');
    if (id.match(/^T\d+_MAIN_/)) return id.replace(/^(T\d+_)MAIN_/, '$12H_');
    return null;
  };

  const variant = swapVariant(itemId);
  if (variant) fallbacks.push(variant);

  const withoutEnchant = itemId.replace(/@\d+$/, '');
  if (withoutEnchant !== itemId) {
    fallbacks.push(withoutEnchant);
    const variantNoEnchant = swapVariant(withoutEnchant);
    if (variantNoEnchant) fallbacks.push(variantNoEnchant);
  }

  return fallbacks;
}

export default function ItemIcon({ itemId, size = 64, quality = 1, className = '' }: Props) {
  const [currentId, setCurrentId] = useState(itemId);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [error, setError] = useState(false);
  // Track the itemId we were rendered with so we can reset fallback state
  // when the parent swaps the item. React's official "reset state on prop
  // change" pattern — adjust state during render instead of inside an
  // effect so we avoid the double-render and the set-state-in-effect lint.
  const [prevItemId, setPrevItemId] = useState(itemId);
  if (prevItemId !== itemId) {
    setPrevItemId(itemId);
    setCurrentId(itemId);
    setFallbackIndex(0);
    setError(false);
  }
  const apiSize = getApiSize(size);
  const url = getItemIconUrl(currentId, quality, apiSize);

  const handleError = () => {
    const fallbacks = getFallbackIds(itemId);
    if (fallbackIndex < fallbacks.length) {
      setCurrentId(fallbacks[fallbackIndex]);
      setFallbackIndex(fallbackIndex + 1);
      return;
    }
    setError(true);
  };

  if (error) {
    return (
      <div
        className={`bg-surface-lighter rounded flex items-center justify-center text-zinc-600 text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      style={{ width: size, height: size }}
      className={`rounded ${className}`}
      onError={handleError}
      loading="lazy"
    />
  );
}
