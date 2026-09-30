/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrTransferSide } from './wr-transfer-side';

/** Narrows which `<wr-transfer>` a harness query matches. */
export interface WrTransferHarnessFilters extends BaseHarnessFilters {
  /** Match the LEFT pane's heading. A string is an exact match, a RegExp is tested. */
  readonly sourceTitle?: string | RegExp;
  /** Match the RIGHT pane's heading. A string is an exact match, a RegExp is tested. */
  readonly targetTitle?: string | RegExp;
  /**
   * Match a transfer SHOWING a row with this label, in either pane — the readable
   * way to tell two transfers apart, since both headings fall back to the same
   * built-in strings when a template sets neither. A row a pane's filter has hidden
   * is not rendered and does not count.
   */
  readonly itemLabel?: string | RegExp;
  /** Match only transfers with a filter box above each pane (`true`) or without (`false`). */
  readonly searchable?: boolean;
  /** Match only disabled (`true`) or only enabled (`false`) transfers. */
  readonly disabled?: boolean;
}

/** Narrows which pane of a transfer a harness query matches. */
export interface WrTransferPaneHarnessFilters extends BaseHarnessFilters {
  /** Match one side — what `WrTransferHarness.getPane()` narrows by. */
  readonly side?: WrTransferSide;
  /** Match the pane's heading. A string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
}

/** Narrows which row inside a pane a harness query matches. */
export interface WrTransferItemHarnessFilters extends BaseHarnessFilters {
  /** Match the row's label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /**
   * Match only staged (`true`) or only unstaged (`false`) rows. Staged is the
   * transient tick a move spends — NOT membership of the value, which is the pane
   * the row sits in.
   */
  readonly checked?: boolean;
  /**
   * Match only rows that refuse staging (`true`) or only rows that accept it
   * (`false`). Every row of a disabled TRANSFER refuses it, so `false` matches
   * nothing there.
   */
  readonly disabled?: boolean;
}
