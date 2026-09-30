/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-lightbox>` a harness query matches. */
export interface WrLightboxHarnessFilters extends BaseHarnessFilters {
  /** Match the image's alt text — a string is an exact match, a RegExp is tested. */
  readonly alt?: string | RegExp;
  /** Match the caption shown under the full image. */
  readonly caption?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) lightboxes. */
  readonly open?: boolean;
}
