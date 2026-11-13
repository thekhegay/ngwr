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

/** Size of a `<wr-file-upload>`. */
export type WrFileUploadSize = 'sm' | 'md' | 'lg';

/** Where the app's own upload of one file stands. */
export type WrFileUploadState = 'pending' | 'uploading' | 'done' | 'error';

/**
 * The state of one file, set by the app through `[status]`. The component never
 * uploads: it draws what it is told.
 */
export interface WrFileUploadStatus {
  readonly state: WrFileUploadState;
  /** `uploading` only: how far it has got, 0 to 100. Left out, the bar is indeterminate. */
  readonly percent?: number | null;
  /** `error` only: what went wrong, in the app's words. Left out, the row says `fileUpload.failed`. */
  readonly message?: string | null;
}

/** Per-file upload state, keyed by the `File` objects in `value`. */
export type WrFileUploadStatusMap = ReadonlyMap<File, WrFileUploadStatus>;
