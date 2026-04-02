export function formatSilver(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return sign + (abs / 1_000_000).toFixed(2) + 'M';
  }
  if (abs >= 1_000) {
    return sign + Math.round(abs).toLocaleString('en-US');
  }
  return sign + Math.round(abs).toString();
}

export function formatPercent(value: number): string {
  // Cap at reasonable range for display
  if (Math.abs(value) > 999) {
    return (value > 0 ? '+' : '-') + '999%';
  }
  return value.toFixed(1) + '%';
}

export function formatPriceCompact(price: number): string {
  if (price === 0) return 'N/A';
  return formatSilver(price);
}
