export function formatSilver(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(amount) >= 1_000) {
    return amount.toLocaleString('en-US');
  }
  return amount.toFixed(0);
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

export function formatPriceCompact(price: number): string {
  if (price === 0) return 'N/A';
  return formatSilver(price);
}
