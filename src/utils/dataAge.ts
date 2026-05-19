/**
 * Age helpers for AODP market records.
 *
 * The Albion Online Data Project API returns dates in the shape
 * `"2026-04-11T12:34:56"` — that is, an ISO timestamp with NO `Z` suffix and
 * no explicit timezone offset. JavaScript's `new Date(str)` then parses the
 * string as LOCAL time, which silently adds the user's timezone offset to
 * any age calculation done against it. A Turkish player (UTC+3) who scans
 * a listing will see it age by 3 hours immediately after the scan.
 *
 * Every call site that needs to know "how old is this market record" should
 * go through `ageHoursOf` (or `ageHours`) in this file — do NOT call
 * `new Date(...).getTime()` directly on AODP dates.
 */

/** True if the string already carries an explicit timezone token. */
function hasExplicitTimezone(s: string): boolean {
  return /[zZ]$|[+-]\d\d:?\d\d$/.test(s);
}

/**
 * Parse an AODP date, forcing UTC interpretation when no timezone is given,
 * and return its `Date.getTime()` in milliseconds since the Unix epoch.
 * Returns 0 when the input is unparseable.
 */
export function parseAodpDate(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const normalized = hasExplicitTimezone(dateStr) ? dateStr : dateStr + 'Z';
  const t = new Date(normalized).getTime();
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * Age of an AODP market record in hours. Returns `Infinity` when the record
 * has no usable timestamp.
 */
export function ageHoursOf(dateStr: string | undefined | null): number {
  const t = parseAodpDate(dateStr);
  if (t === 0) return Infinity;
  const h = (Date.now() - t) / 3_600_000;
  return h < 0 ? 0 : h;
}

/**
 * Format an age-in-hours value for display. Uses minutes for anything under
 * an hour (up to "59m"), decimal hours up to a day, and days beyond that.
 * Returns a dash placeholder when the age is unknown / infinite.
 */
export function formatAge(h: number): string {
  if (!Number.isFinite(h)) return '—';
  if (h <= 0) return 'now';
  if (h < 1 / 60) return 'now';
  if (h < 1) {
    const m = Math.max(1, Math.round(h * 60));
    return `${m}m`;
  }
  if (h < 24) {
    // <10h we show one decimal (e.g. 1.2h, 9.8h) so the jump from "59m" →
    // "1.0h" is visible; past 10h we round to the nearest hour for compactness.
    return h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`;
  }
  return `${Math.round(h / 24)}d`;
}

/**
 * Verbose age label used in tooltips — always exact ("3h 42m", "1d 5h").
 * The compact `formatAge` is for inline space-constrained UI; this one
 * is for hover/title attributes where precision helps.
 */
export function formatAgeVerbose(h: number): string {
  if (!Number.isFinite(h)) return 'unknown';
  if (h <= 0) return 'just now';
  if (h < 1 / 60) return 'just now';
  if (h < 1) {
    const m = Math.max(1, Math.round(h * 60));
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (h < 24) {
    const fullHours = Math.floor(h);
    const minutes = Math.round((h - fullHours) * 60);
    if (minutes === 0) return `${fullHours}h ago`;
    if (minutes === 60) return `${fullHours + 1}h ago`;
    return `${fullHours}h ${minutes}m ago`;
  }
  const days = Math.floor(h / 24);
  const remHours = Math.round(h - days * 24);
  if (remHours === 0) return `${days}d ago`;
  if (remHours === 24) return `${days + 1}d ago`;
  return `${days}d ${remHours}h ago`;
}

/**
 * Tier label for confidence in an AODP record, combining staleness AND
 * any signal the caller passes about listing depth / outlier status.
 * Used to summarize "should I trust this price?" in tooltips.
 */
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export function confidenceFromAge(h: number, isOutlier = false): Confidence {
  if (!Number.isFinite(h)) return 'unknown';
  if (isOutlier) return 'low';
  if (h < 1) return 'high';
  if (h < 6) return 'medium';
  return 'low';
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'High confidence — fresh AODP signal',
  medium: 'Medium confidence — a few hours old',
  low: 'Low confidence — stale or outlier listing',
  unknown: 'Unknown — no AODP timestamp',
};

export function describeConfidence(c: Confidence): string {
  return CONFIDENCE_LABELS[c];
}

/**
 * Tailwind classname for age-colour: emerald < 1h, yellow < 3h, orange < 8h,
 * red otherwise. Returns zinc-600 when the age is unknown.
 */
export function ageColor(h: number): string {
  if (!Number.isFinite(h)) return 'text-zinc-600';
  if (h < 1)  return 'text-emerald-400';
  if (h < 3)  return 'text-yellow-400';
  if (h < 8)  return 'text-orange-500';
  return 'text-red-500';
}
