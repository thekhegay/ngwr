/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-editor>` a harness query matches. */
export interface WrEditorHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the text surface's accessible name — its `ariaLabel`, the surrounding
   * `<wr-form-field>`'s label, or the catalog default, in that order. A string is an
   * exact match, a RegExp is tested.
   */
  readonly label?: string | RegExp;
  /**
   * Match the text the surface DRAWS — see `WrEditorHarness.getText`, which is where
   * the blocks are joined and the task-item words left out. A string is an exact
   * match, a RegExp is tested.
   */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) editors. */
  readonly disabled?: boolean;
  /** Match only writable (`false`) or only read-only (`true`) editors. */
  readonly readonly?: boolean;
}
