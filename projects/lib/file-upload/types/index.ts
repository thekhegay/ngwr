/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Why a dropped / picked file was rejected. */
export type WrFileUploadRejectionReason = 'type' | 'size' | 'count';

/** A single rejected file + the reason. Emitted via `(rejected)`. */
export interface WrFileUploadRejection {
  readonly file: File;
  readonly reason: WrFileUploadRejectionReason;
}
