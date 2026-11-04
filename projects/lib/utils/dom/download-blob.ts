/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Safari starts the download after `click()` returns, so a revoke in the same
 * tick hands it a dead URL. One second covers the gap with room to spare.
 */
const REVOKE_DELAY_MS = 1000;

/**
 * Saves `blob` as a file named `fileName`, through a temporary anchor and an
 * object URL.
 *
 * SSR-safe: a no-op without a `document`. The anchor is appended for the
 * click, which Firefox needs, and removed right after. The object URL is
 * revoked on a timer rather than synchronously, which Safari needs.
 *
 * @example
 * ```ts
 * const csv = new Blob([text], { type: 'text/csv;charset=utf-8;' });
 * wrDownloadBlob(csv, 'report.csv');
 * ```
 *
 * @param blob - The data to save.
 * @param fileName - The name the browser offers in its save dialog.
 */
export function wrDownloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
