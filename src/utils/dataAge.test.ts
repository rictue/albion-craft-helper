import { describe, it, expect } from 'vitest';
import {
  parseAodpDate,
  ageHoursOf,
  formatAge,
  formatAgeVerbose,
  ageColor,
  confidenceFromAge,
} from './dataAge';

describe('parseAodpDate', () => {
  it('treats AODP dates without timezone as UTC', () => {
    // AODP returns "2026-04-11T12:00:00" without a Z. Should parse as UTC,
    // not local time. Compared against a UTC reference.
    const t = parseAodpDate('2026-04-11T12:00:00');
    expect(t).toBe(Date.UTC(2026, 3, 11, 12, 0, 0));
  });

  it('respects explicit Z suffix', () => {
    const t = parseAodpDate('2026-04-11T12:00:00Z');
    expect(t).toBe(Date.UTC(2026, 3, 11, 12, 0, 0));
  });

  it('respects explicit timezone offset', () => {
    const t = parseAodpDate('2026-04-11T12:00:00+03:00');
    // 12:00 in UTC+3 is 09:00 UTC.
    expect(t).toBe(Date.UTC(2026, 3, 11, 9, 0, 0));
  });

  it('returns 0 for missing or unparseable input', () => {
    expect(parseAodpDate(null)).toBe(0);
    expect(parseAodpDate(undefined)).toBe(0);
    expect(parseAodpDate('')).toBe(0);
    expect(parseAodpDate('garbage')).toBe(0);
  });
});

describe('ageHoursOf', () => {
  it('Infinity for missing dates', () => {
    expect(ageHoursOf(undefined)).toBe(Infinity);
    expect(ageHoursOf(null)).toBe(Infinity);
  });

  it('positive for past dates', () => {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    expect(ageHoursOf(oneHourAgo)).toBeGreaterThan(0.9);
    expect(ageHoursOf(oneHourAgo)).toBeLessThan(1.1);
  });

  it('clamps future dates to 0', () => {
    const inFiveMin = new Date(Date.now() + 5 * 60_000).toISOString();
    expect(ageHoursOf(inFiveMin)).toBe(0);
  });
});

describe('formatAge', () => {
  it('"now" for sub-minute ages', () => {
    expect(formatAge(0)).toBe('now');
    expect(formatAge(0.001)).toBe('now');
  });

  it('minutes under an hour', () => {
    expect(formatAge(0.5)).toBe('30m');
    expect(formatAge(0.95)).toBe('57m');
  });

  it('decimal hours under 10h', () => {
    expect(formatAge(1.2)).toBe('1.2h');
    expect(formatAge(9.5)).toBe('9.5h');
  });

  it('rounded hours 10-24', () => {
    expect(formatAge(12.4)).toBe('12h');
    expect(formatAge(23.9)).toBe('24h');
  });

  it('days beyond 24h', () => {
    expect(formatAge(48)).toBe('2d');
    expect(formatAge(72)).toBe('3d');
  });

  it('dash for unknown ages', () => {
    expect(formatAge(Infinity)).toBe('—');
  });
});

describe('formatAgeVerbose', () => {
  it('exact hours-and-minutes for sub-day ages', () => {
    expect(formatAgeVerbose(3.5)).toBe('3h 30m ago');
    expect(formatAgeVerbose(0.5)).toBe('30 minutes ago');
    expect(formatAgeVerbose(1)).toBe('1h ago');
  });

  it('days-and-hours for multi-day ages', () => {
    expect(formatAgeVerbose(48)).toBe('2d ago');
    expect(formatAgeVerbose(50)).toBe('2d 2h ago');
  });

  it('"just now" for fresh data', () => {
    expect(formatAgeVerbose(0)).toBe('just now');
    expect(formatAgeVerbose(0.005)).toBe('just now');
  });

  it('"unknown" for infinite age', () => {
    expect(formatAgeVerbose(Infinity)).toBe('unknown');
  });
});

describe('ageColor', () => {
  it('emerald under 1h', () => {
    expect(ageColor(0.5)).toBe('text-emerald-400');
  });
  it('yellow under 3h', () => {
    expect(ageColor(2)).toBe('text-yellow-400');
  });
  it('orange under 8h', () => {
    expect(ageColor(5)).toBe('text-orange-500');
  });
  it('red 8h+', () => {
    expect(ageColor(24)).toBe('text-red-500');
  });
  it('zinc for unknown', () => {
    expect(ageColor(Infinity)).toBe('text-zinc-600');
  });
});

describe('confidenceFromAge', () => {
  it('high <1h', () => expect(confidenceFromAge(0.3)).toBe('high'));
  it('medium <6h', () => expect(confidenceFromAge(3)).toBe('medium'));
  it('low otherwise', () => expect(confidenceFromAge(12)).toBe('low'));
  it('outlier flag forces low even when fresh', () => {
    expect(confidenceFromAge(0.1, true)).toBe('low');
  });
  it('unknown for infinite age', () => {
    expect(confidenceFromAge(Infinity)).toBe('unknown');
  });
});
