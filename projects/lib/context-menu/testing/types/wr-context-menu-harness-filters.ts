/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `[wrContextMenu]` target a harness query matches. */
export interface WrContextMenuHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the target's visible text — the content of whatever element the
   * consumer put `[wrContextMenu]` on, which is usually the thing being
   * right-clicked rather than a label. A string is an exact match, a RegExp is
   * tested.
   */
  readonly text?: string | RegExp;
  /** Match only targets whose menu is showing (`true`) or shut (`false`). */
  readonly open?: boolean;
}

/** Narrows which item inside a context menu a harness query matches. */
export interface WrContextMenuItemHarnessFilters extends BaseHarnessFilters {
  /** Match the item's label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) items. */
  readonly disabled?: boolean;
  /** Match only items that own a nested submenu (`true`), or only leaves (`false`). */
  readonly hasSubmenu?: boolean;
}
