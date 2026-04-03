// Centralized outlier filtering for prices
// Removes prices > multiplier × median (default 5x)

export function filterOutliers<T>(
  items: T[],
  getPrice: (item: T) => number,
  multiplier: number = 5,
): T[] {
  if (items.length < 2) return items;
  const sorted = [...items].sort((a, b) => getPrice(a) - getPrice(b));
  const median = getPrice(sorted[Math.floor(sorted.length / 2)]);
  return items.filter(item => getPrice(item) <= median * multiplier);
}
