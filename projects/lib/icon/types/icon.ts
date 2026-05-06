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
 * const myIcon: WrIcon = {
 *   name: 'my-custom-logo',
 *   data: '<svg viewBox="0 0 24 24">...</svg>',
 * };
 *
 * provideWrIcons([myIcon]);
 * ```
 */
export type WrIcon = {
  name: WrIconName;
  data: string;
};
