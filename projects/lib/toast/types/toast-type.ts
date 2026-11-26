/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * `loading` draws a spinner and never closes on its own: update the toast to
 * another type, or dismiss it.
 */
export type WrToastType = 'info' | 'success' | 'warning' | 'danger' | 'loading';
