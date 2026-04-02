import { useState, useEffect } from 'react';
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

// Render API is inconsistent: some items use 2H_, some use MAIN_
// Try the given ID first, then swap 2H_<->MAIN_ as fallback
function getAlternateId(itemId: string): string | null {
  if (itemId.match(/^T\d+_2H_/)) {
    return itemId.replace(/^(T\d+_)2H_/, '$1MAIN_');
  }
  if (itemId.match(/^T\d+_MAIN_/)) {
    return itemId.replace(/^(T\d+_)MAIN_/, '$12H_');
  }
  return null;
}

export default function ItemIcon({ itemId, size = 64, quality = 1, className = '' }: Props) {
  const [currentId, setCurrentId] = useState(itemId);
  const [triedAlt, setTriedAlt] = useState(false);
  const [error, setError] = useState(false);
  const apiSize = getApiSize(size);
  const url = getItemIconUrl(currentId, quality, apiSize);

  useEffect(() => {
    setCurrentId(itemId);
    setTriedAlt(false);
    setError(false);
  }, [itemId]);

  const handleError = () => {
    if (!triedAlt) {
      const alt = getAlternateId(currentId);
      if (alt) {
        setCurrentId(alt);
        setTriedAlt(true);
        return;
      }
    }
    setError(true);
  };

  if (error) {
    return (
      <div
        className={`bg-surface-lighter rounded flex items-center justify-center text-slate-600 text-xs ${className}`}
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
