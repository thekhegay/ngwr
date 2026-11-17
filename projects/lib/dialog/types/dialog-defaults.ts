/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDialogOptions } from './dialog-options';

/**
 * App-wide dialog defaults, passed to `provideWr(withDialog(...))`. `size`
 * applies to `open()` only: `confirm()` and `alert()` stay as wide as their text.
 */
export type WrDialogDefaults = Pick<WrDialogOptions, 'tabTitle' | 'autoFocus' | 'size'>;
