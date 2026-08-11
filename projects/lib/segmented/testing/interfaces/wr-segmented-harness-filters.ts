/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrSegmentedSize } from 'ngwr/segmented';

/** Narrows which `<wr-segmented>` a harness query matches. */
export interface WrSegmentedHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the control's accessible name — a string is an exact match, a RegExp is
   * tested. The component ships no label input, so this is whatever the consumer
   * wired with `aria-label` / `aria-labelledby`, and it is the only thing that
   * tells two segmented controls on one page apart.
   */
  readonly label?: string | RegExp;
  /** Match only the rendered size — `'md'` matches a control carrying no size modifier. */
  readonly size?: WrSegmentedSize;
  /** Match only controls disabled as a whole (`true`) or the rest (`false`). */
  readonly disabled?: boolean;
}

/** Narrows which segment of a `<wr-segmented>` a harness query matches. */
export interface WrSegmentedOptionHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the segment's accessible name — its visible label, or the `aria-label`
   * standing in for an icon-only one. A string is an exact match, a RegExp is
   * tested; a segment with no name at all matches neither.
   *
   * There is deliberately no `value` filter: the option's `value` never reaches the
   * DOM — see `WrSegmentedHarness`.
   */
  readonly label?: string | RegExp;
  /** Match only the pressed segment (`true`) or only the others (`false`). */
  readonly selected?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) segments. */
  readonly disabled?: boolean;
}
