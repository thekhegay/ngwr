import { coerceNumberProperty } from '@angular/cdk/coercion';

/**
 * Input-transform factory: coerces any bound value to a number, falling
 * back to `fallback` for `null` / `undefined` / unparsable input. The
 * standard transform for numeric `input()`s across ngwr.
 *
 * @example
 * ```ts
 * readonly speed = input(4, { transform: numAttr(4) });
 * ```
 */
export const numAttr =
  (fallback: number) =>
  (value: unknown): number =>
    coerceNumberProperty(value, fallback);
