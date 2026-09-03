/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconDef } from './interfaces';

/**
 * Wrap a raw SVG string in the {@link WrIconDef} envelope. Use this when
 * importing icons from sources that ship full `<svg>` files — Tabler,
 * Phosphor, Heroicons, Iconoir, Radix, Bootstrap Icons, your designer.
 *
 * Pair with a bundler's raw-SVG import (Vite's `?raw`, Webpack's
 * `raw-loader`, esbuild's `--loader:.svg=text`) so the SVG file becomes
 * a string at build time.
 *
 * For sets with a non-SVG shape (Lucide's IconNode tuples, Feather's
 * inner-only SVG), use the dedicated adapter under
 * `ngwr/icon/adapters/<set>` instead.
 *
 * @example
 * ```ts
 * import { svgIcon, provideWrIcons } from 'ngwr/icon';
 * // Vite: the `?raw` suffix returns the file as a string.
 * import plusSvg from '@tabler/icons/icons/plus.svg?raw';
 * import phosphorPlusSvg from '@phosphor-icons/core/assets/regular/plus.svg?raw';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrIcons([
 *       svgIcon('plus', plusSvg),
 *       svgIcon('plus-phosphor', phosphorPlusSvg),
 *     ]),
 *   ],
 * });
 * ```
 *
 * **`svg` is treated as untrusted.** It is a string, so it is a natural place
 * for a tenant's uploaded logo or an icon pack fetched from an API to end up,
 * and `<wr-icon>` used to write it to `innerHTML`. It no longer does: the glyph
 * is rebuilt from an allowlist of SVG shape, paint and text elements, so
 * `<script>`, `<style>`, `<image>`, `<foreignObject>`, `<a>`, SMIL animation,
 * every `on*` handler, `style` attributes and non-fragment `href`s are dropped
 * before anything reaches the DOM. In dev mode the component names what it
 * removed, so a legitimate icon that loses something says so out loud.
 */
export function svgIcon(name: string, svg: string): WrIconDef {
  return { name, data: svg };
}
