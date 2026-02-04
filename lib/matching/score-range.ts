export const SCORE_TICK = 0.1;
export const SCORE_TICK_FACTOR = 10;
export const MIN_SCORE_TICKS = 0;
export const MAX_SCORE_TICKS = 100 * SCORE_TICK_FACTOR;
export const DEFAULT_RANGE_EXPANSION_STEP_TICKS = 3;

export type ScoreRange = { min: number; max: number };

export function toTicks(score: number): number {
  return Math.round(score * SCORE_TICK_FACTOR);
}

export function fromTicks(ticks: number): number {
  return ticks / SCORE_TICK_FACTOR;
}

export function clampTicks(ticks: number): number {
  return Math.max(MIN_SCORE_TICKS, Math.min(MAX_SCORE_TICKS, ticks));
}

export function clampScoreToTick(score: number): number {
  return fromTicks(clampTicks(toTicks(score)));
}

export function rangeFromDiffTicks(
  userScore: number,
  minDiffTicks: number,
  maxDiffTicks: number
): ScoreRange {
  const base = toTicks(userScore);
  const min = clampTicks(base + minDiffTicks);
  const max = clampTicks(base + maxDiffTicks);
  return { min: fromTicks(min), max: fromTicks(max) };
}

export function rangeFromRatio(
  userScore: number,
  minRatio: number,
  maxRatio: number
): ScoreRange {
  const base = toTicks(userScore);
  const min = clampTicks(Math.round(base * minRatio));
  const max = clampTicks(Math.round(base * maxRatio));
  return { min: fromTicks(min), max: fromTicks(max) };
}

export function expandRange(
  range: ScoreRange,
  stepTicks: number,
  direction: "both" | "down" = "both"
): ScoreRange {
  const minTicks = toTicks(range.min);
  const maxTicks = toTicks(range.max);
  const nextMin = minTicks - stepTicks;
  const nextMax = direction === "down" ? maxTicks : maxTicks + stepTicks;
  return {
    min: fromTicks(clampTicks(nextMin)),
    max: fromTicks(clampTicks(nextMax)),
  };
}
