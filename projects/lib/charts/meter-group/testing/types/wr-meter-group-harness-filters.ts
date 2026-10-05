/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-meter-group>` a harness query matches. */
export interface WrMeterGroupHarnessFilters extends BaseHarnessFilters {
  /** Match the bar's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a group whose legend holds this label. */
  readonly sliceLabel?: string | RegExp;
}

/** One band of the bar, as it is drawn and titled. */
export interface WrMeterGroupSlice {
  /** The band's `title` — its only text, since the bar itself is one `progressbar`. */
  readonly label: string | null;
  /** The share of the bar it takes, in percent. */
  readonly percent: number;
}
