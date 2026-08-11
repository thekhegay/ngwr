/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-rating>` a harness query matches. */
export interface WrRatingHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the rating's accessible name — the readable way to tell two ratings on
   * one page apart, since a rating projects no text of its own. A string is an
   * exact match, a RegExp is tested.
   */
  readonly label?: string | RegExp;
  /**
   * Match the value the slider announces. A cleared rating announces `0`, so
   * `{ value: 0 }` matches both "zero stars" and "no rating yet".
   */
  readonly value?: number;
  /** Match only read-only (`true`) or only editable (`false`) ratings. */
  readonly readonly?: boolean;
  /** Match only disabled (`true`) or only enabled (`false`) ratings. */
  readonly disabled?: boolean;
}

/** Narrows which star a harness query matches. */
export interface WrRatingItemHarnessFilters extends BaseHarnessFilters {
  /** Match the star's fill ratio exactly — `1` for full, `0.5` for a half, `0` for empty. */
  readonly fill?: number;
  /** Match only stars that accept the pointer (`true`) — a readonly or disabled rating has none. */
  readonly interactive?: boolean;
}
