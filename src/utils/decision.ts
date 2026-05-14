/**
 * Decision tier for a calculator result — used by all calcs to give the
 * player a one-glance verdict on whether a flip/craft is worth doing.
 *
 *   Strong   — clearly profitable, do it
 *   Playable — small but real margin, OK if you have nothing better
 *   Thin     — marginally above break-even, sensitive to price moves
 *   Loss     — below break-even, don't do it
 */

export type DecisionLevel = 'Strong' | 'Playable' | 'Thin' | 'Loss';

export interface DecisionThresholds {
  /** Above this value → Strong */
  strong: number;
  /** Above this value → Playable */
  playable: number;
  /** Above this value → Thin (below → Loss) */
  thin: number;
}

/** Threshold preset for a per-unit silver profit (refining, transmute). */
export const SILVER_PER_UNIT_THRESHOLDS: DecisionThresholds = {
  strong:   5000,
  playable: 1000,
  thin:     0,
};

/** Threshold preset for percent margin (crafting calculator). */
export const MARGIN_PCT_THRESHOLDS: DecisionThresholds = {
  strong:   15,
  playable: 5,
  thin:     0,
};

/** Threshold preset for per-meal silver profit (cooking). */
export const PER_MEAL_THRESHOLDS: DecisionThresholds = {
  strong:   2500,
  playable: 500,
  thin:     0,
};

export function getDecision(value: number, thresholds: DecisionThresholds): DecisionLevel {
  if (!Number.isFinite(value)) return 'Loss';
  if (value > thresholds.strong)   return 'Strong';
  if (value >= thresholds.playable) return 'Playable';
  if (value >= thresholds.thin)     return 'Thin';
  return 'Loss';
}
