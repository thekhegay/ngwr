/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-file-upload>` a harness query matches. */
export interface WrFileUploadHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the drop zone's accessible name — a string is an exact match, a RegExp
   * is tested. That is `dropZoneLabel` when set, otherwise the field's label and
   * the zone's visible copy, as `WrFileUploadHarness.getLabel()` reads them.
   */
  readonly label?: string | RegExp;
  /** Match only single-file (`false`) or only multi-file (`true`) uploads. */
  readonly multiple?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) uploads. */
  readonly disabled?: boolean;
}
