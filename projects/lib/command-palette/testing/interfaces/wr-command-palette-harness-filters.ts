/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-command-palette>` a harness query matches. */
export interface WrCommandPaletteHarnessFilters extends BaseHarnessFilters {
  /** Match only open (`true`) or only closed (`false`) palettes. */
  readonly open?: boolean;
  /**
   * Match the palette's accessible name — `paletteLabel`, or the
   * `commandPalette.label` catalogue string it falls back to. A string is an
   * exact match, a RegExp is tested.
   *
   * A CLOSED palette has no name to match: the dialog carrying it is inside an
   * `@if (open())`, so this filter never selects one.
   */
  readonly label?: string | RegExp;
}

/** Narrows which group inside an open palette a harness query matches. */
export interface WrCommandPaletteGroupHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the group's title — a string is an exact match, a RegExp is tested.
   *
   * The bucket holding items with no `group` has no title, so it is never a
   * match for this filter.
   */
  readonly title?: string | RegExp;
}

/** Narrows which item inside an open palette a harness query matches. */
export interface WrCommandPaletteItemHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the item's label — a string is an exact match, a RegExp is tested. The
   * description, the shortcut hint and the icon are not part of it.
   */
  readonly text?: string | RegExp;
  /** Match only the highlighted item (`true`) or only the rest (`false`). */
  readonly active?: boolean;
}
