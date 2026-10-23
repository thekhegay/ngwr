/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Shape of a `lucide` icon export — an array of `[tag, attrs]` tuples
 * representing the inner SVG children. The outer `<svg>` wrapper is
 * added by {@link lucide} when converting to a {@link WrIconDef}.
 */
export type LucideIconNode = readonly (readonly [string, Record<string, string | number | undefined>])[];
