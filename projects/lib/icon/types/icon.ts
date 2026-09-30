/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconName } from './icon-name';

/**
 * Shape of an icon registered with the icon registry.
 *
 * The library ships a set of built-in icons, but consumers can also
 * provide their own custom icons with the same shape.
 *
 * @example
 * ```ts
 * const myIcon: WrIconDef = {
 *   name: 'my-custom-logo',
 *   data: '<svg viewBox="0 0 24 24">...</svg>',
 * };
 *
 * provideWrIcons([myIcon]);
 * ```
 */
export interface WrIconDef {
  name: WrIconName;
  /**
   * The icon's SVG markup, treated as **untrusted**: `<wr-icon>` rebuilds the
   * first `<svg>` root from an allowlist of shape, paint and text elements
   * rather than assigning the string to `innerHTML`, so event handlers,
   * `<script>`, `<style>`, `<image>`, `<foreignObject>`, `<a>`, SMIL animation
   * and non-fragment `href`s never reach the DOM. Registering a runtime-fetched
   * or tenant-supplied icon set is therefore safe; dev mode warns whenever
   * anything is dropped.
   */
  data: string;
}
