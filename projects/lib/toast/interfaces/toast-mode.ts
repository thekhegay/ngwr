/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * How the host arranges multiple toasts.
 *
 * - `stack` — Sonner-style: toasts cascade behind the newest one when the
 *   pointer is outside the host; on hover the stack fans out into a list.
 * - `list` — classic vertical column, no overlap, no hover transition.
 */
export type WrToastMode = 'stack' | 'list';
