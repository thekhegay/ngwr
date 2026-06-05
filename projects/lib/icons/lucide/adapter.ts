/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconDef } from 'ngwr/icon';

/**
 * Shape of a `lucide` icon export — an array of `[tag, attrs]` tuples
 * representing the inner SVG children. The outer `<svg>` wrapper is added
 * by the adapter when converting to a {@link WrIconDef}.
 */
type LucideIconNode = readonly (readonly [string, Record<string, string | number | undefined>])[];

/**
 * Default SVG attributes Lucide applies to every icon. Kept identical to
 * the ones the `lucide` package's `createElement` would emit so visual
 * parity with upstream is preserved.
 */
const SVG_ATTRS = [
  'xmlns="http://www.w3.org/2000/svg"',
  'width="24"',
  'height="24"',
  'viewBox="0 0 24 24"',
  'fill="none"',
  'stroke="currentColor"',
  'stroke-width="2"',
  'stroke-linecap="round"',
  'stroke-linejoin="round"',
  'class="wr-icon__svg lucide"',
].join(' ');

/**
 * Wrap a Lucide IconNode in the {@link WrIconDef} envelope expected by
 * the ngwr icon registry. Used by the auto-generated per-icon exports
 * in `public-api.ts`, and re-exported for consumers who want to wrap a
 * one-off Lucide icon (e.g. from a custom build).
 *
 * @example
 * ```ts
 * import { lucide } from 'ngwr/icons/lucide';
 * import { Plus } from 'lucide';
 *
 * provideWrIcons([lucide('plus', Plus)]);
 * ```
 */
function lucide(name: string, children: LucideIconNode): WrIconDef {
  const inner = children.map(renderChild).join('');
  return { name, data: `<svg ${SVG_ATTRS}>${inner}</svg>` };
}

function renderChild([tag, attrs]: readonly [string, Record<string, string | number | undefined>]): string {
  const rendered = Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  return `<${tag} ${rendered}/>`;
}

export { lucide, type LucideIconNode };
