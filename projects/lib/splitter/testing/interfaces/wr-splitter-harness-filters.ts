/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/**
 * An arrow key, by the direction a user would say out loud — the parameter type
 * of `WrSplitterHarness.pressArrow`, exported so a consumer's own test helper can
 * name what it forwards. Arrows follow the VISUAL axis, so `left` shrinks the
 * position in LTR and grows it in RTL.
 */
export type WrSplitterArrowKey = 'left' | 'right' | 'up' | 'down';

/** Narrows which `<wr-splitter>` a harness query matches. */
export interface WrSplitterHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the splitter's own axis — `horizontal` for panes side by side. Note that
   * this is the COMPONENT's word, which is the opposite of what the divider
   * announces; see `WrSplitterHarness.getOrientation`.
   */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Match the divider's accessible name, an exact string or a RegExp. */
  readonly dividerLabel?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) splitters. */
  readonly disabled?: boolean;
}

/** The share of the splitter each pane is asking for, in percent. */
export interface WrSplitterPaneSizes {
  /** The start pane's `flex-basis` — the same number as the divider's position. */
  readonly start: number;
  /** The end pane's `flex-basis` — the remainder. */
  readonly end: number;
}
