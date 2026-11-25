import type { WrCollapseHeadingLevel } from './types';

/** @internal */
export function wrCollapseHeadingLevel(value: unknown): WrCollapseHeadingLevel | null {
  const level = value === null || value === undefined || value === '' ? NaN : Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 6 ? (level as WrCollapseHeadingLevel) : null;
}
