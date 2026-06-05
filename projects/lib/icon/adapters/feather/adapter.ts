/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconDef } from 'ngwr/icon';

/**
 * Default SVG attributes Feather applies to every icon. Kept identical
 * to what `feather.replace()` emits in the browser so visual parity
 * with upstream is preserved.
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
  'class="wr-icon__svg feather"',
].join(' ');

/**
 * Wrap a single Feather icon (inner SVG markup) in a {@link WrIconDef}
 * envelope. Pair with the upstream `icons.json` map.
 *
 * @example
 * ```ts
 * import { feather } from 'ngwr/icon/adapters/feather';
 * // feather-icons ships an inner-SVG-only map under dist/icons.json:
 * //   { "plus": "<line .../><line .../>", "trash": "...", ... }
 * import featherIcons from 'feather-icons/dist/icons.json';
 *
 * provideWrIcons([feather('plus', featherIcons.plus)]);
 * ```
 */
function feather(name: string, innerSvg: string): WrIconDef {
  return { name, data: `<svg ${SVG_ATTRS}>${innerSvg}</svg>` };
}

/**
 * Bulk variant — pass a `{ alias: innerSvg }` object. Aliases (the
 * keys) become the registry names so you can use shorter or
 * project-specific names.
 *
 * @example
 * ```ts
 * import { featherIcons } from 'ngwr/icon/adapters/feather';
 * import featherSource from 'feather-icons/dist/icons.json';
 *
 * provideWrIcons(featherIcons({
 *   plus: featherSource.plus,
 *   trash: featherSource.trash,
 *   x: featherSource.x,
 * }));
 * ```
 */
function featherIcons(icons: Record<string, string>): WrIconDef[] {
  return Object.entries(icons).map(([name, innerSvg]) => feather(name, innerSvg));
}

export { feather, featherIcons };
