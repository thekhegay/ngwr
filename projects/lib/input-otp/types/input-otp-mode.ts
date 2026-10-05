/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Character set accepted by `<wr-input-otp>`:
 * - `numeric` — digits only (also sets `inputmode="numeric"` so mobile keyboards
 *   show the number pad)
 * - `alphanumeric` — letters + digits
 * - `text` — any single character per cell
 */
export type WrInputOtpMode = 'numeric' | 'alphanumeric' | 'text';
