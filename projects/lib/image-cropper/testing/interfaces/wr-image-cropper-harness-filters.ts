/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-image-cropper>` a harness query matches. */
export interface WrImageCropperHarnessFilters extends BaseHarnessFilters {
  /**
   * Match croppers holding an image (`false`) or showing the empty state (`true`).
   * A cropper with a `src` it has not measured yet is NOT empty — see
   * `WrImageCropperHarness.isReady`.
   */
  readonly empty?: boolean;
}
