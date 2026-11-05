/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-comment-composer>` a harness query matches. */
export interface WrCommentComposerHarnessFilters extends BaseHarnessFilters {
  /** Match the current draft - a string is an exact match, a RegExp is tested. */
  readonly value?: string | RegExp;
  /** Match the field's placeholder - a string is an exact match, a RegExp is tested. */
  readonly placeholder?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) composers. */
  readonly disabled?: boolean;
}
